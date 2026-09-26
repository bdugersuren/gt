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
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { staffProfile: { select: { departmentId: true } } } });
      return this.prisma.user.findMany({ where: { id: { not: userId }, ...(user?.staffProfile?.departmentId ? { staffProfile: { departmentId: user.staffProfile.departmentId } } : {}) }, select: { id: true, fullName: true, roles: true, avatarUrl: true, code: true } });
    }
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teachers: { include: { teacher: { select: { id: true, fullName: true, roles: true, avatarUrl: true, code: true } } } },
        enrollments: { where: { status: 'ACTIVE' }, include: { student: { include: { user: { select: { id: true, fullName: true, roles: true, avatarUrl: true, code: true } } } } } },
        curriculumItems: { include: { enrollments: { where: { status: 'ACTIVE' }, include: { student: { include: { user: { select: { id: true, fullName: true, roles: true, avatarUrl: true, code: true } } } } } } } },
      },
    });
    if (!course) return [];
    const teachers = course.teachers.map((assignment) => assignment.teacher).filter((user) => user.id !== userId);
    const enrolled = [...course.enrollments.map((enrollment) => enrollment.student?.user), ...course.curriculumItems.flatMap((item) => item.enrollments.map((enrollment) => enrollment.student?.user))].filter((user): user is NonNullable<typeof user> => !!user && user.id !== userId);
    const students = [...new Map(enrolled.map((user) => [user.id, user])).values()];
    return activeRole === 'STUDENT' ? [...teachers, ...students] : students;
  }

}
