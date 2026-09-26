import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassGroupsService {
  constructor(private prisma: PrismaService) {}

  private buildIdentity(program: { name: string; code: string }, cohortYear?: number, gradeLevel?: number) {
    if (!cohortYear || !gradeLevel) return null;
    const suffix = `${cohortYear}-${gradeLevel}`;
    const base = program.code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'CLASS';
    const code = `${base.slice(0, Math.max(2, 20 - suffix.length - 1))}-${suffix}`.slice(0, 20);
    return { name: `${program.name.trim()} ${cohortYear}-${gradeLevel} анги`, code };
  }

  private async resolveAcademicYear(academicYearId?: string, legacyName?: string) {
    const year = academicYearId
      ? await this.prisma.academicYear.findUnique({ where: { id: academicYearId } })
      : legacyName
        ? await this.prisma.academicYear.findUnique({ where: { name: legacyName } })
        : null;
    if (!year) throw new BadRequestException('Хүчинтэй хичээлийн жил сонгоно уу');
    return year;
  }

  async findAll() {
    const groups = await this.prisma.classGroup.findMany({
      include: {
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true, shortName: true, durationMonths: true } },
        academicYear: true,
        _count: { select: { memberships: true, batchEnrollments: true } },
      },
      orderBy: [{ status: 'asc' }, { code: 'asc' }],
    });
    return groups.map(({ _count, ...group }) => ({
      ...group,
      academicYear: group.academicYear?.name ?? group.academicYear,
      _count: { students: _count.memberships, enrollments: _count.batchEnrollments },
    }));
  }

  async findOne(id: string) {
    const group = await this.prisma.classGroup.findUnique({
      where: { id },
      include: {
        department: true,
        program: true,
        academicYear: true,
        memberships: {
          where: { isCurrent: true },
          orderBy: { student: { user: { fullName: 'asc' } } },
          include: { student: { include: { user: true } } },
        },
        batchEnrollments: { include: { standaloneCourse: true, curriculumItem: { include: { course: true } } } },
      },
    });
    if (!group) throw new NotFoundException('Анги олдсонгүй');
    return {
      ...group,
      academicYear: group.academicYear?.name ?? group.academicYear,
      students: group.memberships.map((membership) => membership.student.user),
    };
  }

  async create(data: { name?: string; code?: string; academicYearId?: string; academicYear?: string; departmentId: string; programId: string; gradeLevel?: number; cohortYear?: number; graduationYear?: number }) {
    const department = await this.prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) throw new NotFoundException('Сонгосон тэнхим олдсонгүй');
    const program = await this.prisma.program.findUnique({ where: { id: data.programId } });
    if (!program) throw new NotFoundException('Сонгосон хөтөлбөр олдсонгүй');
    if (program.departmentId !== data.departmentId) throw new ConflictException('Хөтөлбөр болон тэнхим тохирохгүй байна');
    if (data.gradeLevel && data.gradeLevel > Math.ceil(program.durationMonths / 12)) throw new ConflictException('Курсийн түвшин хөтөлбөрийн хугацаатай тохирохгүй байна');
    const academicYear = await this.resolveAcademicYear(data.academicYearId, data.academicYear);
    if (data.cohortYear && data.gradeLevel) {
      const duplicate = await this.prisma.classGroup.findFirst({ where: { programId: data.programId, cohortYear: data.cohortYear, gradeLevel: data.gradeLevel } });
      if (duplicate) throw new ConflictException('Ижил хөтөлбөр, элсэлтийн он, курсийн анги аль хэдийн бүртгэгдсэн байна');
    }
    const identity = this.buildIdentity(program, data.cohortYear, data.gradeLevel);
    const name = identity?.name ?? data.name?.trim();
    const code = identity?.code ?? data.code?.trim().toUpperCase();
    if (!name || !code) throw new BadRequestException('Курс болон элсэлтийн он, түвшинг сонгосноор ангийн нэр, код автоматаар үүснэ');
    if (await this.prisma.classGroup.findUnique({ where: { code } })) throw new ConflictException(`Давхардаж байна: ${code} кодтой анги аль хэдийн бүртгэгдсэн байна`);
    return this.prisma.classGroup.create({
      data: { name, code, departmentId: data.departmentId, programId: data.programId, academicYearId: academicYear.id, gradeLevel: data.gradeLevel, cohortYear: data.cohortYear },
      include: { department: true, program: true, academicYear: true },
    });
  }

  async update(id: string, data: { name?: string; code?: string; academicYearId?: string; academicYear?: string; departmentId?: string; programId?: string; gradeLevel?: number; cohortYear?: number; graduationYear?: number }) {
    const current = await this.prisma.classGroup.findUnique({ where: { id }, include: { program: true } });
    if (!current) throw new NotFoundException('Анги олдсонгүй');
    const departmentId = data.departmentId ?? current.departmentId;
    const programId = data.programId ?? current.programId;
    if (!programId) throw new BadRequestException('Хөтөлбөр заавал сонгоно уу');
    const [department, program] = await Promise.all([
      this.prisma.department.findUnique({ where: { id: departmentId } }),
      this.prisma.program.findUnique({ where: { id: programId } }),
    ]);
    if (!department) throw new NotFoundException('Сонгосон тэнхим олдсонгүй');
    if (!program) throw new NotFoundException('Сонгосон хөтөлбөр олдсонгүй');
    if (program.departmentId !== departmentId) throw new ConflictException('Хөтөлбөр болон тэнхим тохирохгүй байна');
    if (data.gradeLevel && data.gradeLevel > Math.ceil(program.durationMonths / 12)) throw new ConflictException('Курсийн түвшин хөтөлбөрийн хугацаатай тохирохгүй байна');
    const gradeLevel = data.gradeLevel ?? current.gradeLevel ?? undefined;
    const cohortYear = data.cohortYear ?? current.cohortYear ?? undefined;
    if (cohortYear && gradeLevel) {
      const duplicate = await this.prisma.classGroup.findFirst({ where: { programId, cohortYear, gradeLevel, id: { not: id } } });
      if (duplicate) throw new ConflictException('Ижил хөтөлбөр, элсэлтийн он, курсийн анги аль хэдийн бүртгэгдсэн байна');
    }
    const identity = this.buildIdentity(program, cohortYear, gradeLevel);
    const name = identity?.name ?? data.name?.trim();
    const code = identity?.code ?? data.code?.trim().toUpperCase();
    if (!name || !code) throw new BadRequestException('Курс болон элсэлтийн он, түвшинг сонгосноор ангийн нэр, код автоматаар үүснэ');
    if (code && code !== current.code && await this.prisma.classGroup.findUnique({ where: { code } })) throw new ConflictException('Ийм кодтой анги аль хэдийн байна');
    const academicYearId = data.academicYearId || data.academicYear ? (await this.resolveAcademicYear(data.academicYearId, data.academicYear)).id : undefined;
    return this.prisma.classGroup.update({
      where: { id },
      data: { name, code, departmentId, programId, academicYearId, gradeLevel, cohortYear },
      include: { department: true, program: true, academicYear: true },
    });
  }

  async archive(id: string) {
    if (!(await this.prisma.classGroup.findUnique({ where: { id } }))) throw new NotFoundException('Анги олдсонгүй');
    return this.prisma.classGroup.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async remove(id: string) {
    const current = await this.prisma.classGroup.findUnique({ where: { id }, include: { _count: { select: { memberships: true, batchEnrollments: true } } } });
    if (!current) throw new NotFoundException('Анги олдсонгүй');
    if (current._count.memberships + current._count.batchEnrollments > 0) throw new ConflictException('Холбоотой суралцагч эсвэл enrollment-тэй ангийг устгах боломжгүй. Архивлана уу.');
    await this.prisma.classGroup.delete({ where: { id } });
    return { deleted: true, id };
  }
}
