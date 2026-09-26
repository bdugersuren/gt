import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  private async academicYear(name: string) {
    const year = await this.prisma.academicYear.findUnique({ where: { name } });
    if (!year) throw new BadRequestException(`Хичээлийн жил олдсонгүй: ${name}`);
    return year;
  }

  private async evaluate(studentId: string, fromClassGroupId: string, academicYearName: string, toClassGroupId?: string) {
    const year = await this.academicYear(academicYearName);
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: { user: true, classMemberships: { where: { classGroupId: fromClassGroupId, isCurrent: true }, include: { classGroup: { include: { program: true, academicYear: true } } } } },
    });
    const membership = profile?.classMemberships[0];
    if (!profile || !membership) throw new BadRequestException('Суралцагч одоогийн ангид хамаарахгүй байна');
    const current = membership.classGroup;
    if (!current.programId || current.gradeLevel === null || current.gradeLevel === undefined) throw new BadRequestException('Одоогийн анги program/gradeLevel тохиргоогүй байна');
    const target = toClassGroupId
      ? await this.prisma.classGroup.findUnique({ where: { id: toClassGroupId }, include: { program: true, academicYear: true } })
      : await this.prisma.classGroup.findFirst({ where: { programId: current.programId, cohortYear: current.cohortYear, gradeLevel: current.gradeLevel + 1, academicYearId: year.id }, include: { program: true, academicYear: true } });
    const versions = await this.prisma.curriculumVersion.findMany({ where: { programId: current.programId, academicYearId: year.id, status: 'APPROVED' }, select: { id: true } });
    const required = await this.prisma.curriculumItem.findMany({ where: { curriculumVersionId: { in: versions.map((version) => version.id) }, gradeLevel: current.gradeLevel, isRequired: true }, select: { courseId: true } });
    const completed = await this.prisma.enrollment.findMany({ where: { AND: [{ OR: [{ studentId: studentId }, { studentId }] }, { status: 'COMPLETED' }, { OR: [{ standaloneCourseId: { in: required.map((item) => item.courseId) } }, { curriculumItem: { courseId: { in: required.map((item) => item.courseId) } } }] }] }, select: { standaloneCourseId: true, curriculumItem: { select: { courseId: true } } } });
    const completedIds = new Set(completed.flatMap((item) => [item.standaloneCourseId, item.curriculumItem?.courseId].filter((value): value is string => Boolean(value))));
    return { student: profile.user, profile, membership, current, target, academicYear: year, eligible: required.every((item) => completedIds.has(item.courseId)), completedRequiredCourses: required.filter((item) => completedIds.has(item.courseId)).length, requiredCourseCount: required.length };
  }

  async candidates(query: { fromClassGroupId: string; academicYear: string; toClassGroupId?: string }) {
    const group = await this.prisma.classGroup.findUnique({ where: { id: query.fromClassGroupId }, include: { memberships: { where: { isCurrent: true }, include: { student: { include: { user: true } } } } } });
    if (!group) throw new NotFoundException('Одоогийн анги олдсонгүй');
    const items = await Promise.all(group.memberships.map(async (membership) => {
      const result = await this.evaluate(membership.studentId, group.id, query.academicYear, query.toClassGroupId);
      return { student: result.student, fromClassGroup: result.current, toClassGroup: result.target, eligible: result.eligible && !!result.target, completedRequiredCourses: result.completedRequiredCourses, requiredCourseCount: result.requiredCourseCount, reason: !result.target ? 'Дараагийн анги тохиргоогүй' : result.eligible ? null : 'Заавал судлах хичээл дутуу' };
    }));
    return { fromClassGroup: group, items };
  }

  private async moveMembership(tx: any, studentId: string, fromClassGroupId: string, toClassGroupId: string) {
    await tx.studentClassMembership.updateMany({ where: { studentId, classGroupId: fromClassGroupId, isCurrent: true }, data: { isCurrent: false, endDate: new Date() } });
    const existing = await tx.studentClassMembership.findFirst({ where: { studentId, classGroupId: toClassGroupId, isCurrent: true } });
    if (!existing) await tx.studentClassMembership.create({ data: { studentId, classGroupId: toClassGroupId, startDate: new Date(), isCurrent: true } });
  }

  async approve(data: { studentIds: string[]; fromClassGroupId: string; toClassGroupId: string; academicYear: string }, approverId: string) {
    if (!data.studentIds.length) throw new BadRequestException('Суралцагч сонгоно уу');
    const target = await this.prisma.classGroup.findUnique({ where: { id: data.toClassGroupId } });
    if (!target) throw new NotFoundException('Дараагийн анги олдсонгүй');
    return this.prisma.$transaction(async (tx) => {
      const results: unknown[] = [];
      for (const studentId of data.studentIds) {
        const result = await this.evaluate(studentId, data.fromClassGroupId, data.academicYear, data.toClassGroupId);
        if (!result.eligible) throw new ConflictException(`${result.student.fullName}: заавал судлах хичээл дутуу байна`);
        const promotion = await tx.studentPromotion.upsert({ where: { studentId_academicYearId_fromClassGroupId: { studentId, academicYearId: result.academicYear.id, fromClassGroupId: data.fromClassGroupId } }, create: { studentId, fromClassGroupId: data.fromClassGroupId, toClassGroupId: data.toClassGroupId, academicYearId: result.academicYear.id, eligible: true, completedRequiredCourses: result.completedRequiredCourses, requiredCourseCount: result.requiredCourseCount, status: 'APPROVED', approvedById: approverId, approvedAt: new Date() }, update: { toClassGroupId: data.toClassGroupId, status: 'APPROVED', eligible: true, completedRequiredCourses: result.completedRequiredCourses, requiredCourseCount: result.requiredCourseCount, reason: null, approvedById: approverId, approvedAt: new Date() } });
        await this.moveMembership(tx, studentId, data.fromClassGroupId, data.toClassGroupId);
        results.push(promotion);
      }
      await tx.auditLog.create({ data: { userId: approverId, action: 'STUDENT_PROMOTION_APPROVED', details: { fromClassGroupId: data.fromClassGroupId, toClassGroupId: data.toClassGroupId, studentIds: data.studentIds } } });
      return { count: results.length, promotions: results };
    });
  }

  async reject(data: { studentIds: string[]; fromClassGroupId: string; toClassGroupId?: string; academicYear: string; reason: string }, approverId: string) {
    if (!data.studentIds.length || !data.reason.trim()) throw new BadRequestException('Суралцагч болон шалтгаан заавал байна');
    const rows: unknown[] = [];
    for (const studentId of data.studentIds) {
      const result = await this.evaluate(studentId, data.fromClassGroupId, data.academicYear, data.toClassGroupId);
      rows.push(await this.prisma.studentPromotion.upsert({ where: { studentId_academicYearId_fromClassGroupId: { studentId, academicYearId: result.academicYear.id, fromClassGroupId: data.fromClassGroupId } }, create: { studentId, fromClassGroupId: data.fromClassGroupId, toClassGroupId: result.target?.id, academicYearId: result.academicYear.id, eligible: result.eligible, completedRequiredCourses: result.completedRequiredCourses, requiredCourseCount: result.requiredCourseCount, status: 'REJECTED', reason: data.reason, approvedById: approverId }, update: { status: 'REJECTED', reason: data.reason, approvedById: approverId, approvedAt: new Date() } }));
    }
    return { count: rows.length, promotions: rows };
  }

  async graduate(data: { studentIds: string[]; fromClassGroupId: string; academicYear: string; reason?: string }, approverId: string) {
    if (!data.studentIds.length) throw new BadRequestException('Суралцагч сонгоно уу');
    return this.prisma.$transaction(async (tx) => {
      for (const studentId of data.studentIds) {
        const result = await this.evaluate(studentId, data.fromClassGroupId, data.academicYear);
        if (!result.eligible) throw new ConflictException(`${result.student.fullName}: төгсөх required course дутуу байна`);
        await tx.studentPromotion.create({ data: { studentId, fromClassGroupId: data.fromClassGroupId, academicYearId: result.academicYear.id, eligible: true, completedRequiredCourses: result.completedRequiredCourses, requiredCourseCount: result.requiredCourseCount, status: 'APPROVED', reason: data.reason || 'Төгсөлт', approvedById: approverId, approvedAt: new Date() } });
        await tx.studentClassMembership.updateMany({ where: { studentId, classGroupId: data.fromClassGroupId, isCurrent: true }, data: { isCurrent: false, endDate: new Date() } });
        await tx.studentProfile.update({ where: { userId: studentId }, data: { status: 'GRADUATED', graduatedAt: new Date() } });
      }
      await tx.auditLog.create({ data: { userId: approverId, action: 'STUDENT_GRADUATED', details: { fromClassGroupId: data.fromClassGroupId, studentIds: data.studentIds } } });
      return { count: data.studentIds.length };
    });
  }

  list() { return this.prisma.studentPromotion.findMany({ orderBy: { createdAt: 'desc' }, include: { student: { select: { id: true, fullName: true, code: true } }, fromClassGroup: { select: { id: true, name: true, code: true } }, toClassGroup: { select: { id: true, name: true, code: true } }, approvedBy: { select: { id: true, fullName: true } }, academicYear: true } }); }
}
