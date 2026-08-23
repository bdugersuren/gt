import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassGroupsService {
  constructor(private prisma: PrismaService) {}

  // List all class groups
  async findAll() {
    return this.prisma.classGroup.findMany({
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { students: true, enrollments: true },
        },
      },
    });
  }

  // Get class details including students list
  async findOne(id: string) {
    const cg = await this.prisma.classGroup.findUnique({
      where: { id },
      include: {
        department: true,
        students: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            code: true,
            registerNumber: true,
          },
        },
        enrollments: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!cg) {
      throw new NotFoundException('Анги олдсонгүй');
    }

    return cg;
  }

  // Create a new class group
  async create(data: { name: string; code: string; academicYear: string; departmentId: string }) {
    // Check if department exists
    const dept = await this.prisma.department.findUnique({
      where: { id: data.departmentId },
    });

    if (!dept) {
      throw new NotFoundException('Сонгосон тэнхим олдсонгүй');
    }

    // Check code duplication
    const existing = await this.prisma.classGroup.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Давхардаж байна: ${data.code} кодтой анги аль хэдийн бүртгэгдсэн байна`);
    }

    return this.prisma.classGroup.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        academicYear: data.academicYear,
        departmentId: data.departmentId,
      },
    });
  }
}
