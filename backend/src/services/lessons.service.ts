import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  // Create a new module under a course
  async createModule(data: { title: string; order: number; courseId: string }) {
    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId },
    });

    if (!course) {
      throw new NotFoundException('Хичээл олдсонгүй');
    }

    return this.prisma.module.create({
      data: {
        title: data.title,
        order: data.order,
        courseId: data.courseId,
      },
    });
  }

  // Create a new lesson under a module
  async createLesson(data: {
    title: string;
    order: number;
    contentType: string;
    contentBody?: string;
    videoUrl?: string;
    pdfUrl?: string;
    moduleId: string;
  }) {
    const mod = await this.prisma.module.findUnique({
      where: { id: data.moduleId },
    });

    if (!mod) {
      throw new NotFoundException('Модуль олдсонгүй');
    }

    return this.prisma.lesson.create({
      data: {
        title: data.title,
        order: data.order,
        contentType: data.contentType,
        contentBody: data.contentBody,
        videoUrl: data.videoUrl,
        pdfUrl: data.pdfUrl,
        moduleId: data.moduleId,
      },
    });
  }

  // Recursive DFS helper to check if a path exists from startId to targetId
  private async hasPath(startId: string, targetId: string, visited = new Set<string>()): Promise<boolean> {
    if (startId === targetId) return true;
    if (visited.has(startId)) return false;
    visited.add(startId);

    // Fetch all prerequisites of the current node
    const prerequisites = await this.prisma.lessonPrerequisite.findMany({
      where: { lessonId: startId },
      select: { prerequisiteId: true },
    });

    for (const p of prerequisites) {
      if (await this.hasPath(p.prerequisiteId, targetId, visited)) {
        return true;
      }
    }

    return false;
  }

  // Add a prerequisite relationship (restricting loops/cycles)
  async addPrerequisite(lessonId: string, prerequisiteId: string) {
    if (lessonId === prerequisiteId) {
      throw new BadRequestException('Лекц өөрөө өөрийнхөө урьдчилсан нөхцөл байж болохгүй');
    }

    // 1. Fetch both lessons
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    const prereq = await this.prisma.lesson.findUnique({
      where: { id: prerequisiteId },
      include: { module: true },
    });

    if (!lesson || !prereq) {
      throw new NotFoundException('Лекц олдсонгүй');
    }

    // 2. Ensure they belong to the same course
    if (lesson.module.courseId !== prereq.module.courseId) {
      throw new BadRequestException('Урьдчилсан нөхцөл болон тухайн лекц нь нэг хичээлд харьяалагдах ёстой');
    }

    // 3. Cycle Detection: Check if a path from prerequisiteId back to lessonId exists.
    // If a path exists, adding the link lessonId -> prerequisiteId will close a cycle.
    const isCycle = await this.hasPath(prerequisiteId, lessonId);
    if (isCycle) {
      throw new BadRequestException(
        'Тойрог хамаарал илэрлээ (Cycle detected): Энэ лекцийг урьдчилсан нөхцөл болгон нэмбэл гогцоо үүсэх тул бүртгэх боломжгүй.'
      );
    }

    // 4. Check if duplicate relationship
    const existing = await this.prisma.lessonPrerequisite.findUnique({
      where: {
        lessonId_prerequisiteId: { lessonId, prerequisiteId },
      },
    });

    if (existing) {
      throw new ConflictException('Энэхүү урьдчилсан нөхцөл холбоос аль хэдийн бүртгэгдсэн байна');
    }

    return this.prisma.lessonPrerequisite.create({
      data: {
        lessonId,
        prerequisiteId,
      },
    });
  }

  // Check if student has completed all prerequisites of a lesson
  async checkPrerequisites(lessonId: string, studentId: string): Promise<boolean> {
    const prerequisites = await this.prisma.lessonPrerequisite.findMany({
      where: { lessonId },
      select: { prerequisiteId: true },
    });

    if (prerequisites.length === 0) return true;

    // Fetch progress logs for completed prerequisites
    const completedLogs = await this.prisma.progressLog.findMany({
      where: {
        studentId,
        lessonId: { in: prerequisites.map((p) => p.prerequisiteId) },
        completed: true,
      },
    });

    // Student must have completed all prerequisites
    return completedLogs.length === prerequisites.length;
  }

  // Fetch lesson details (verifies student prerequisites and tracks last access)
  async findOne(lessonId: string, userId: string, roles: Role[]) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        prerequisites: {
          include: {
            prerequisite: {
              select: { id: true, title: true, order: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Лекц олдсонгүй');
    }

    if (roles.includes(Role.STUDENT)) {
      const allowed = await this.checkPrerequisites(lessonId, userId);
      if (!allowed) {
        throw new ForbiddenException(
          'Энэхүү лекцийг үзэх боломжгүй: Та өмнөх шаардлагатай урьдчилсан лекцүүдийг уншиж дуусгаагүй байна'
        );
      }

      // Log/Update student access telemetry
      await this.prisma.progressLog.upsert({
        where: {
          studentId_lessonId: { studentId: userId, lessonId },
        },
        update: {
          lastAccess: new Date(),
        },
        create: {
          studentId: userId,
          lessonId,
          completed: false,
          timeSpentSec: 0,
          lastAccess: new Date(),
        },
      });
    }

    return lesson;
  }

  // Mark lesson as completed for the student
  async completeLesson(lessonId: string, studentId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Лекц олдсонгүй');
    }

    // Verify prerequisites before allowing completion just in case of bypass
    const allowed = await this.checkPrerequisites(lessonId, studentId);
    if (!allowed) {
      throw new ForbiddenException(
        'Энэ лекцийг үзэж дуусгах боломжгүй: Та өмнөх шаардлагатай лекцүүдийг дуусгаагүй байна'
      );
    }

    return this.prisma.progressLog.upsert({
      where: {
        studentId_lessonId: { studentId, lessonId },
      },
      update: {
        completed: true,
        lastAccess: new Date(),
      },
      create: {
        studentId,
        lessonId,
        completed: true,
        timeSpentSec: 0,
        lastAccess: new Date(),
      },
    });
  }

  // Update lesson content (title, contentBody, videoUrl, pdfUrl, contentType)
  async updateLesson(id: string, data: {
    title?: string;
    contentBody?: string;
    videoUrl?: string;
    pdfUrl?: string;
    contentType?: string;
  }) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Лекц олдсонгүй');
    }
    return this.prisma.lesson.update({
      where: { id },
      data,
    });
  }

  // Delete a module
  async deleteModule(id: string) {
    return this.prisma.module.delete({
      where: { id },
    });
  }

  // Delete a lesson
  async deleteLesson(id: string) {
    return this.prisma.lesson.delete({
      where: { id },
    });
  }
}
