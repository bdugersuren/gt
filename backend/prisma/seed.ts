import { PrismaClient, Role, QuestionType, EnrollmentSource, EnrollmentStatus, CBTStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const password = (name: string) => process.env[name] || `${name.toLowerCase()}-change-me-2026`;

async function user(data: { username: string; email: string; fullName: string; code: string; role: Role; registerNumber?: string; phone?: string; departmentId?: string }) {
  const row = await prisma.user.upsert({
    where: { username: data.username }, update: {},
    create: { username: data.username, email: data.email, fullName: data.fullName, code: data.code, roles: [data.role], registerNumber: data.registerNumber, phone: data.phone, passwordHash: await bcrypt.hash(password(`SEED_${data.role}_PASSWORD`), 10) },
  });
  if (([Role.ADMIN, Role.MANAGER, Role.TEACHER] as Role[]).includes(data.role)) await prisma.staffProfile.upsert({ where: { userId: row.id }, update: { departmentId: data.departmentId }, create: { userId: row.id, departmentId: data.departmentId } });
  if (data.role === Role.STUDENT) await prisma.studentProfile.upsert({ where: { userId: row.id }, update: { status: 'ACTIVE' }, create: { userId: row.id, status: 'ACTIVE', enrollmentYear: 2026 } });
  return row;
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Production seed is disabled');
  const agr = await prisma.department.upsert({ where: { code: 'VET-AGR' }, update: {}, create: { name: 'Хөдөө аж ахуй (Мал эмнэлэг)', code: 'VET-AGR' } });
  const ele = await prisma.department.upsert({ where: { code: 'VET-ELE' }, update: {}, create: { name: 'Барилгын цахилгаан техник', code: 'VET-ELE' } });
  const year = await prisma.academicYear.upsert({ where: { name: '2026-2027' }, update: {}, create: { name: '2026-2027', startDate: new Date('2026-09-01'), endDate: new Date('2027-08-31') } });
  const agrProgram = await prisma.program.findFirst({ where: { code: 'VET-AGR', departmentId: agr.id, durationMonths: 36 } }) || await prisma.program.create({ data: { name: 'Мал эмнэлэг', code: 'VET-AGR', durationMonths: 36, departmentId: agr.id } });
  const eleProgram = await prisma.program.findFirst({ where: { code: 'VET-ELE', departmentId: ele.id, durationMonths: 24 } }) || await prisma.program.create({ data: { name: 'Барилгын цахилгаан техник', code: 'VET-ELE', durationMonths: 24, departmentId: ele.id } });
  const agrClass = await prisma.classGroup.upsert({ where: { code: 'CLASS-AGR-3A' }, update: {}, create: { name: 'Малын эмч 3A', code: 'CLASS-AGR-3A', departmentId: agr.id, programId: agrProgram.id, academicYearId: year.id, gradeLevel: 3, cohortYear: 2026 } });
  const eleClass = await prisma.classGroup.upsert({ where: { code: 'CLASS-ELE-2B' }, update: {}, create: { name: 'Барилгын цахилгаан монтаж 2B', code: 'CLASS-ELE-2B', departmentId: ele.id, programId: eleProgram.id, academicYearId: year.id, gradeLevel: 2, cohortYear: 2026 } });
  const admin = await user({ username: 'admin', email: 'admin@gurvantamir.edu.mn', fullName: 'Батбаяр Эрдэнэ (Админ)', code: 'STAFF-ADMIN-01', role: Role.ADMIN, phone: '99112233' });
  const manager = await user({ username: 'manager', email: 'manager@gurvantamir.edu.mn', fullName: 'Саруул Туяа (Сургалтын алба)', code: 'STAFF-MGR-01', role: Role.MANAGER, phone: '99223344', departmentId: agr.id });
  const teacher = await user({ username: 'teacher', email: 'teacher@gurvantamir.edu.mn', fullName: 'Ганболд Мөнх-Эрдэнэ (Багш)', code: 'STAFF-TCH-01', role: Role.TEACHER, phone: '99334455', departmentId: agr.id });
  const student = await user({ username: 'student', email: 'student@gurvantamir.edu.mn', fullName: 'Төгөлдөр Батсуурь (Оюутан)', code: 'STUDENT-AGR-001', role: Role.STUDENT, registerNumber: 'АЕ06231234', phone: '99556677' });
  const studentEle = await user({ username: 'student_ele', email: 'student_ele@gurvantamir.edu.mn', fullName: 'Бат-Эрдэнэ Болд (Оюутан)', code: 'STUDENT-ELE-002', role: Role.STUDENT, registerNumber: 'ФМ05245678', phone: '99667788' });
  const company = await prisma.company.findFirst({ where: { name: 'Архангай Импекс ХХК' } }) || await prisma.company.create({ data: { name: 'Архангай Импекс ХХК' } });
  const mentor = await user({ username: 'mentor', email: 'mentor@industry.mn', fullName: 'Төмөр Баатар (Дадлага удирдагч)', code: 'MENTOR-01', role: Role.ENTERPRISE_MENTOR, phone: '99445566' });
  await prisma.enterpriseMentorProfile.upsert({ where: { userId: mentor.id }, update: { companyId: company.id }, create: { userId: mentor.id, companyId: company.id } });
  for (const [studentId, classGroupId] of [[student.id, agrClass.id], [studentEle.id, eleClass.id]] as const) await prisma.studentClassMembership.upsert({ where: { studentId_classGroupId_startDate: { studentId, classGroupId, startDate: new Date('2026-09-01') } }, update: { isCurrent: true }, create: { studentId, classGroupId, startDate: new Date('2026-09-01'), isCurrent: true } });
  const agrCourse = await prisma.course.upsert({ where: { code: 'VET-AGR-101' }, update: {}, create: { title: 'Мал эмнэлгийн анхан шатны тусламж', code: 'VET-AGR-101', description: 'Анхан шатны мал эмнэлгийн тусламж.', departmentId: agr.id } });
  const eleCourse = await prisma.course.upsert({ where: { code: 'VET-ELE-201' }, update: {}, create: { title: 'Барилгын цахилгаан угсралт', code: 'VET-ELE-201', description: 'Барилгын цахилгаан угсралт.', departmentId: ele.id } });
  for (const course of [agrCourse, eleCourse]) await prisma.courseTeacher.upsert({ where: { courseId_teacherId: { courseId: course.id, teacherId: teacher.id } }, update: {}, create: { courseId: course.id, teacherId: teacher.id } });
  const module = await prisma.module.findFirst({ where: { courseId: agrCourse.id, order: 1 } }) || await prisma.module.create({ data: { title: 'Чадамжийн нэгж 1', order: 1, courseId: agrCourse.id } });
  const lesson = await prisma.lesson.findFirst({ where: { moduleId: module.id, order: 1 } }) || await prisma.lesson.create({ data: { title: 'Аюулгүй ажиллагаа', order: 1, contentType: 'MARKDOWN', contentBody: 'Аюулгүй ажиллагааны ерөнхий шаардлага.', moduleId: module.id } });
  const question = await prisma.question.findFirst({ where: { courseId: agrCourse.id, text: 'Ариутгалын хамгийн найдвартай арга юу вэ?' } }) || await prisma.question.create({ data: { courseId: agrCourse.id, text: 'Ариутгалын хамгийн найдвартай арга юу вэ?', type: QuestionType.MULTIPLE_CHOICE, points: 10, options: { create: ['Автоклав', 'Усаар угаах', 'Алчуураар арчих'].map((value, order) => ({ value, order: order + 1, isCorrect: order === 0 })) } } });
  const quiz = await prisma.quiz.findFirst({ where: { lessonId: lesson.id, title: 'Аюулгүй ажиллагааны сорил' } }) || await prisma.quiz.create({ data: { title: 'Аюулгүй ажиллагааны сорил', timeLimitMin: 20, passScore: 60, lessonId: lesson.id } });
  if (!(await prisma.quizQuestion.findFirst({ where: { quizId: quiz.id, questionId: question.id } }))) await prisma.quizQuestion.create({ data: { quizId: quiz.id, questionId: question.id, order: 1 } });
  const category = await prisma.curriculumCategory.upsert({ where: { code: 'PROGRAM_COURSES' }, update: {}, create: { code: 'PROGRAM_COURSES', name: 'Program courses' } });
  const version = await prisma.curriculumVersion.upsert({ where: { programId_academicYearId_versionNo: { programId: agrProgram.id, academicYearId: year.id, versionNo: 1 } }, update: {}, create: { programId: agrProgram.id, academicYearId: year.id, versionNo: 1, versionName: '2026-2027 curriculum', semesterCount: 6 } });
  const item = await prisma.curriculumItem.upsert({ where: { curriculumVersionId_courseId: { curriculumVersionId: version.id, courseId: agrCourse.id } }, update: {}, create: { curriculumVersionId: version.id, categoryId: category.id, courseId: agrCourse.id, sequenceNumber: 1, gradeLevel: 3, isRequired: true } });
  for (const data of [{ studentId: student.id, classGroupId: agrClass.id, curriculumItemId: item.id }, { studentId: studentEle.id, classGroupId: eleClass.id, standaloneCourseId: eleCourse.id }]) {
    const existing = await prisma.enrollment.findFirst({ where: { studentId: data.studentId, source: data.curriculumItemId ? EnrollmentSource.CURRICULUM : EnrollmentSource.STANDALONE, curriculumItemId: data.curriculumItemId ?? null, standaloneCourseId: data.standaloneCourseId ?? null } });
    if (!existing) await prisma.enrollment.create({ data: { source: data.curriculumItemId ? EnrollmentSource.CURRICULUM : EnrollmentSource.STANDALONE, studentId: data.studentId, classGroupId: data.classGroupId, curriculumItemId: data.curriculumItemId, standaloneCourseId: data.standaloneCourseId, startDate: new Date('2026-09-01'), status: EnrollmentStatus.ACTIVE, cbtStatus: CBTStatus.NOT_EVALUATED } });
  }
  console.log({ admin: admin.username, manager: manager.username, teacher: teacher.username, students: [student.username, studentEle.username], courses: [agrCourse.code, eleCourse.code] });
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
