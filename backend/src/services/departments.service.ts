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
          select: { staffProfiles: true, courses: true, classGroups: true },
        },
      },
    });
  }

  // Get department details
  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        classGroups: true,
        courses: {
          include: {
            teachers: {
              include: { teacher: { select: { id: true, fullName: true, email: true } } },
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
  async update(id: string, data: { name?: string; code?: string }) {
    const current = await this.prisma.department.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Тэнхим олдсонгүй');
    const code = data.code?.toUpperCase();
    if (code && code !== current.code && await this.prisma.department.findUnique({ where: { code } })) throw new ConflictException('Ийм кодтой тэнхим аль хэдийн байна');
    return this.prisma.department.update({ where: { id }, data: { name: data.name, code } });
  }

  async archive(id: string) {
    const current = await this.prisma.department.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Тэнхим олдсонгүй');
    return this.prisma.department.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async remove(id: string) {
    const current = await this.prisma.department.findUnique({ where: { id }, include: { _count: { select: { staffProfiles: true, courses: true, classGroups: true } } } });
    if (!current) throw new NotFoundException('Тэнхим олдсонгүй');
    if (current._count.staffProfiles + current._count.courses + current._count.classGroups > 0) throw new ConflictException('Холбоотой өгөгдөлтэй тэнхимийг устгах боломжгүй. Архивлана уу.');
    await this.prisma.department.delete({ where: { id } });
    return { deleted: true, id };
  }
}
