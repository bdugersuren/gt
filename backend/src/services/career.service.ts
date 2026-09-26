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
    const student: any = await this.prisma.user.findUnique({ where: { id: userId }, include: { progressLogs: { where: { completed: true } }, badges: true, internshipLogs: { orderBy: { logDate: 'desc' } }, studentProfile: { include: { enrollments: { where: { cbtStatus: 'COMPETENT' } } } } } });
    if (!student) throw new NotFoundException('Суралцагчийн мэдээлэл олдсонгүй');
    const enrollments = student.studentProfile?.enrollments ?? [];
    const points = student.progressLogs.length * 10 + enrollments.length * 100;
    const allStudents: any[] = await this.prisma.user.findMany({ where: { roles: { has: Role.STUDENT } }, include: { progressLogs: { where: { completed: true } }, studentProfile: { include: { enrollments: { where: { cbtStatus: 'COMPETENT' } } } } } });
    const scores = allStudents.map((s: any) => ({ id: s.id, points: s.progressLogs.length * 10 + (s.studentProfile?.enrollments?.length ?? 0) * 100 })).sort((a, b) => b.points - a.points);
    return { points, streak: student.internshipLogs?.length ? 1 : 0, ranking: scores.findIndex((s) => s.id === userId) + 1 };
  }

  async getLeaderboard() {
    const students: any[] = await this.prisma.user.findMany({ where: { roles: { has: Role.STUDENT } }, include: { progressLogs: { where: { completed: true } }, badges: true, studentProfile: { include: { enrollments: { where: { cbtStatus: 'COMPETENT' } } } } } });
    return students.map((s: any) => ({ fullName: s.fullName, code: s.code, id: s.id, points: s.progressLogs.length * 10 + (s.studentProfile?.enrollments?.length ?? 0) * 100, badgesCount: s.badges.length })).sort((a, b) => b.points - a.points).map((item, index) => ({ rank: index + 1, ...item }));
  }
}
