import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class CareerService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Auto-seed mock job vacancies if database table is empty
    const count = await this.prisma.jobVacancy.count();
    if (count === 0) {
      await this.prisma.jobVacancy.createMany({
        data: [
          {
            title: 'Туслах малын эмч',
            companyName: 'Архангай Импекс ХХК',
            description: 'Мал эмнэлгийн анхан шатны тусламж үзүүлэх, вакцины бэлтгэл хангаж ажиллах туслах ажилтан авна.',
            skillsReq: JSON.stringify(['VET-AGR-101']),
            location: 'Архангай, Эрдэнэбулган',
            salary: '1.5 - 2.0 сая төгрөг',
          },
          {
            title: 'Барилгын цахилгаанчин',
            companyName: 'Соёмбо Эрдэнэ Констракшн ХХК',
            description: 'Барилгын цахилгаан монтаж, шугам угсралт, болон ХАБЭА дүрэм мөрдөж угсралт хийх чадвартай гүйцэтгэгч авна.',
            skillsReq: JSON.stringify(['VET-ELE-101']),
            location: 'Улаанбаатар, Баянзүрх',
            salary: '2.0 - 2.8 сая төгрөг',
          },
        ],
      });
    }
  }

  /**
   * Matches open job vacancies with the student's acquired competency course codes.
   */
  async matchJobs(userId: string) {
    const studentEnrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId: userId,
        cbtStatus: 'COMPETENT',
      },
      include: {
        course: true,
      },
    });

    const studentSkills = studentEnrollments.map((enr) => enr.course.code);

    const vacancies = await this.prisma.jobVacancy.findMany();

    return vacancies.map((vacancy) => {
      const requiredSkills: string[] = JSON.parse(vacancy.skillsReq as string);
      
      const matchingSkills = requiredSkills.filter((skill) =>
        studentSkills.includes(skill),
      );

      const matchPercent = requiredSkills.length > 0
        ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
        : 100;

      return {
        id: vacancy.id,
        title: vacancy.title,
        companyName: vacancy.companyName,
        description: vacancy.description,
        location: vacancy.location,
        salary: vacancy.salary,
        requiredSkills,
        matchPercent,
      };
    });
  }

  /**
   * Retrieves public E-Portfolio data for a student by their unique code.
   * This is accessible publicly (no auth required) via QR code scans.
   */
  async getPublicPortfolio(code: string) {
    const student = await this.prisma.user.findUnique({
      where: { code },
      include: {
        department: true,
        classGroup: true,
        badges: true,
        enrollments: {
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
        },
        progressLogs: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Суралцагчийн мэдээлэл олдсонгүй');
    }

    // Auto-issue badges if student has COMPETENT enrollments but no badges for them
    const competentEnrollments = student.enrollments.filter(e => e.cbtStatus === 'COMPETENT');
    for (const enr of competentEnrollments) {
      const hasBadge = student.badges.some(b => b.courseId === enr.courseId);
      if (!hasBadge) {
        const mockTxHash = '0x' + Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16),
        ).join('');
        const courseTitle = enr.course.title;
        const badgeName = `"${courseTitle}" чадамжийн баталгаажуулсан тэмдэг`;
        const criteriaMet = `Чадамжийн нэгж: ${enr.course.code} - ${courseTitle} сургалтыг бүрэн эзэмшиж чадамжийн үнэлгээ авсан.`;
        
        const newBadge = await this.prisma.skillBadge.create({
          data: {
            studentId: student.id,
            courseId: enr.courseId,
            badgeName,
            criteriaMet,
            blockchainTx: mockTxHash,
            badgeImage: 'badge_expert_teal',
          }
        });
        student.badges.push(newBadge);
      }
    }

    // Calculate competency radar data
    const radarData = student.enrollments.map((enr) => {
      const course = enr.course;
      const totalLessons = course.modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
      
      const completedLessons = student.progressLogs.filter((log) => {
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

    return {
      fullName: student.fullName,
      code: student.code,
      registerNumber: student.registerNumber,
      department: student.department?.name,
      classGroup: student.classGroup?.name,
      badges: student.badges,
      radarData: radarData.length > 0 ? radarData : [
        { subject: 'Чадамжийн нэгж 1', score: 0, fullMark: 100 },
        { subject: 'Чадамжийн нэгж 2', score: 0, fullMark: 100 },
        { subject: 'Чадамжийн нэгж 3', score: 0, fullMark: 100 },
      ],
    };
  }

  async getGamificationStats(userId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        progressLogs: { where: { completed: true } },
        enrollments: {
          where: { cbtStatus: 'COMPETENT' },
          include: { course: true }
        },
        internshipLogs: { orderBy: { logDate: 'desc' } },
        badges: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Суралцагчийн мэдээлэл олдсонгүй');
    }

    // Auto-issue badges if student has COMPETENT enrollments but no badges for them
    const competentEnrollments = student.enrollments.filter(e => e.cbtStatus === 'COMPETENT');
    for (const enr of competentEnrollments) {
      const hasBadge = student.badges.some(b => b.courseId === enr.courseId);
      if (!hasBadge) {
        const mockTxHash = '0x' + Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16),
        ).join('');
        const courseTitle = enr.course.title;
        const badgeName = `"${courseTitle}" чадамжийн баталгаажуулсан тэмдэг`;
        const criteriaMet = `Чадамжийн нэгж: ${enr.course.code} - ${courseTitle} сургалтыг бүрэн эзэмшиж чадамжийн үнэлгээ авсан.`;
        
        await this.prisma.skillBadge.create({
          data: {
            studentId: student.id,
            courseId: enr.courseId,
            badgeName,
            criteriaMet,
            blockchainTx: mockTxHash,
            badgeImage: 'badge_expert_teal',
          }
        });
      }
    }

    const points = (student.progressLogs.length * 10) + (student.enrollments.length * 100);

    let streak = 0;
    if (student.internshipLogs.length > 0) {
      const dates = student.internshipLogs.map((log) => {
        const d = new Date(log.logDate);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      });
      
      const uniqueDates = Array.from(new Set(dates));
      
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const hasRecentLog = uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr);
      if (hasRecentLog) {
        streak = 1;
        let currentDate = new Date(uniqueDates[0]);
        for (let i = 1; i < uniqueDates.length; i++) {
          const nextDate = new Date(uniqueDates[i]);
          const diffTime = Math.abs(currentDate.getTime() - nextDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streak++;
            currentDate = nextDate;
          } else {
            break;
          }
        }
      }
    }

    const allStudents = await this.prisma.user.findMany({
      where: { roles: { has: Role.STUDENT } },
      include: {
        progressLogs: { where: { completed: true } },
        enrollments: { where: { cbtStatus: 'COMPETENT' } },
      },
    });

    const scoresList = allStudents.map((s) => ({
      id: s.id,
      points: (s.progressLogs.length * 10) + (s.enrollments.length * 100),
    })).sort((a, b) => b.points - a.points);

    const ranking = scoresList.findIndex((item) => item.id === userId) + 1;

    return {
      points,
      streak,
      ranking,
    };
  }

  async getLeaderboard() {
    const students = await this.prisma.user.findMany({
      where: { roles: { has: Role.STUDENT } },
      include: {
        progressLogs: { where: { completed: true } },
        enrollments: { where: { cbtStatus: 'COMPETENT' } },
        badges: true,
      },
    });

    const leaderboard = students.map((s) => {
      const points = (s.progressLogs.length * 10) + (s.enrollments.length * 100);
      return {
        id: s.id,
        fullName: s.fullName,
        code: s.code,
        points,
        badgesCount: s.badges.length,
      };
    });

    return leaderboard.sort((a, b) => b.points - a.points).map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
  }
}

