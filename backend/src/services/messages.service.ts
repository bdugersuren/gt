import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Send a new message
  async sendMessage(senderId: string, receiverId: string, content: string, courseId?: string) {
    return this.prisma.message.create({
      data: {
        content,
        senderId,
        receiverId,
        courseId: courseId || null,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });
  }

  // Get chronological messages of a conversation between two users
  async getConversation(userId1: string, userId2: string, courseId?: string) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
        ...(courseId ? { courseId } : {}),
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });
  }

  // Get chat contacts (teachers, classmates, or students) for a given course context
  async getChatContacts(userId: string, activeRole: string, courseId?: string) {
    if (!courseId) {
      // Fallback: return users from the same departments
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });
      return this.prisma.user.findMany({
        where: {
          id: { not: userId },
          ...(user?.departmentId ? { departmentId: user.departmentId } : {}),
        },
        select: {
          id: true,
          fullName: true,
          roles: true,
          avatarUrl: true,
          code: true,
        },
      });
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teachers: {
          select: { id: true, fullName: true, roles: true, avatarUrl: true, code: true },
        },
        enrollments: {
          include: {
            student: {
              select: { id: true, fullName: true, roles: true, avatarUrl: true, code: true },
            },
          },
        },
      },
    });

    if (!course) {
      return [];
    }

    if (activeRole === 'STUDENT') {
      // Contacts = course teachers + other enrolled students (classmates)
      const teachers = course.teachers.filter((t) => t.id !== userId);
      const classmates = course.enrollments
        .map((e) => e.student)
        .filter((s): s is NonNullable<typeof s> => !!s && s.id !== userId);

      return [...teachers, ...classmates];
    } else {
      // For Teachers or Mentors: Contacts = enrolled students
      const students = course.enrollments
        .map((e) => e.student)
        .filter((s): s is NonNullable<typeof s> => !!s && s.id !== userId);

      return students;
    }
  }
}
