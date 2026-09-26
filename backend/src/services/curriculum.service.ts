import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CurriculumVersionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Workbook } from 'exceljs';

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  private async version(id: string) {
    const version = await this.prisma.curriculumVersion.findUnique({ where: { id } });
    if (!version) throw new NotFoundException('Сургалтын төлөвлөгөөний хувилбар олдсонгүй');
    return version;
  }

  private assertDraft(status: CurriculumVersionStatus) {
    if (status !== CurriculumVersionStatus.DRAFT) throw new ConflictException('Зөвхөн DRAFT төлөвтэй хувилбарыг засах боломжтой');
  }

  listAcademicYears() {
    return this.prisma.academicYear.findMany({ orderBy: [{ startDate: 'desc' }, { name: 'desc' }] });
  }

  listCategories() {
    return this.prisma.curriculumCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async listVersions(programId: string) {
    const program = await this.prisma.program.findUnique({ where: { id: programId }, select: { id: true } });
    if (!program) throw new NotFoundException('Хөтөлбөр олдсонгүй');
    const versions = await this.prisma.curriculumVersion.findMany({
      where: { programId },
      orderBy: [{ academicYear: { name: 'desc' } }, { versionNo: 'desc' }, { createdAt: 'desc' }],
      include: { academicYear: true, _count: { select: { items: true } }, program: { select: { id: true, name: true, shortName: true } } },
    });
    return versions;
  }

  async getVersion(id: string) {
    await this.version(id);
    const result = await this.prisma.curriculumVersion.findUnique({
      where: { id },
      include: {
        program: { select: { id: true, name: true, shortName: true, code: true, durationMonths: true, departmentId: true } },
        academicYear: true,
        electiveGroups: { orderBy: { code: 'asc' } },
        items: { orderBy: [{ category: { sortOrder: 'asc' } }, { sequenceNumber: 'asc' }], include: { category: true, course: { select: { id: true, title: true, code: true, departmentId: true } }, electiveGroup: true, semesters: { orderBy: { semesterNumber: 'asc' } } } },
      },
    });
    if (!result) return result;
    const categories = await this.listCategories();
    return { ...result, categories };
  }

  private async resolveAcademicYear(id?: string, legacyName?: string) {
    const year = id
      ? await this.prisma.academicYear.findUnique({ where: { id } })
      : legacyName ? await this.prisma.academicYear.findUnique({ where: { name: legacyName } }) : null;
    if (!year) throw new NotFoundException('Хичээлийн жил олдсонгүй');
    return year;
  }

  async createVersion(programId: string, data: { versionName?: string; academicYearId?: string; academicYear?: string; semesterCount: number }) {
    await this.prisma.program.findUniqueOrThrow({ where: { id: programId } }).catch(() => { throw new NotFoundException('Хөтөлбөр олдсонгүй'); });
    const year = await this.resolveAcademicYear(data.academicYearId, data.academicYear);
    const last = await this.prisma.curriculumVersion.findFirst({ where: { programId, academicYearId: year.id }, orderBy: { versionNo: 'desc' } });
    return this.prisma.curriculumVersion.create({ data: { programId, academicYearId: year.id, versionNo: (last?.versionNo || 0) + 1, versionName: data.versionName, semesterCount: data.semesterCount } });
  }

  async updateVersion(id: string, data: { versionName?: string; academicYearId?: string; academicYear?: string; semesterCount?: number }) {
    const current = await this.version(id); this.assertDraft(current.status);
    const academicYearId = data.academicYearId || data.academicYear ? (await this.resolveAcademicYear(data.academicYearId, data.academicYear)).id : undefined;
    if (data.semesterCount !== undefined) {
      const maxSemester = await this.prisma.curriculumItemSemester.aggregate({ where: { curriculumItem: { curriculumVersionId: id } }, _max: { semesterNumber: true } });
      if ((maxSemester._max.semesterNumber || 0) > data.semesterCount) throw new ConflictException('Одоо ашиглагдаж буй улирлаас бага тоо сонгох боломжгүй');
    }
    if (academicYearId && academicYearId !== current.academicYearId) {
      const duplicate = await this.prisma.curriculumVersion.findFirst({ where: { programId: current.programId, academicYearId, versionNo: current.versionNo, NOT: { id } } });
      if (duplicate) throw new ConflictException('Энэ хичээлийн жилд ижил хувилбарын дугаар байна');
    }
    return this.prisma.curriculumVersion.update({ where: { id }, data: { versionName: data.versionName?.trim(), academicYearId, semesterCount: data.semesterCount } });
  }

  async duplicateVersion(id: string, data: { versionName?: string; academicYearId?: string; academicYear?: string; semesterCount?: number }) {
    const source = await this.getVersion(id);
    const year = data.academicYearId || data.academicYear
      ? await this.resolveAcademicYear(data.academicYearId, data.academicYear)
      : await this.prisma.academicYear.findUnique({ where: { id: source!.academicYear.id } });
    if (!year) throw new NotFoundException('Эх хувилбарын хичээлийн жил олдсонгүй');
    return this.prisma.$transaction(async (tx) => {
      const last = await tx.curriculumVersion.findFirst({ where: { programId: source!.programId, academicYearId: year.id }, orderBy: { versionNo: 'desc' } });
      const version = await tx.curriculumVersion.create({ data: { programId: source!.programId, academicYearId: year.id, versionNo: (last?.versionNo || 0) + 1, versionName: data.versionName, semesterCount: data.semesterCount || source!.semesterCount } });
      const categoryMap = new Map<string, string>();
      for (const category of [...new Map(source!.items.map((item) => [item.category.id, item.category])).values()]) {
        const copy = await tx.curriculumCategory.upsert({ where: { code: category.code }, create: { name: category.name, code: category.code, sortOrder: category.sortOrder }, update: { name: category.name, sortOrder: category.sortOrder } });
        categoryMap.set(category.id, copy.id);
      }
      const electiveMap = new Map<string, string>();
      for (const group of source!.electiveGroups) {
        const copy = await tx.electiveGroup.create({ data: { curriculumVersionId: version.id, code: group.code, name: group.name, minimumCredits: group.minimumCredits, minimumCourseCount: group.minimumCourseCount, selectionType: group.selectionType } });
        electiveMap.set(group.id, copy.id);
      }
      for (const item of source!.items) {
        const copy = await tx.curriculumItem.create({ data: { curriculumVersionId: version.id, categoryId: categoryMap.get(item.categoryId)!, courseId: item.courseId, electiveGroupId: item.electiveGroupId ? electiveMap.get(item.electiveGroupId) : undefined, sequenceNumber: item.sequenceNumber, gradeLevel: item.gradeLevel, theoryHours: item.theoryHours, schoolPracticeHours: item.schoolPracticeHours, workplacePracticeHours: item.workplacePracticeHours, isRequired: item.isRequired, notes: item.notes } });
        if (item.semesters.length) await tx.curriculumItemSemester.createMany({ data: item.semesters.map((semester) => ({ curriculumItemId: copy.id, semesterNumber: semester.semesterNumber, credits: semester.credits, hours: semester.hours })) });
      }
      return version;
    });
  }

  async addCategory(versionId: string, data: { name: string; code: string; sortOrder?: number }) {
    const version = await this.version(versionId); this.assertDraft(version.status);
    return this.prisma.curriculumCategory.upsert({
      where: { code: data.code.trim().toUpperCase() },
      create: { name: data.name.trim(), code: data.code.trim().toUpperCase(), sortOrder: data.sortOrder ?? 0 },
      update: { name: data.name.trim(), sortOrder: data.sortOrder ?? 0 },
    });
  }

  async addElectiveGroup(versionId: string, data: { code: string; name: string; minimumCredits?: number; minimumCourseCount?: number; selectionType?: 'CREDIT_REQUIREMENT' | 'COURSE_COUNT' }) {
    const version = await this.version(versionId); this.assertDraft(version.status);
    return this.prisma.electiveGroup.create({ data: { curriculumVersionId: versionId, ...data, code: data.code.toUpperCase() } });
  }

  async addItem(versionId: string, data: {
    categoryId: string; courseId: string; sequenceNumber: number; gradeLevel?: number; theoryHours?: number;
    schoolPracticeHours?: number; workplacePracticeHours?: number; isRequired?: boolean; electiveGroupId?: string;
    notes?: string; semesterAllocations?: Array<{ semesterNumber: number; credits: number; hours?: number }>;
  }) {
    const version = await this.prisma.curriculumVersion.findUnique({ where: { id: versionId }, include: { program: true } });
    if (!version) throw new NotFoundException('Сургалтын төлөвлөгөөний хувилбар олдсонгүй'); this.assertDraft(version.status);
    const [category, course] = await Promise.all([this.prisma.curriculumCategory.findUnique({ where: { id: data.categoryId } }), this.prisma.course.findUnique({ where: { id: data.courseId } })]);
    if (!category) throw new NotFoundException('Ангилал олдсонгүй');
    if (!course) throw new NotFoundException('Хичээл олдсонгүй');
    if (!data.isRequired && !data.electiveGroupId) throw new ConflictException('Сонгон хичээлд сонгон бүлэг заавал сонгоно');
    const allocations = data.semesterAllocations || [];
    const semesterNumbers = allocations.map((item) => item.semesterNumber);
    if (new Set(semesterNumbers).size !== semesterNumbers.length) throw new ConflictException('Нэг улирлыг давхар оруулах боломжгүй');
    if (allocations.some((item) => item.semesterNumber < 1 || item.semesterNumber > version.semesterCount)) throw new ConflictException('Улирлын дугаар төлөвлөгөөний хязгаараас хэтэрсэн');
    if (allocations.some((item) => item.credits < 0 || (item.hours ?? 0) < 0)) throw new ConflictException('Кредит болон цаг сөрөг байж болохгүй');
    const duplicate = await this.prisma.curriculumItem.findFirst({ where: { curriculumVersionId: versionId, courseId: data.courseId } });
    if (duplicate) throw new ConflictException('Энэ курс curriculum-д аль хэдийн бүртгэгдсэн байна');
    const sequenceDuplicate = await this.prisma.curriculumItem.findFirst({ where: { curriculumVersionId: versionId, sequenceNumber: data.sequenceNumber } });
    if (sequenceDuplicate) throw new ConflictException('Дарааллын дугаар давхардаж байна');
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.curriculumItem.create({ data: { curriculumVersionId: versionId, categoryId: data.categoryId, courseId: data.courseId, sequenceNumber: data.sequenceNumber, gradeLevel: data.gradeLevel, theoryHours: data.theoryHours ?? 0, schoolPracticeHours: data.schoolPracticeHours ?? 0, workplacePracticeHours: data.workplacePracticeHours ?? 0, isRequired: data.isRequired ?? true, electiveGroupId: data.electiveGroupId, notes: data.notes?.trim() || undefined } });
      if (allocations.length) await tx.curriculumItemSemester.createMany({ data: allocations.map((allocation) => ({ curriculumItemId: item.id, semesterNumber: allocation.semesterNumber, credits: allocation.credits, hours: allocation.hours ?? 0 })) });
      return tx.curriculumItem.findUnique({ where: { id: item.id }, include: { category: true, course: { select: { id: true, title: true, code: true } }, semesters: { orderBy: { semesterNumber: 'asc' } } } });
    });
  }

  async updateItem(id: string, data: {
    categoryId?: string; courseId?: string; sequenceNumber?: number; gradeLevel?: number; theoryHours?: number;
    schoolPracticeHours?: number; workplacePracticeHours?: number; isRequired?: boolean; electiveGroupId?: string | null;
    notes?: string; semesterAllocations?: Array<{ semesterNumber: number; credits: number; hours?: number }>;
  }) {
    const current = await this.prisma.curriculumItem.findUnique({ where: { id }, include: { curriculumVersion: { include: { program: true } } } });
    if (!current) throw new NotFoundException('Төлөвлөгөөний мөр олдсонгүй'); this.assertDraft(current.curriculumVersion.status);
    const version = current.curriculumVersion;
    const nextCourseId = data.courseId || current.courseId;
    const course = await this.prisma.course.findUnique({ where: { id: nextCourseId }, select: { id: true, departmentId: true } });
    if (!course) throw new NotFoundException('Хичээл олдсонгүй');
    if (data.isRequired === false && !data.electiveGroupId && !current.electiveGroupId) throw new ConflictException('Сонгон хичээлд сонгон бүлэг заавал сонгоно');
    const allocations = data.semesterAllocations;
    if (allocations) {
      const numbers = allocations.map((item) => item.semesterNumber);
      if (new Set(numbers).size !== numbers.length || allocations.some((item) => item.semesterNumber < 1 || item.semesterNumber > version.semesterCount || item.credits < 0 || (item.hours ?? 0) < 0)) throw new ConflictException('Улирлын хуваарилалт буруу байна');
    }
    const duplicate = await this.prisma.curriculumItem.findFirst({ where: { curriculumVersionId: version.id, courseId: nextCourseId, NOT: { id } } });
    if (duplicate) throw new ConflictException('Энэ курс curriculum-д аль хэдийн бүртгэгдсэн байна');
    const sequenceDuplicate = data.sequenceNumber === undefined ? null : await this.prisma.curriculumItem.findFirst({ where: { curriculumVersionId: version.id, sequenceNumber: data.sequenceNumber, NOT: { id } } });
    if (sequenceDuplicate) throw new ConflictException('Дарааллын дугаар давхардаж байна');
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.curriculumItem.update({ where: { id }, data: { categoryId: data.categoryId, courseId: data.courseId, sequenceNumber: data.sequenceNumber, gradeLevel: data.gradeLevel, theoryHours: data.theoryHours, schoolPracticeHours: data.schoolPracticeHours, workplacePracticeHours: data.workplacePracticeHours, isRequired: data.isRequired, electiveGroupId: data.electiveGroupId, notes: data.notes?.trim() } });
      if (allocations) { await tx.curriculumItemSemester.deleteMany({ where: { curriculumItemId: id } }); if (allocations.length) await tx.curriculumItemSemester.createMany({ data: allocations.map((allocation) => ({ curriculumItemId: id, semesterNumber: allocation.semesterNumber, credits: allocation.credits, hours: allocation.hours ?? 0 })) }); }
      return item;
    });
  }

  async removeItem(id: string) {
    const current = await this.prisma.curriculumItem.findUnique({ where: { id }, include: { curriculumVersion: true } });
    if (!current) throw new NotFoundException('Төлөвлөгөөний мөр олдсонгүй'); this.assertDraft(current.curriculumVersion.status);
    await this.prisma.curriculumItem.delete({ where: { id } }); return { deleted: true, id };
  }

  async addSemester(itemId: string, data: { semesterNumber: number; credits: number; hours?: number }) {
    const item = await this.prisma.curriculumItem.findUnique({ where: { id: itemId }, include: { curriculumVersion: true } });
    if (!item) throw new NotFoundException('Төлөвлөгөөний мөр олдсонгүй'); this.assertDraft(item.curriculumVersion.status);
    if (data.semesterNumber > item.curriculumVersion.semesterCount) throw new ConflictException('Улирлын дугаар төлөвлөгөөний хязгаараас хэтэрсэн');
    return this.prisma.curriculumItemSemester.create({ data: { semesterNumber: data.semesterNumber, credits: data.credits, hours: data.hours, curriculumItemId: itemId } });
  }

  async removeSemester(id: string) {
    const current = await this.prisma.curriculumItemSemester.findUnique({ where: { id }, include: { curriculumItem: { include: { curriculumVersion: true } } } });
    if (!current) throw new NotFoundException('Улирлын хуваарилалт олдсонгүй'); this.assertDraft(current.curriculumItem.curriculumVersion.status);
    await this.prisma.curriculumItemSemester.delete({ where: { id } }); return { deleted: true, id };
  }

  async summary(id: string) {
    const version = await this.getVersion(id); const items = version!.items;
    return { totalItems: items.length, totalCredits: items.reduce((sum, item) => sum + item.semesters.reduce((sum, semester) => sum + semester.credits, 0), 0), theoryHours: items.reduce((sum, item) => sum + item.theoryHours, 0), schoolPracticeHours: items.reduce((sum, item) => sum + item.schoolPracticeHours, 0), workplacePracticeHours: items.reduce((sum, item) => sum + item.workplacePracticeHours, 0), requiredCredits: items.filter((item) => item.isRequired).reduce((sum, item) => sum + item.semesters.reduce((sum, semester) => sum + semester.credits, 0), 0), semesterCredits: Array.from({ length: version!.semesterCount }, (_, index) => items.reduce((sum, item) => sum + (item.semesters.find((semester) => semester.semesterNumber === index + 1)?.credits || 0), 0)) };
  }

  async validate(id: string) {
    const version = await this.getVersion(id); const errors: Array<{ type: string; itemId?: string; message: string }> = [];
    const items = version!.items;
    if (!items.length) errors.push({ type: 'EMPTY_VERSION', message: 'Төлөвлөгөөнд дор хаяж нэг хичээл нэмнэ үү' });
    const sequences = new Set<number>();
    const semesterCredits = Array.from({ length: version!.semesterCount }, () => 0);
    for (const item of items) {
      if (sequences.has(item.sequenceNumber)) errors.push({ type: 'DUPLICATE_SEQUENCE', itemId: item.id, message: `${item.sequenceNumber}-р дараалал давхардаж байна` });
      sequences.add(item.sequenceNumber);
      if (!item.semesters.length) errors.push({ type: 'MISSING_SEMESTER', itemId: item.id, message: `${item.course.title} улирлын хуваарилалтгүй байна` });
      let total = 0;
      for (const semester of item.semesters) {
        if (semester.semesterNumber < 1 || semester.semesterNumber > version!.semesterCount) errors.push({ type: 'INVALID_SEMESTER', itemId: item.id, message: `${item.course.title} буруу улирлын дугаартай байна` });
        if (semester.credits < 0) errors.push({ type: 'NEGATIVE_CREDIT', itemId: item.id, message: `${item.course.title} сөрөг кредиттэй байна` });
        total += semester.credits;
        if (semester.semesterNumber >= 1 && semester.semesterNumber <= version!.semesterCount) semesterCredits[semester.semesterNumber - 1] += semester.credits;
      }
      if (total <= 0) errors.push({ type: 'ZERO_CREDIT', itemId: item.id, message: `${item.course.title} нийт кредитгүй байна` });
      if (!item.isRequired && !item.electiveGroupId) errors.push({ type: 'MISSING_ELECTIVE_GROUP', itemId: item.id, message: `${item.course.title} сонгон бүлэггүй байна` });
    }
    return { valid: errors.length === 0, errors, summary: { totalItems: items.length, totalCredits: semesterCredits.reduce((sum, value) => sum + value, 0), requiredCredits: items.filter((item) => item.isRequired).reduce((sum, item) => sum + item.semesters.reduce((inner, semester) => inner + semester.credits, 0), 0), semesterCredits } };
  }

  async approve(id: string, approvedById: string) {
    const version = await this.version(id); this.assertDraft(version.status);
    const existing = await this.prisma.curriculumVersion.findFirst({ where: { programId: version.programId, academicYearId: version.academicYearId, status: CurriculumVersionStatus.APPROVED, NOT: { id } } });
    if (existing) throw new ConflictException('Энэ хөтөлбөр, хичээлийн жилд аль хэдийн батлагдсан төлөвлөгөө байна');
    const result = await this.validate(id); if (!result.valid) throw new ConflictException(result.errors.map((error) => error.message));
    return this.prisma.curriculumVersion.update({ where: { id }, data: { status: CurriculumVersionStatus.APPROVED, approvedById, approvedAt: new Date() } });
  }

  async archive(id: string) { await this.version(id); return this.prisma.curriculumVersion.update({ where: { id }, data: { status: CurriculumVersionStatus.ARCHIVED } }); }

  async exportWorkbook(id: string) {
    const version = await this.getVersion(id); const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Plan');
    sheet.addRow(['№', 'Ангилал', 'Хичээлийн код', 'Хичээлийн нэр', 'Онол', 'СДД', 'ҮДД', 'Required', 'I', 'II', 'III', 'IV', 'V', 'VI', 'Тайлбар']);
    for (const item of version!.items) sheet.addRow([item.sequenceNumber, item.category.code, item.course.code, item.course.title, item.theoryHours, item.schoolPracticeHours, item.workplacePracticeHours, item.isRequired, ...Array.from({ length: Math.max(6, version!.semesterCount) }, (_, i) => item.semesters.find((s) => s.semesterNumber === i + 1)?.credits || 0), item.notes || '']);
    sheet.getRow(1).font = { bold: true }; sheet.views = [{ state: 'frozen', ySplit: 1 }];
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async templateWorkbook(id: string) {
    const version = await this.version(id);
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Plan');
    const semesterHeaders = Array.from({ length: Math.max(6, version!.semesterCount) }, (_, index) => String.fromCharCode(73 + index));
    sheet.addRow(['№', 'Ангилал', 'Ангиллын нэр', 'Хичээлийн код', 'Хичээлийн нэр', 'Онол', 'СДД', 'ҮДД', 'Required', ...semesterHeaders, 'Тайлбар']);
    sheet.addRow([1, 'GENERAL', 'Ерөнхий суурь', 'COURSE-CODE', 'Курсын нэр', 0, 0, 0, true, ...semesterHeaders.map(() => 0), 'Энэ мөрийг өөрийн мэдээллээр солино уу']);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    sheet.getRow(2).font = { italic: true, color: { argb: 'FF64748B' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.columns.forEach((column) => { column.width = 18; });
    const instructions = workbook.addWorksheet('Заавар');
    instructions.addRows([
      ['Curriculum импортын заавар'],
      ['1. Plan sheet-ийн жишээ мөрийг устгаж, өөрийн мөрүүдийг оруулна.'],
      ['2. Ангилал болон хичээлийн код нь системд бүртгэлтэй байх ёстой.'],
      ['3. Required баганад TRUE/FALSE эсвэл 1/0 ашиглана.'],
      ['4. Улирлын кредитийг I, II, III... баганад оруулна.'],
      ['5. Эхлээд Import preview хийж алдааг шалгаад дараа нь Import commit дарна.'],
    ]);
    instructions.getRow(1).font = { bold: true };
    instructions.getColumn(1).width = 100;
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async importPreview(id: string, buffer: Buffer) {
    const version = await this.version(id); const workbook = new Workbook(); await workbook.xlsx.load(buffer as any); const sheet = workbook.worksheets[0];
    if (!sheet) throw new ConflictException('Excel sheet олдсонгүй');
    const headerMap = new Map<string, number>(); const headerAliases: Record<string, string[]> = { sequenceNumber: ['№', 'sequenceNumber', 'дараалал'], categoryCode: ['ангилал', 'category', 'categoryCode'], categoryName: ['categoryName', 'ангиллын нэр'], courseCode: ['хичээлийн код', 'course code', 'courseCode'], gradeLevel: ['gradeLevel', 'түвшин', 'курс'], theoryHours: ['онол', 'theoryHours'], schoolPracticeHours: ['сдд', 'schoolPracticeHours'], workplacePracticeHours: ['үдд', 'workplacePracticeHours'], isRequired: ['required', 'isRequired'], notes: ['тайлбар', 'notes'] };
    const first = sheet.getRow(1); first.eachCell((cell, index) => headerMap.set(String(cell.value ?? '').trim().toLowerCase(), index));
    const findIndex = (key: string, fallback: number) => headerAliases[key].map((alias) => headerMap.get(alias.toLowerCase())).find((index) => index !== undefined) || fallback;
    const optionalValue = (row: any, key: string) => { const index = headerAliases[key].map((alias) => headerMap.get(alias.toLowerCase())).find((value) => value !== undefined); return index ? String(row.getCell(index).value ?? '').trim() : ''; };
    const rows: Array<Record<string, unknown>> = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const value = (index: number) => String(row.getCell(index).value ?? '').trim();
      const semesterCredits = Array.from({ length: version.semesterCount }, (_, index) => Number(value(9 + index) || 0));
      const item: any = { row: rowNumber, sequenceNumber: Number(value(findIndex('sequenceNumber', 1)) || rowNumber - 1), categoryCode: value(findIndex('categoryCode', 2)).toUpperCase(), categoryName: value(findIndex('categoryName', 2)), courseCode: value(findIndex('courseCode', 3)).toUpperCase(), gradeLevel: Number(optionalValue(row, 'gradeLevel') || 0) || undefined, theoryHours: Number(value(findIndex('theoryHours', 5)) || 0), schoolPracticeHours: Number(value(findIndex('schoolPracticeHours', 6)) || 0), workplacePracticeHours: Number(value(findIndex('workplacePracticeHours', 7)) || 0), isRequired: value(findIndex('isRequired', 8)).toLowerCase() !== 'false' && value(findIndex('isRequired', 8)) !== '0', semesterCredits, notes: value(findIndex('notes', 15)), errors: [] as string[] };
      if (!item.categoryCode) item.errors.push('Ангиллын код хоосон');
      if (!item.courseCode) item.errors.push('Хичээлийн код хоосон');
      if (item.sequenceNumber < 1) item.errors.push('Дарааллын дугаар буруу');
      if (semesterCredits.some((credit) => credit < 0)) item.errors.push('Сөрөг кредит байна');
      item.valid = item.errors.length === 0; rows.push(item);
    });
    return { totalRows: rows.length, validCount: rows.filter((row: any) => row.valid).length, invalidCount: rows.filter((row: any) => !row.valid).length, rows };
  }

  async importRows(id: string, rows: Array<Record<string, unknown>>) {
    const version = await this.prisma.curriculumVersion.findUnique({ where: { id }, include: { program: true } });
    if (!version) throw new NotFoundException('Сургалтын төлөвлөгөөний хувилбар олдсонгүй'); this.assertDraft(version.status);
    return this.prisma.$transaction(async (tx) => {
      let imported = 0;
      for (const row of rows) {
        const categoryCode = String(row.categoryCode || row.category || '').trim().toUpperCase();
        const courseCode = String(row.courseCode || '').trim().toUpperCase();
        if (!categoryCode || !courseCode) throw new ConflictException(`Импортын мөр ${imported + 2}: ангилал болон курсийн код заавал байна`);
        const sequenceNumber = Number(row.sequenceNumber || imported + 1);
        const semesterCredits = Array.isArray(row.semesterCredits) ? row.semesterCredits : [row.I, row.II, row.III, row.IV, row.V, row.VI];
        if (semesterCredits.length > version.semesterCount) throw new ConflictException(`Импортын мөр ${imported + 2}: улирлын тоо хэтэрсэн`);
        if (await tx.curriculumItem.findFirst({ where: { curriculumVersionId: id, course: { code: courseCode } } })) throw new ConflictException(`Давхар курс импортлох гэж байна: ${courseCode}`);
        if (await tx.curriculumItem.findFirst({ where: { curriculumVersionId: id, sequenceNumber } })) throw new ConflictException(`Давхар дарааллын дугаар: ${sequenceNumber}`);
        const category = await tx.curriculumCategory.upsert({ where: { code: categoryCode }, create: { code: categoryCode, name: String(row.categoryName || categoryCode), sortOrder: Number(row.sortOrder || imported) }, update: {} });
        const course = await tx.course.findUnique({ where: { code: courseCode } });
        if (!course) throw new ConflictException(`Хичээл олдсонгүй: ${courseCode}`);
        const created = await tx.curriculumItem.create({ data: { curriculumVersionId: id, categoryId: category.id, courseId: course.id, sequenceNumber, gradeLevel: row.gradeLevel ? Number(row.gradeLevel) : undefined, theoryHours: Number(row.theoryHours || row.theory || 0), schoolPracticeHours: Number(row.schoolPracticeHours || row.schoolPractice || 0), workplacePracticeHours: Number(row.workplacePracticeHours || row.workplacePractice || 0), isRequired: row.isRequired !== false && row.isRequired !== 'false', notes: row.notes ? String(row.notes) : undefined } });
        await tx.curriculumItemSemester.createMany({ data: semesterCredits.map((credits, index) => ({ curriculumItemId: created.id, semesterNumber: index + 1, credits: Number(credits || 0) })).filter((semester) => semester.credits > 0) });
        imported += 1;
      }
      return { imported };
    });
  }
}
