import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class CareerService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    if (await this.prisma.jobVacancy.count() > 0) return;
    const seed = [
      { title: 'Туслах малын эмч', company: 'Архангай Импекс ХХК', description: 'Мал эмнэлгийн анхан шатны тусламж үзүүлэх туслах ажилтан авна.', location: 'Архангай, Эрдэнэбулган', salaryText: '1.5 - 2.0 сая төгрөг', courseCodes: ['VET-AGR-101'] },
      { title: 'Барилгын цахилгаанчин', company: 'Соёмбо Эрдэнэ Констракшн ХХК', description: 'Барилгын цахилгаан монтаж, шугам угсралт хийх ажилтан авна.', location: 'Улаанбаатар, Баянзүрх', salaryText: '2.0 - 2.8 сая төгрөг', courseCodes: ['VET-ELE-101'] },
    ];
    for (const item of seed) {
      const company = await this.prisma.company.findFirst({ where: { name: item.company } }) || await this.prisma.company.create({ data: { name: item.company } });
      const courses = await this.prisma.course.findMany({ where: { code: { in: item.courseCodes } }, select: { id: true } });
      await this.prisma.jobVacancy.create({ data: { title: item.title, companyId: company.id, description: item.description, location: item.location, salaryText: item.salaryText, requiredCourses: courses.length ? { create: courses.map((course) => ({ courseId: course.id })) } : undefined } });
    }
  }

  async matchJobs(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: userId, cbtStatus: 'COMPETENT' },
      include: { standaloneCourse: true, curriculumItem: { include: { course: true } } },
    });
    const studentSkills = enrollments.map((e) => e.standaloneCourse?.code || e.curriculumItem?.course.code).filter((v): v is string => Boolean(v));
    const vacancies = await this.prisma.jobVacancy.findMany({ include: { company: true, requiredCourses: { include: { course: true } } } });
    return vacancies.map((vacancy) => {
      const requiredSkills = vacancy.requiredCourses.map((item) => item.course.code);
      const matchingSkills = requiredSkills.filter((skill) => studentSkills.includes(skill));
      return { id: vacancy.id, title: vacancy.title, company: vacancy.company, description: vacancy.description, location: vacancy.location, salaryText: vacancy.salaryText, requiredSkills, requiredCourses: vacancy.requiredCourses.map((item) => item.course), matchPercent: requiredSkills.length ? Math.round((matchingSkills.length / requiredSkills.length) * 100) : 100 };
    });
  }

  private async getStudentByCode(code: string) {
    return this.prisma.user.findUnique({ where: { code }, include: {
      studentProfile: { include: { classMemberships: { where: { isCurrent: true }, include: { classGroup: { include: { department: true } } } }, enrollments: { include: { standaloneCourse: { include: { modules: { include: { lessons: true } } } }, curriculumItem: { include: { course: { include: { modules: { include: { lessons: true } } } } } } } } } },
      progressLogs: true, badges: true,
    } });
  }

  async getPublicPortfolio(code: string) {
    const raw = await this.getStudentByCode(code);
    if (!raw) throw new NotFoundException('Суралцагчийн мэдээлэл олдсонгүй');
    const student: any = raw;
    const enrollments = student.studentProfile?.enrollments ?? [];
    const courses = enrollments.map((e: any) => e.standaloneCourse || e.curriculumItem?.course).filter(Boolean);
    const radarData = enrollments.map((enr: any) => {
      const course = enr.standaloneCourse || enr.curriculumItem?.course;
      const lessons = course.modules.flatMap((m: any) => m.lessons);
      const completed = student.progressLogs.filter((log: any) => log.completed && lessons.some((lesson: any) => lesson.id === log.lessonId)).length;
      const score = enr.cbtStatus === 'COMPETENT' ? 100 : lessons.length ? Math.round(completed / lessons.length * 100) : 0;
      return { subject: course.title.length > 15 ? `${course.title.substring(0, 15)}...` : course.title, score, fullMark: 100 };
    });
    return { fullName: student.fullName, code: student.code, registerNumber: student.registerNumber, department: student.studentProfile?.classMemberships[0]?.classGroup.department?.name, classGroup: student.studentProfile?.classMemberships[0]?.classGroup.name, badges: student.badges, radarData: radarData.length ? radarData : [{ subject: 'Чадамжийн нэгж 1', score: 0, fullMark: 100 }, { subject: 'Чадамжийн нэгж 2', score: 0, fullMark: 100 }, { subject: 'Чадамжийн нэгж 3', score: 0, fullMark: 100 }] };
  }

  async getGamificationStats(userId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        internshipLogs: { orderBy: { logDate: 'desc' }, take: 1 },
      },
    });
    if (!student) throw new NotFoundException('Суралцагчийн мэдээлэл олдсонгүй');

    // Calculate student points efficiently via counts
    const [completedLessons, competentEnrollments] = await Promise.all([
      this.prisma.progressLog.count({ where: { studentId: userId, completed: true } }),
      this.prisma.enrollment.count({ where: { studentId: userId, cbtStatus: 'COMPETENT' } }),
    ]);
    const points = completedLessons * 10 + competentEnrollments * 100;

    // Fast ranking query in DB without loading all students into Node.js RAM
    const rankResult: any[] = await this.prisma.$queryRaw`
      WITH student_scores AS (
        SELECT 
          u.id,
          (
            COALESCE((SELECT COUNT(*)::int FROM "ProgressLog" pl WHERE pl."studentId" = u.id AND pl.completed = true), 0) * 10 +
            COALESCE((SELECT COUNT(*)::int FROM "Enrollment" en WHERE en."studentId" = u.id AND en."cbtStatus" = 'COMPETENT'), 0) * 100
          ) as total_points
        FROM "User" u
        WHERE 'STUDENT' = ANY(u.roles)
      )
      SELECT 
        (SELECT COUNT(*)::int + 1 FROM student_scores higher WHERE higher.total_points > ${points}) as ranking
    `;

    const ranking = Number(rankResult[0]?.ranking) || 1;
    return { points, streak: student.internshipLogs?.length ? 1 : 0, ranking };
  }

  async getLeaderboard(limit = 50) {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        u.id,
        u."fullName",
        u.code,
        (
          COALESCE((SELECT COUNT(*)::int FROM "ProgressLog" pl WHERE pl."studentId" = u.id AND pl.completed = true), 0) * 10 +
          COALESCE((SELECT COUNT(*)::int FROM "Enrollment" en WHERE en."studentId" = u.id AND en."cbtStatus" = 'COMPETENT'), 0) * 100
        ) as points,
        COALESCE((SELECT COUNT(*)::int FROM "SkillBadge" sb WHERE sb."studentId" = u.id), 0) as "badgesCount"
      FROM "User" u
      WHERE 'STUDENT' = ANY(u.roles)
      ORDER BY points DESC, u."fullName" ASC
      LIMIT ${limit}
    `;

    return rows.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      fullName: item.fullName,
      code: item.code,
      points: Number(item.points) || 0,
      badgesCount: Number(item.badgesCount) || 0,
    }));
  }
}
