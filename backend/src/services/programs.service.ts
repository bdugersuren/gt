import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type QualificationLevel = 'PROFESSIONAL_EDUCATION_III_IV' | 'TECHNICAL_EDUCATION_V_VI' | 'VOCATIONAL_TRAINING_I_V';

const qualificationShortNames: Record<QualificationLevel, string> = {
  PROFESSIONAL_EDUCATION_III_IV: 'МБ',
  TECHNICAL_EDUCATION_V_VI: 'ТБ',
  VOCATIONAL_TRAINING_I_V: 'МС',
};

function buildProgramShortName(name: string, qualificationLevel: QualificationLevel, durationMonths: number) {
  const duration = durationMonths % 12 === 0
    ? `${durationMonths / 12} ЖИЛ`
    : durationMonths === 18
      ? '1.5 ЖИЛ'
      : `${durationMonths} САР`;
  return `${name.trim().toUpperCase()}(${qualificationShortNames[qualificationLevel]}-${duration})`;
}

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const programs = await this.prisma.program.findMany({ orderBy: [{ status: 'asc' }, { name: 'asc' }], include: { department: { select: { id: true, name: true, code: true } }, curriculumVersions: { select: { items: { select: { id: true } } } }, _count: { select: { classGroups: true, curriculumVersions: true } } } });
    return programs.map(({ curriculumVersions, _count, ...program }) => ({ ...program, _count: { ..._count, gradeCourses: curriculumVersions.reduce((sum, version) => sum + version.items.length, 0) } }));
  }

  async findOne(id: string) {
    const item = await this.prisma.program.findUnique({ where: { id }, include: { department: true, classGroups: { orderBy: [{ cohortYear: 'asc' }, { gradeLevel: 'asc' }] }, curriculumVersions: { include: { academicYear: true, items: { include: { course: { select: { id: true, title: true, code: true } } } } } }, _count: { select: { classGroups: true, curriculumVersions: true } } } });
    if (!item) throw new NotFoundException('Хөтөлбөр олдсонгүй');
    const gradeCourses = item.curriculumVersions.flatMap((version) => version.items.map((row) => ({ ...row, academicYear: version.academicYear?.name || version.academicYear, isRequired: row.isRequired, course: row.course })));
    return { ...item, gradeCourses };
  }

  async create(data: { name: string; code: string; shortName?: string; durationMonths: number; departmentId: string; programType?: 'STANDARD' | 'SHORT_COURSE'; qualificationLevel: QualificationLevel }) {
    const department = await this.prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) throw new NotFoundException('Сонгосон тэнхим олдсонгүй');
    const code = data.code.toUpperCase();
    const shortName = buildProgramShortName(data.name, data.qualificationLevel, data.durationMonths);
    if (await this.prisma.program.findFirst({ where: { shortName } })) throw new ConflictException('Ийм товчилсон нэртэй хөтөлбөр аль хэдийн байна');
    if (await this.prisma.program.findUnique({ where: { code_qualificationLevel_durationMonths: { code, qualificationLevel: data.qualificationLevel, durationMonths: data.durationMonths } } })) throw new ConflictException('Ижил код, мэргэшлийн түвшин, хугацаатай хөтөлбөр аль хэдийн байна');
    return this.prisma.program.create({ data: { ...data, code, shortName, programType: data.programType || 'STANDARD' } });
  }

  async update(id: string, data: { name?: string; code?: string; shortName?: string; durationMonths?: number; departmentId?: string; programType?: 'STANDARD' | 'SHORT_COURSE'; qualificationLevel?: QualificationLevel }) {
    const current = await this.prisma.program.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Хөтөлбөр олдсонгүй');
    if (data.departmentId && !(await this.prisma.department.findUnique({ where: { id: data.departmentId } }))) throw new NotFoundException('Сонгосон тэнхим олдсонгүй');
    const code = data.code?.toUpperCase();
    const level = data.qualificationLevel || current.qualificationLevel;
    const durationMonths = data.durationMonths || current.durationMonths;
    const shortName = buildProgramShortName(data.name || current.name, level, durationMonths);
    if (shortName && shortName !== current.shortName && await this.prisma.program.findFirst({ where: { shortName } })) throw new ConflictException('Ийм товчилсон нэртэй хөтөлбөр аль хэдийн байна');
    const duplicate = await this.prisma.program.findUnique({ where: { code_qualificationLevel_durationMonths: { code: code || current.code, qualificationLevel: level, durationMonths } } });
    if (duplicate && duplicate.id !== id) throw new ConflictException('Энэ мэргэшлийн түвшинд ийм кодтой хөтөлбөр аль хэдийн байна');
    return this.prisma.program.update({ where: { id }, data: { name: data.name, code, shortName, durationMonths: data.durationMonths, departmentId: data.departmentId, programType: data.programType, qualificationLevel: data.qualificationLevel } });
  }

  async archive(id: string) {
    if (!(await this.prisma.program.findUnique({ where: { id } }))) throw new NotFoundException('Хөтөлбөр олдсонгүй');
    return this.prisma.program.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async remove(id: string) {
    const item = await this.prisma.program.findUnique({ where: { id }, include: { curriculumVersions: { select: { items: { select: { id: true } } } }, _count: { select: { classGroups: true } } } });
    if (!item) throw new NotFoundException('Хөтөлбөр олдсонгүй');
    if (item._count.classGroups + item.curriculumVersions.reduce((sum, version) => sum + version.items.length, 0) > 0) throw new ConflictException('Холбоотой өгөгдөлтэй хөтөлбөрийг устгах боломжгүй. Архивлана уу.');
    await this.prisma.program.delete({ where: { id } });
    return { deleted: true, id };
  }

  async addGradeCourse(programId: string, data: { gradeLevel: number; academicYear: string; courseId: string; isRequired: boolean }) {
    const program = await this.prisma.program.findUnique({ where: { id: programId } });
    const course = await this.prisma.course.findUnique({ where: { id: data.courseId } });
    if (!program) throw new NotFoundException('Хөтөлбөр олдсонгүй');
    if (!course) throw new NotFoundException('Курс олдсонгүй');
    if (course.departmentId !== program.departmentId) throw new ConflictException('Курс болон хөтөлбөрийн тэнхим тохирохгүй байна');
    if (data.gradeLevel > Math.ceil(program.durationMonths / 12)) throw new ConflictException('Курсийн түвшин хөтөлбөрийн хугацаатай тохирохгүй байна');
    const year = await this.prisma.academicYear.findUnique({ where: { name: data.academicYear } });
    if (!year) throw new NotFoundException(`Хичээлийн жил олдсонгүй: ${data.academicYear}`);
    return this.prisma.$transaction(async (tx) => {
      let version = await tx.curriculumVersion.findFirst({ where: { programId, academicYearId: year.id }, orderBy: { versionNo: 'desc' } });
      if (!version) version = await tx.curriculumVersion.create({ data: { programId, academicYearId: year.id, versionNo: 1, versionName: `${data.academicYear} curriculum`, semesterCount: Math.max(1, Math.ceil(program.durationMonths / 6)) } });
      let category = await tx.curriculumCategory.findUnique({ where: { code: 'PROGRAM_COURSES' } });
      if (!category) category = await tx.curriculumCategory.create({ data: { code: 'PROGRAM_COURSES', name: 'Program courses', sortOrder: 0 } });
      const existing = await tx.curriculumItem.findFirst({ where: { curriculumVersionId: version.id, courseId: data.courseId, gradeLevel: data.gradeLevel } });
      if (existing) throw new ConflictException('Энэ курс curriculum-д аль хэдийн бүртгэгдсэн байна');
      return tx.curriculumItem.create({ data: { curriculumVersionId: version.id, categoryId: category.id, courseId: data.courseId, gradeLevel: data.gradeLevel, isRequired: data.isRequired, sequenceNumber: (await tx.curriculumItem.count({ where: { curriculumVersionId: version.id } })) + 1 } });
    });
  }

  async removeGradeCourse(programId: string, id: string) {
    const row = await this.prisma.curriculumItem.findFirst({ where: { id, curriculumVersion: { programId } } });
    if (!row) throw new NotFoundException('Хөтөлбөрийн курсийн mapping олдсонгүй');
    await this.prisma.curriculumItem.delete({ where: { id } });
    return { deleted: true, id };
  }
}
