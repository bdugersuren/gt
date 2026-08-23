const { PrismaClient, Role } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
const bcrypt = require('bcryptjs');
const { Workbook } = require('exceljs');

const prisma = new PrismaClient();
const baseUrl = 'http://127.0.0.1:5000/api';

async function request(path, token, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      'x-active-role': 'MANAGER',
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.arrayBuffer();
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`);
  return { status: response.status, body };
}

async function main() {
  const marker = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  let studentId;
  let importedTeacherUsername;
  try {
    const manager = await prisma.user.findFirst({ where: { roles: { has: Role.MANAGER } } });
    const course = await prisma.course.findFirst();
    const classGroup = await prisma.classGroup.findFirst({ include: { department: true } });
    if (!manager || !course || !classGroup) throw new Error('Smoke test-д manager, course, classGroup шаардлагатай');
    const token = new JwtService({ secret: process.env.JWT_SECRET || 'development-only-secret-change-me' })
      .sign({ sub: manager.id, username: manager.username, roles: manager.roles });

    const template = await request('/users/import/templates/teachers', token);
    if (template.body.byteLength < 1000) throw new Error('Excel template хоосон байна');

    importedTeacherUsername = `smoke_teacher_${marker}`;
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Teachers');
    sheet.addRow(['username', 'email', 'fullName', 'code', 'phone', 'departmentCode', 'temporaryPassword']);
    sheet.addRow([importedTeacherUsername, `teacher_${marker}@example.mn`, 'Түр smoke багш', `T-SMK-${marker}`, '99000000', classGroup.department.code, `SmokePassword!${marker}`]);
    const xlsx = Buffer.from(await workbook.xlsx.writeBuffer());
    const previewForm = new FormData();
    previewForm.append('file', new Blob([xlsx]), 'teachers.xlsx');
    const preview = await request('/users/import/preview?type=TEACHER', token, { method: 'POST', body: previewForm });
    if (preview.body.validCount !== 1 || JSON.stringify(preview.body).includes(`SmokePassword!${marker}`)) throw new Error('Excel preview буруу эсвэл password ил байна');
    const commitForm = new FormData();
    commitForm.append('file', new Blob([xlsx]), 'teachers.xlsx');
    commitForm.append('fileChecksum', preview.body.fileChecksum);
    const commit = await request('/users/import/commit?type=TEACHER', token, { method: 'POST', body: commitForm });
    if (commit.body.importedCount !== 1 || JSON.stringify(commit.body).includes(`SmokePassword!${marker}`)) throw new Error('Excel commit амжилтгүй эсвэл password ил байна');

    const student = await prisma.user.create({
      data: {
        username: `smoke_student_${marker}`,
        email: `smoke_${marker}@example.mn`,
        fullName: 'Түр smoke суралцагч',
        code: `SMK-${marker}`,
        registerNumber: `АА12345678`,
        passwordHash: await bcrypt.hash(`SmokePassword!${marker}`, 10),
        roles: [Role.STUDENT],
        departmentId: classGroup.departmentId,
        classGroupId: classGroup.id,
      },
    });
    studentId = student.id;

    const candidates = await request(`/courses/${course.id}/enrollment-candidates?search=${encodeURIComponent(student.code)}`, token);
    if (!candidates.body.items.some((item) => item.id === student.id)) throw new Error('Шинэ суралцагч candidate жагсаалтад алга');

    const bulk = await request(`/courses/${course.id}/enrollments/bulk`, token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentIds: [student.id], startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString() }),
    });
    const enrollmentId = bulk.body.enrollmentIds[0];
    await request(`/courses/${course.id}/enrollments/status`, token, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enrollmentIds: [enrollmentId], status: 'FAILED', reason: 'Smoke test' }),
    });
    const roster = await request(`/courses/${course.id}/enrollments?status=FAILED&search=${encodeURIComponent(student.code)}`, token);
    if (roster.body.items[0]?.status !== 'FAILED') throw new Error('Roster status хадгалагдсангүй');

    process.stdout.write(JSON.stringify({ template: template.status, preview: preview.status, commit: commit.status, candidates: candidates.status, bulk: bulk.status, roster: roster.status, statusPersisted: true }));
  } finally {
    if (studentId) await prisma.user.delete({ where: { id: studentId } }).catch(() => undefined);
    if (importedTeacherUsername) await prisma.user.delete({ where: { username: importedTeacherUsername } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(error.message);
  process.exitCode = 1;
});
