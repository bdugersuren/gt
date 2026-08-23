import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateLogDto } from '../internship-logs/dto/create-log.dto';
import { ReviewLogDto } from '../internship-logs/dto/review-log.dto';

@Injectable()
export class InternshipLogsService {
  constructor(private prisma: PrismaService) {}

  // Student logs a new daily internship record
  async createLog(studentId: string, data: CreateLogDto) {
    return this.prisma.internshipLog.create({
      data: {
        studentId,
        logDate: new Date(data.logDate),
        hoursWorked: data.hoursWorked,
        workSummary: data.workSummary,
        safetyFollowed: data.safetyFollowed,
      },
    });
  }

  // Get daily logs filtered by role and student filters
  async findLogs(query: { studentId?: string }, currentUser: { id: string; role: Role }) {
    // Students can only view their own logs
    if (currentUser.role === Role.STUDENT) {
      return this.prisma.internshipLog.findMany({
        where: { studentId: currentUser.id },
        include: {
          student: {
            select: {
              fullName: true,
              code: true,
              registerNumber: true,
            },
          },
          mentor: {
            select: {
              fullName: true,
              companyName: true,
            },
          },
        },
        orderBy: { logDate: 'desc' },
      });
    }

    // Admins, Managers, Teachers, and Mentors can view logs filtered by studentId or all logs
    const whereClause: any = {};
    if (query.studentId) {
      whereClause.studentId = query.studentId;
    }

    return this.prisma.internshipLog.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            fullName: true,
            code: true,
            registerNumber: true,
          },
        },
        mentor: {
          select: {
            fullName: true,
            companyName: true,
          },
        },
      },
      orderBy: { logDate: 'desc' },
    });
  }

  // Mentor or Teacher reviews and signs off a daily log entry
  async reviewLog(logId: string, mentorId: string, data: ReviewLogDto) {
    const log = await this.prisma.internshipLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new NotFoundException('Дадлагын тэмдэглэл олдсонгүй');
    }

    return this.prisma.internshipLog.update({
      where: { id: logId },
      data: {
        isApproved: data.isApproved,
        mentorFeedback: data.mentorFeedback,
        mentorId,
      },
      include: {
        student: {
          select: {
            fullName: true,
            code: true,
          },
        },
        mentor: {
          select: {
            fullName: true,
            companyName: true,
          },
        },
      },
    });
  }
}
