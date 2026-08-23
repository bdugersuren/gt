import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  // Create a new announcement (Restricted to Managers and Admins)
  async createAnnouncement(
    senderId: string,
    title: string,
    content: string,
    targetRole?: Role,
    targetUserId?: string,
  ) {
    return this.prisma.announcement.create({
      data: {
        title,
        content,
        senderId,
        targetRole: targetRole || null,
        targetUserId: targetUserId || null,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });
  }

  // Fetch announcements visible to the current user (based on role/ID)
  async getAnnouncements(userId: string, activeRole: Role) {
    return this.prisma.announcement.findMany({
      where: {
        OR: [
          // General announcements (visible to all)
          { targetRole: null, targetUserId: null },
          // Role-specific announcements (e.g., all students)
          { targetRole: activeRole },
          // User-specific announcements (directed to this student)
          { targetUserId: userId },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });
  }
}
