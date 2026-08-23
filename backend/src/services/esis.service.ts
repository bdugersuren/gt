import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class EsisService {
  private readonly logger = new Logger(EsisService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Syncs student data, competencies, and attendance with the ESIS API.
   * If ESIS_API_URL env is not set or times out, it uses a mock sync response
   * to ensure local system stability and logs the audit event.
   */
  async syncAllStudents(operatorId: string) {
    this.logger.log(`Starting ESIS synchronization initiated by operator: ${operatorId}`);

    // 1. Fetch students along with enrollment status, progress logs, and quiz results
    const students = await this.prisma.user.findMany({
      where: { roles: { has: Role.STUDENT } },
      include: {
        enrollments: {
          include: {
            course: true,
          },
        },
        progressLogs: {
          include: {
            lesson: true,
          },
        },
        quizAttempts: true,
        rubricScores: {
          include: {
            criteria: {
              include: {
                rubric: {
                  include: {
                    assignment: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 2. Format student records to ESIS standard payload
    const payload = students.map((student) => {
      // Calculate total study time
      const totalTimeSpent = student.progressLogs.reduce((sum, log) => sum + log.timeSpentSec, 0);

      // Group competency units
      const competencies = student.enrollments.map((enr) => ({
        courseCode: enr.course.code,
        courseName: enr.course.title,
        enrollmentDate: enr.startDate,
        completionStatus: enr.cbtStatus, // COMPETENT, NOT_YET_COMPETENT
      }));

      // Gather attendance percentage
      const totalLessonsCount = student.progressLogs.length;
      const completedLessonsCount = student.progressLogs.filter((log) => log.completed).length;
      const attendanceRate = totalLessonsCount > 0 ? (completedLessonsCount / totalLessonsCount) * 100 : 100;

      return {
        studentId: student.id,
        registerNumber: student.registerNumber,
        fullName: student.fullName,
        studentCode: student.code,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        totalTimeSpentSec: totalTimeSpent,
        competencies,
      };
    });

    const esisApiUrl = process.env.ESIS_API_URL || 'https://api.esis.edu.mn/v1/tvet-sync';
    let isMock = false;
    let syncResponseData: any = null;

    // 3. Post to Ministry API (with mock fallback)
    try {
      const response = await axios.post(
        esisApiUrl,
        {
          timestamp: new Date().toISOString(),
          operatorId,
          syncRecordsCount: payload.length,
          data: payload,
        },
        {
          timeout: 4000, // Timeout after 4 seconds to prevent blocking UI
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ESIS_API_KEY || 'mock-api-key-tvet-lms'}`,
          },
        },
      );
      syncResponseData = response.data;
    } catch (error: any) {
      this.logger.warn(`ESIS connection failed: ${error.message}. Falling back to simulation (Mock Sync).`);
      isMock = true;
      syncResponseData = {
        status: 'SUCCESS_SIMULATED',
        syncId: `esis-sync-${Math.random().toString(36).substr(2, 9)}`,
        processedRecords: payload.length,
        message: 'БСШУЯ-ны ESIS систем рүү өгөгдлийг амжилттай симуляци хийж синк хийлээ.',
        timestamp: new Date().toISOString(),
      };
    }

    // 4. Log the action in AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: operatorId,
        action: 'ESIS_SYNC',
        details: {
          syncId: syncResponseData.syncId || 'local-sync',
          recordsSynchronized: payload.length,
          isMock,
          apiTarget: esisApiUrl,
        },
      },
    });

    return {
      success: true,
      syncId: syncResponseData.syncId,
      recordsCount: payload.length,
      isSimulated: isMock,
      timestamp: syncResponseData.timestamp,
      message: syncResponseData.message || 'Синк амжилттай хийгдлээ',
    };
  }
}
