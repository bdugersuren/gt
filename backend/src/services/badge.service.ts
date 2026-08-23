import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Evaluates if a student has earned a badge for completing a course,
   * generates a mock blockchain verification transaction, and saves the badge.
   */
  async issueBadgeIfEligible(studentId: string, courseId: string) {
    // 1. Verify if the student enrollment is marked as COMPETENT
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        courseId,
        cbtStatus: 'COMPETENT',
      },
      include: {
        course: true,
      },
    });

    if (!enrollment) {
      this.logger.log(`Student ${studentId} is not eligible for badge in course ${courseId} yet.`);
      return null;
    }

    // 2. Check if a badge has already been issued for this course
    const existingBadge = await this.prisma.skillBadge.findFirst({
      where: {
        studentId,
        courseId,
      },
    });

    if (existingBadge) {
      this.logger.log(`Badge for course ${courseId} already issued to student ${studentId}.`);
      return existingBadge;
    }

    // 3. Generate mock Polygon blockchain transaction hash for OpenBadges standard
    const mockTxHash = '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');

    const courseTitle = enrollment.course.title;
    const badgeName = `"${courseTitle}" чадамжийн баталгаажуулсан тэмдэг`;
    const criteriaMet = `Чадамжийн нэгж: ${enrollment.course.code} - ${courseTitle} сургалтыг бүрэн эзэмшиж чадамжийн үнэлгээ авсан.`;

    // 4. Create badge record
    const badge = await this.prisma.skillBadge.create({
      data: {
        studentId,
        courseId,
        badgeName,
        criteriaMet,
        blockchainTx: mockTxHash,
        badgeImage: 'badge_expert_teal',
      },
    });

    this.logger.log(`SkillBadge successfully issued to student ${studentId} with Tx: ${mockTxHash}`);

    // Create AuditLog entry
    await this.prisma.auditLog.create({
      data: {
        userId: studentId,
        action: 'CBT_CERT_ISSUE',
        details: {
          badgeId: badge.id,
          badgeName,
          blockchainTx: mockTxHash,
        },
      },
    });

    return badge;
  }
}
