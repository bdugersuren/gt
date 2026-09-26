import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateMongolianRegisterNumber } from '../utils/validation.util';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ManageUserDto } from '../users/dto/manage-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Parse CSV row respecting double quotes containing commas
  private parseCsvRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, '')); // Strip quotes
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  }

  // Batch import users from CSV buffer
  async importUsersFromCsv(
    fileBuffer: Buffer,
    fileName: string,
    executorId: string,
  ): Promise<{
    success: boolean;
    totalRows: number;
    importedCount: number;
    failedCount: number;
    errors: Array<{ row: number; username?: string; error: string }>;
  }> {
    const csvString = fileBuffer.toString('utf8');
    const lines = csvString.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length <= 1) {
      throw new BadRequestException('CSV файл нь зөвхөн толгой мөр (headers) агуулсан эсвэл хоосон байна');
    }

    // Header extraction
    const headers = this.parseCsvRow(lines[0]);
    
    // Find column indexes
    const idxUsername = headers.indexOf('username');
    const idxEmail = headers.indexOf('email');
    const idxFullName = headers.indexOf('fullName');
    const idxRegisterNumber = headers.indexOf('registerNumber');
    const idxCode = headers.indexOf('code');
    const idxRole = headers.indexOf('role');
    const idxPhone = headers.indexOf('phone');
    const idxCompanyName = headers.indexOf('companyName');
    const idxDepartmentCode = headers.indexOf('departmentCode');
    const idxClassGroupCode = headers.indexOf('classGroupCode');
    const idxTemporaryPassword = headers.indexOf('temporaryPassword');

    // Required fields check
    if (idxUsername === -1 || idxEmail === -1 || idxFullName === -1 || idxCode === -1 || idxRole === -1 || idxTemporaryPassword === -1) {
      throw new BadRequestException('CSV файл нь username, email, fullName, code, role, temporaryPassword багануудыг заавал агуулсан байх ёстой');
    }

    const errors: Array<{ row: number; username?: string; error: string }> = [];
    let importedCount = 0;
    let failedCount = 0;
    const executor = await this.prisma.user.findUnique({ where: { id: executorId }, select: { roles: true } });
    if (!executor) throw new BadRequestException('Импорт хийж буй хэрэглэгч олдсонгүй');

    // Loop through rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCsvRow(lines[i]);
      if (row.length === 0 || (row.length === 1 && row[0] === '')) {
        continue; // Skip empty rows
      }

      const rowNum = i + 1;
      const username = row[idxUsername];
      const email = row[idxEmail];
      const fullName = row[idxFullName];
      const code = row[idxCode];
      const roleStr = row[idxRole]?.toUpperCase();
      const registerNumber = idxRegisterNumber !== -1 ? row[idxRegisterNumber] : undefined;
      const phone = idxPhone !== -1 ? row[idxPhone] : undefined;
      const companyName = idxCompanyName !== -1 ? row[idxCompanyName] : undefined;
      const departmentCode = idxDepartmentCode !== -1 ? row[idxDepartmentCode] : undefined;
      const classGroupCode = idxClassGroupCode !== -1 ? row[idxClassGroupCode] : undefined;
      const temporaryPassword = row[idxTemporaryPassword];

      // 1. Validate required fields
      if (!username || !email || !fullName || !code || !roleStr || !temporaryPassword) {
        errors.push({ row: rowNum, username, error: 'Заавал байх ёстой мэдээлэл дутуу байна (username, email, fullName, code, role, temporaryPassword)' });
        failedCount++;
        continue;
      }

      if (temporaryPassword.length < 12) {
        errors.push({ row: rowNum, username, error: 'Түр нууц үг хамгийн багадаа 12 тэмдэгт байна' });
        failedCount++;
        continue;
      }

      // 2. Validate Role enum
      if (!Object.values(Role).includes(roleStr as Role)) {
        errors.push({ row: rowNum, username, error: `Буруу ROLE заасан байна: ${roleStr}. Зөвшөөрөгдөх утгууд: ADMIN, MANAGER, TEACHER, ENTERPRISE_MENTOR, STUDENT` });
        failedCount++;
        continue;
      }

      const role = roleStr as Role;
      if (!executor.roles.includes(Role.ADMIN) && (role === Role.ADMIN || role === Role.MANAGER)) {
        errors.push({ row: rowNum, username, error: 'Зөвхөн админ ADMIN эсвэл MANAGER эрхтэй хэрэглэгч импортлох боломжтой' });
        failedCount++;
        continue;
      }

      // 3. Validate Mongolian Registration Number (if provided or student/teacher)
      if (registerNumber) {
        const isValidReg = validateMongolianRegisterNumber(registerNumber);
        if (!isValidReg) {
          errors.push({ row: rowNum, username, error: `Регистрийн дугаарын бүтэц буруу байна: ${registerNumber}` });
          failedCount++;
          continue;
        }
      } else if (role === Role.STUDENT) {
        errors.push({ row: rowNum, username, error: 'Суралцагчийн регистрийн дугаар заавал байх ёстой' });
        failedCount++;
        continue;
      }

      // 4. Validate unique constraints in database
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email },
            { code },
          ]
        }
      });

      if (existingUser) {
        let dupField = 'username, email эсвэл code';
        if (existingUser.username === username) dupField = 'username';
        else if (existingUser.email === email) dupField = 'email';
        else if (existingUser.code === code) dupField = 'code';

        errors.push({ row: rowNum, username, error: `Давхардаж байна: Энэхүү ${dupField} өөр хэрэглэгч дээр бүртгэгдсэн байна` });
        failedCount++;
        continue;
      }

      // 5. Connect Department if departmentCode is provided
      let departmentId: string | undefined = undefined;
      if (departmentCode) {
        const dept = await this.prisma.department.findUnique({
          where: { code: departmentCode },
        });
        if (!dept) {
          errors.push({ row: rowNum, username, error: `Тэнхим олдсонгүй: ${departmentCode}` });
          failedCount++;
          continue;
        }
        departmentId = dept.id;
      }

      // 6. Connect ClassGroup if classGroupCode is provided
      let classGroupId: string | undefined = undefined;
      if (classGroupCode) {
        const cg = await this.prisma.classGroup.findUnique({
          where: { code: classGroupCode },
        });
        if (!cg) {
          errors.push({ row: rowNum, username, error: `Анги олдсонгүй: ${classGroupCode}` });
          failedCount++;
          continue;
        }
        classGroupId = cg.id;
      }

      // 7. Write normalized profile data to database
      try {
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        const company = role === Role.ENTERPRISE_MENTOR && companyName
          ? (await this.prisma.company.findFirst({ where: { name: companyName } })) || await this.prisma.company.create({ data: { name: companyName } })
          : null;
        await this.prisma.user.create({
          data: {
            username,
            email,
            fullName,
            passwordHash,
            code,
            roles: [role],
            registerNumber,
            phone,
            staffProfile: ([Role.TEACHER, Role.ADMIN, Role.MANAGER] as Role[]).includes(role) ? { create: { departmentId } } : undefined,
            studentProfile: role === Role.STUDENT ? {
              create: {
                status: 'ACTIVE',
                enrollmentYear: new Date().getFullYear(),
                classMemberships: classGroupId ? { create: { classGroupId, startDate: new Date(), isCurrent: true } } : undefined,
              },
            } : undefined,
            enterpriseMentorProfile: company ? { create: { companyId: company.id } } : undefined,
          },
        });
        importedCount++;
      } catch (err: any) {
        errors.push({ row: rowNum, username, error: `Database error: ${err.message}` });
        failedCount++;
      }
    }

    // 8. Create AuditLog entry for import action
    await this.prisma.auditLog.create({
      data: {
        userId: executorId,
        action: 'USER_IMPORT',
        details: {
          fileName,
          totalRows: lines.length - 1,
          importedCount,
          failedCount,
        },
      },
    });

    return {
      success: errors.length === 0,
      totalRows: lines.length - 1,
      importedCount,
      failedCount,
      errors,
    };
  }

  async getCompetencyProfile(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: userId },
      include: { standaloneCourse: { include: { modules: { include: { lessons: true } } } }, curriculumItem: { include: { course: { include: { modules: { include: { lessons: true } } } } } } },
    });

    const progressLogs = await this.prisma.progressLog.findMany({
      where: { studentId: userId },
      include: {
        lesson: true,
      },
    });

    const chartData = enrollments.map((enr) => {
      const course = (enr.standaloneCourse || enr.curriculumItem?.course)!;
      const totalLessons = course.modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
      
      const completedLessons = progressLogs.filter((log) => {
        return log.completed && course.modules.some((mod) => mod.lessons.some((les) => les.id === log.lessonId));
      }).length;

      let score = 0;
      if (enr.cbtStatus === 'COMPETENT') {
        score = 100;
      } else if (totalLessons > 0) {
        score = Math.round((completedLessons / totalLessons) * 100);
      }

      return {
        subject: course.title.length > 15 ? course.title.substring(0, 15) + '...' : course.title,
        score,
        fullMark: 100,
      };
    });

    if (chartData.length === 0) {
      return [
        { subject: 'Чадамжийн нэгж 1', score: 0, fullMark: 100 },
        { subject: 'Чадамжийн нэгж 2', score: 0, fullMark: 100 },
        { subject: 'Чадамжийн нэгж 3', score: 0, fullMark: 100 },
      ];
    }

    return chartData;
  }

  async getDropoutRisks() {
    const students = await this.prisma.user.findMany({
      where: { roles: { has: Role.STUDENT } },
      include: {
        progressLogs: {
          include: {
            lesson: {
              include: {
                module: true,
              },
            },
          },
        },
        quizAttempts: true,
      },
    });

    return students.map((student) => {
      let riskScore = 0;
      const factors: string[] = [];

      const totalLessons = student.progressLogs.length;
      const completedLessons = student.progressLogs.filter((log) => log.completed).length;
      const attendanceRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      
      if (totalLessons === 0 || attendanceRate < 50) {
        riskScore += 40;
        factors.push('Хичээлийн ирц/явц хангалтгүй (50%-иас бага)');
      }

      const totalQuizzes = student.quizAttempts.length;
      const averageQuizScore = totalQuizzes > 0 
        ? student.quizAttempts.reduce((sum, qa) => sum + (qa.score ?? 0), 0) / totalQuizzes 
        : 0;

      if (totalQuizzes === 0) {
        riskScore += 20;
        factors.push('Сорил бөглөөгүй');
      } else if (averageQuizScore < 60) {
        riskScore += 30;
        factors.push('Сорилын дундаж үнэлгээ хангалтгүй (60%-иас бага)');
      }

      const totalTimeSpent = student.progressLogs.reduce((sum, log) => sum + log.timeSpentSec, 0);
      if (totalTimeSpent < 1800) {
        riskScore += 30;
        factors.push('Систем дэх идэвх маш бага (30 минутаас бага)');
      }

      let riskStatus = 'LOW';
      if (riskScore >= 70) riskStatus = 'HIGH';
      else if (riskScore >= 40) riskStatus = 'MEDIUM';

      return {
        id: student.id,
        fullName: student.fullName,
        code: student.code,
        registerNumber: student.registerNumber,
        riskScore,
        riskStatus,
        factors,
      };
    });
  }

  // Get all users
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        code: true,
        roles: true,
        staffProfile: { include: { department: { select: { name: true, code: true } } } },
      },
    });
  }

  async findAllManaged() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, username: true, email: true, fullName: true, code: true, registerNumber: true, phone: true, roles: true, createdAt: true,
        staffProfile: { select: { department: { select: { id: true, name: true, code: true } } } },
        studentProfile: { select: { status: true, enrollmentYear: true } },
        enterpriseMentorProfile: { select: { jobTitle: true, company: { select: { id: true, name: true } } } },
      },
    });
  }

  private async resolveCompany(data: ManageUserDto, tx: any) {
    if (!data.companyId && !data.companyName) throw new BadRequestException('Enterprise mentor-д компани сонгоно уу');
    if (data.companyId) {
      const company = await tx.company.findUnique({ where: { id: data.companyId } });
      if (!company) throw new NotFoundException('Сонгосон компани олдсонгүй');
      return company;
    }
    return tx.company.findFirst({ where: { name: data.companyName } }) || tx.company.create({ data: { name: data.companyName } });
  }

  async createManaged(data: ManageUserDto) {
    if (!data.roles?.length) throw new BadRequestException('Хэрэглэгчийн role заавал сонгоно уу');
    if (!data.password) throw new BadRequestException('Шинэ хэрэглэгчийн нууц үг заавал байна');
    const duplicate = await this.prisma.user.findFirst({ where: { OR: [{ username: data.username }, { email: data.email }, { code: data.code }, ...(data.registerNumber ? [{ registerNumber: data.registerNumber }] : [])] } });
    if (duplicate) throw new ConflictException('Username, email, code эсвэл регистрийн дугаар давхардаж байна');
    const department = data.departmentId ? await this.prisma.department.findUnique({ where: { id: data.departmentId } }) : null;
    if (data.departmentId && !department) throw new NotFoundException('Сонгосон тэнхим олдсонгүй');
    const company = data.roles.includes(Role.ENTERPRISE_MENTOR) ? await this.resolveCompany(data, this.prisma) : null;
    const passwordHash = await bcrypt.hash(data.password, 10);
    try {
      const user = await this.prisma.user.create({ data: { username: data.username.trim(), email: data.email.trim().toLowerCase(), fullName: data.fullName.trim(), code: data.code.trim().toUpperCase(), registerNumber: data.registerNumber || null, phone: data.phone || null, passwordHash, roles: data.roles, staffProfile: data.roles.some((role) => ([Role.ADMIN, Role.MANAGER, Role.TEACHER] as Role[]).includes(role)) ? { create: { departmentId: data.departmentId || null } } : undefined, studentProfile: data.roles.includes(Role.STUDENT) ? { create: { enrollmentYear: data.enrollmentYear || new Date().getFullYear() } } : undefined, enterpriseMentorProfile: company ? { create: { companyId: company.id } } : undefined }, select: { id: true } });
      return this.findManagedById(user.id);
    } catch (error: any) { throw new ConflictException(`Хэрэглэгч үүсгэхэд алдаа гарлаа: ${error.message}`); }
  }

  async findManagedById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, username: true, email: true, fullName: true, code: true, registerNumber: true, phone: true, roles: true, createdAt: true, staffProfile: { select: { department: { select: { id: true, name: true, code: true } } } }, studentProfile: { select: { status: true, enrollmentYear: true } }, enterpriseMentorProfile: { select: { jobTitle: true, company: { select: { id: true, name: true } } } } } });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');
    return user;
  }

  async updateManaged(id: string, data: ManageUserDto) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Хэрэглэгч олдсонгүй');
    const duplicate = await this.prisma.user.findFirst({ where: { OR: [{ username: data.username }, { email: data.email }, { code: data.code }, ...(data.registerNumber ? [{ registerNumber: data.registerNumber }] : [])], NOT: { id } } });
    if (duplicate) throw new ConflictException('Username, email, code эсвэл регистрийн дугаар давхардаж байна');
    const company = data.roles.includes(Role.ENTERPRISE_MENTOR) ? await this.resolveCompany(data, this.prisma) : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { username: data.username.trim(), email: data.email.trim().toLowerCase(), fullName: data.fullName.trim(), code: data.code.trim().toUpperCase(), registerNumber: data.registerNumber || null, phone: data.phone || null, roles: data.roles, ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}) } });
      const staff = data.roles.some((role) => ([Role.ADMIN, Role.MANAGER, Role.TEACHER] as Role[]).includes(role));
      if (staff) await tx.staffProfile.upsert({ where: { userId: id }, update: { departmentId: data.departmentId || null }, create: { userId: id, departmentId: data.departmentId || null } }); else await tx.staffProfile.deleteMany({ where: { userId: id } });
      if (data.roles.includes(Role.STUDENT)) await tx.studentProfile.upsert({ where: { userId: id }, update: { enrollmentYear: data.enrollmentYear }, create: { userId: id, enrollmentYear: data.enrollmentYear || new Date().getFullYear() } }); else await tx.studentProfile.deleteMany({ where: { userId: id } });
      if (company) await tx.enterpriseMentorProfile.upsert({ where: { userId: id }, update: { companyId: company.id }, create: { userId: id, companyId: company.id } }); else await tx.enterpriseMentorProfile.deleteMany({ where: { userId: id } });
    });
    return this.findManagedById(id);
  }

  async deleteManaged(id: string, executorId: string) {
    if (id === executorId) throw new BadRequestException('Өөрийн admin хэрэглэгчийг устгах боломжгүй');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, username: true } });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');
    try { await this.prisma.user.delete({ where: { id } }); return { deleted: true, id, username: user.username }; }
    catch (error: any) { throw new ConflictException('Хэрэглэгчтэй холбоотой өгөгдөл байгаа тул устгах боломжгүй. Архивлах эсвэл role-ийг өөрчилнө үү.'); }
  }

  // Get users by role
  async findTeacherStudents(teacherId: string) {
    const profiles = await this.prisma.studentProfile.findMany({
      where: {
        enrollments: {
          some: {
            OR: [
              { standaloneCourse: { teachers: { some: { teacherId } } } },
              { curriculumItem: { course: { teachers: { some: { teacherId } } } } },
            ],
          },
        },
      },
      orderBy: { user: { fullName: 'asc' } },
      include: {
        user: { select: { id: true, fullName: true, email: true, code: true, registerNumber: true, phone: true } },
        classMemberships: { where: { isCurrent: true }, include: { classGroup: { select: { id: true, name: true, code: true } } } },
        enrollments: {
          include: {
            standaloneCourse: { select: { id: true, title: true, code: true } },
            curriculumItem: { include: { course: { select: { id: true, title: true, code: true } } } },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    return profiles.map((profile) => {
      const courses = new Map<string, { id: string; title: string; code: string; statuses: string[] }>();
      for (const enrollment of profile.enrollments) {
        const course = enrollment.standaloneCourse || enrollment.curriculumItem?.course;
        if (!course) continue;
        const current = courses.get(course.id) || { ...course, statuses: [] };
        if (!current.statuses.includes(enrollment.status)) current.statuses.push(enrollment.status);
        courses.set(course.id, current);
      }
      return {
        ...profile.user,
        status: profile.status,
        enrollmentYear: profile.enrollmentYear,
        classes: profile.classMemberships.map((membership) => membership.classGroup),
        courses: Array.from(courses.values()),
      };
    });
  }

  async findUsersByRole(role: Role) {
    return this.prisma.user.findMany({
      where: {
        roles: { has: role },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        code: true,
      },
    });
  }
}
