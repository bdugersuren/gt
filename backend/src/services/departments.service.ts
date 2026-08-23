import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  // List all departments
  async findAll() {
    return this.prisma.department.findMany({
      include: {
        _count: {
          select: { users: true, courses: true, classes: true },
        },
      },
    });
  }

  // Get department details
  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        classes: true,
        courses: {
          include: {
            teachers: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    if (!dept) {
      throw new NotFoundException('Тэнхим олдсонгүй');
    }

    return dept;
  }

  // Create a new department (Restricted to admin/managers)
  async create(data: { name: string; code: string }) {
    const existing = await this.prisma.department.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Давхардаж байна: ${data.code} кодтой тэнхим аль хэдийн бүртгэгдсэн байна`);
    }

    return this.prisma.department.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
      },
    });
  }
}
