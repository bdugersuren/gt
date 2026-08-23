import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateMongolianRegisterNumber } from '../utils/validation.util';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

      // 7. Write to database
      try {
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
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
            companyName,
            departmentId,
            classGroupId,
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
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
    });

    const progressLogs = await this.prisma.progressLog.findMany({
      where: { studentId: userId },
      include: {
        lesson: true,
      },
    });

    const chartData = enrollments.map((enr) => {
      const course = enr.course;
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
        ? student.quizAttempts.reduce((sum, qa) => sum + qa.score, 0) / totalQuizzes 
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
        department: { select: { name: true, code: true } },
      },
    });
  }

  // Get users by role
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
