import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LibraryAccessAction, LibraryBookStatus, MediaAssetType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../services/media.service';
import { CreateLibraryBookDto } from './dto/create-library-book.dto';
import { UpdateLibraryBookDto } from './dto/update-library-book.dto';
import { CreateLibraryCategoryDto } from './dto/create-library-category.dto';
import { CreateLibraryTagDto } from './dto/create-library-tag.dto';

@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  private activeEnrollment(studentId: string, courseId: string) {
    const now = new Date();
    return this.prisma.enrollment.count({
      where: {
        studentId,
        status: 'ACTIVE',
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        AND: [{ OR: [{ standaloneCourseId: courseId }, { curriculumItem: { courseId } }] }],
      },
    });
  }

  private async canAccessBook(book: any, userId: string, roles: Role[]) {
    if (roles.includes(Role.ADMIN) || roles.includes(Role.MANAGER)) return true;
    if (book.status !== LibraryBookStatus.PUBLISHED) return false;

    const isGlobal = book.courses.length === 0 && book.programs.length === 0;
    if (isGlobal) return true;

    for (const relation of book.courses) {
      if (await this.activeEnrollment(userId, relation.courseId)) return true;
    }

    if (book.programs.length) {
      const membership = await this.prisma.studentClassMembership.findFirst({
        where: {
          studentId: userId,
          isCurrent: true,
          classGroup: { programId: { in: book.programs.map((item: any) => item.programId) } },
        },
      });
      if (membership) return true;
    }
    return false;
  }

  private bookInclude() {
    return {
      pdfAsset: true,
      coverAsset: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      courses: { include: { course: { select: { id: true, code: true, title: true } } } },
      programs: { include: { program: { select: { id: true, code: true, name: true } } } },
      createdBy: { select: { id: true, fullName: true, code: true } },
      approvedBy: { select: { id: true, fullName: true, code: true } },
    } as const;
  }

  private mapBook(book: any, accessType?: 'GLOBAL' | 'COURSE') {
    const isGlobal = book.courses.length === 0 && book.programs.length === 0;
    return {
      id: book.id,
      title: book.title,
      subtitle: book.subtitle,
      author: book.author,
      isbn: book.isbn,
      publisher: book.publisher,
      publishedYear: book.publishedYear,
      language: book.language,
      description: book.description,
      status: book.status,
      downloadAllowed: book.downloadAllowed,
      coverUrl: book.coverAsset?.publicUrl || null,
      pdfFileName: book.pdfAsset?.originalName,
      categories: book.categories.map((item: any) => item.category),
      tags: book.tags.map((item: any) => item.tag),
      courses: book.courses.map((item: any) => item.course),
      programs: book.programs.map((item: any) => item.program),
      accessType: accessType || (isGlobal ? 'GLOBAL' : 'COURSE'),
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }

  async listBooks(userId: string, roles: Role[], query: {
    q?: string; categoryId?: string; courseId?: string; programId?: string; author?: string;
    language?: string; page?: string; pageSize?: string; manage?: boolean;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)));
    const search = query.q?.trim();
    const where: Prisma.LibraryBookWhereInput = {
      ...(query.manage ? {} : { status: LibraryBookStatus.PUBLISHED }),
      ...(query.author ? { author: { contains: query.author, mode: 'insensitive' } } : {}),
      ...(query.language ? { language: query.language } : {}),
      ...(query.categoryId ? { categories: { some: { categoryId: query.categoryId } } } : {}),
      ...(query.courseId ? { courses: { some: { courseId: query.courseId } } } : {}),
      ...(query.programId ? { programs: { some: { programId: query.programId } } } : {}),
      ...(search ? { OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { subtitle: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
        { publisher: { contains: search, mode: 'insensitive' } },
      ] } : {}),
    };

    if (query.manage && roles.includes(Role.TEACHER) && !roles.includes(Role.ADMIN) && !roles.includes(Role.MANAGER)) {
      where.createdById = userId;
    }

    const rows = await this.prisma.libraryBook.findMany({
      where,
      include: this.bookInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });

    const allowed = query.manage
      ? rows
      : (await Promise.all(rows.map(async (book) => (await this.canAccessBook(book, userId, roles)) ? book : null))).filter(Boolean);

    const total = allowed.length;
    const items = allowed.slice((page - 1) * pageSize, page * pageSize).map((book: any) => this.mapBook(book));
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getBook(id: string, userId: string, roles: Role[], manage = false) {
    const book = await this.prisma.libraryBook.findUnique({ where: { id }, include: this.bookInclude() });
    if (!book) throw new NotFoundException('Ном олдсонгүй');
    if (!manage && !(await this.canAccessBook(book, userId, roles))) {
      throw new ForbiddenException('Энэ номыг үзэх эрхгүй байна');
    }
    return this.mapBook(book);
  }

  private async validateAssets(data: CreateLibraryBookDto | UpdateLibraryBookDto) {
    if (data.pdfAssetId) {
      const pdf = await this.prisma.mediaAsset.findUnique({ where: { id: data.pdfAssetId } });
      if (!pdf || pdf.type !== MediaAssetType.PDF || pdf.mimeType !== 'application/pdf') {
        throw new BadRequestException('pdfAssetId нь хүчинтэй PDF MediaAsset байх ёстой');
      }
    }
    if (data.coverAssetId) {
      const cover = await this.prisma.mediaAsset.findUnique({ where: { id: data.coverAssetId } });
      if (!cover || cover.type !== MediaAssetType.IMAGE) {
        throw new BadRequestException('coverAssetId нь хүчинтэй зураг байх ёстой');
      }
    }
  }

  private async validateTeacherCourses(userId: string, roles: Role[], courseIds: string[] = [], programIds: string[] = []) {
    if (!roles.includes(Role.TEACHER) || roles.includes(Role.ADMIN) || roles.includes(Role.MANAGER)) return;
    if (!courseIds.length || programIds.length) throw new ForbiddenException('Багш зөвхөн өөрийн course-тэй холбоотой ном үүсгэнэ');
    const owned = await this.prisma.courseTeacher.count({ where: { teacherId: userId, courseId: { in: courseIds } } });
    if (owned !== courseIds.length) throw new ForbiddenException('Сонгосон course дотор таны заадаггүй course байна');
  }

  private async connectTags(tx: Prisma.TransactionClient, names: string[] = []) {
    const ids: string[] = [];
    for (const raw of names.map((name) => name.trim()).filter(Boolean)) {
      const tag = await tx.libraryTag.upsert({ where: { name: raw }, create: { name: raw }, update: {} });
      ids.push(tag.id);
    }
    return ids;
  }

  async createBook(userId: string, roles: Role[], data: CreateLibraryBookDto) {
    await this.validateAssets(data);
    await this.validateTeacherCourses(userId, roles, data.courseIds, data.programIds);
    if (data.isbn) {
      const duplicate = await this.prisma.libraryBook.findFirst({ where: { isbn: data.isbn } });
      if (duplicate) throw new ConflictException('Энэ ISBN аль хэдийн бүртгэгдсэн байна');
    }

    return this.prisma.$transaction(async (tx) => {
      const tagIds = await this.connectTags(tx, data.tagNames);
      const book = await tx.libraryBook.create({
        data: {
          title: data.title.trim(),
          subtitle: data.subtitle?.trim(),
          author: data.author?.trim(),
          isbn: data.isbn?.trim(),
          publisher: data.publisher?.trim(),
          publishedYear: data.publishedYear,
          language: data.language?.trim() || 'mn',
          description: data.description?.trim(),
          pdfAssetId: data.pdfAssetId,
          coverAssetId: data.coverAssetId,
          downloadAllowed: data.downloadAllowed,
          createdById: userId,
          status: roles.includes(Role.ADMIN) || roles.includes(Role.MANAGER) ? LibraryBookStatus.DRAFT : LibraryBookStatus.DRAFT,
          categories: { create: (data.categoryIds || []).map((categoryId) => ({ categoryId })) },
          courses: { create: (data.courseIds || []).map((courseId) => ({ courseId })) },
          programs: { create: (data.programIds || []).map((programId) => ({ programId })) },
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
        include: this.bookInclude(),
      });
      return this.mapBook(book);
    });
  }

  async updateBook(id: string, userId: string, roles: Role[], data: UpdateLibraryBookDto) {
    const existing = await this.prisma.libraryBook.findUnique({ where: { id }, include: { courses: true } });
    if (!existing) throw new NotFoundException('Ном олдсонгүй');
    if (roles.includes(Role.TEACHER) && !roles.includes(Role.ADMIN) && !roles.includes(Role.MANAGER) && existing.createdById !== userId) {
      throw new ForbiddenException('Та энэ номыг засах эрхгүй байна');
    }
    await this.validateAssets(data);
    await this.validateTeacherCourses(userId, roles, data.courseIds, data.programIds);
    if (data.isbn) {
      const duplicate = await this.prisma.libraryBook.findFirst({ where: { isbn: data.isbn, NOT: { id } } });
      if (duplicate) throw new ConflictException('Энэ ISBN аль хэдийн бүртгэгдсэн байна');
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.categoryIds) await tx.libraryBookCategory.deleteMany({ where: { bookId: id } });
      if (data.courseIds) await tx.libraryBookCourse.deleteMany({ where: { bookId: id } });
      if (data.programIds) await tx.libraryBookProgram.deleteMany({ where: { bookId: id } });
      if (data.tagNames) {
        await tx.libraryBookTag.deleteMany({ where: { bookId: id } });
        const tagIds = await this.connectTags(tx, data.tagNames);
        await tx.libraryBookTag.createMany({ data: tagIds.map((tagId) => ({ bookId: id, tagId })) });
      }
      const updated = await tx.libraryBook.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title.trim() } : {}),
          ...(data.subtitle !== undefined ? { subtitle: data.subtitle?.trim() } : {}),
          ...(data.author !== undefined ? { author: data.author?.trim() } : {}),
          ...(data.isbn !== undefined ? { isbn: data.isbn?.trim() } : {}),
          ...(data.publisher !== undefined ? { publisher: data.publisher?.trim() } : {}),
          ...(data.publishedYear !== undefined ? { publishedYear: data.publishedYear } : {}),
          ...(data.language !== undefined ? { language: data.language.trim() } : {}),
          ...(data.description !== undefined ? { description: data.description?.trim() } : {}),
          ...(data.pdfAssetId !== undefined ? { pdfAssetId: data.pdfAssetId } : {}),
          ...(data.coverAssetId !== undefined ? { coverAssetId: data.coverAssetId } : {}),
          ...(data.downloadAllowed !== undefined ? { downloadAllowed: data.downloadAllowed } : {}),
          ...(roles.includes(Role.TEACHER) && !roles.includes(Role.ADMIN) && !roles.includes(Role.MANAGER) ? { status: LibraryBookStatus.DRAFT, approvedById: null, approvedAt: null } : {}),
        },
      });
      if (data.categoryIds) await tx.libraryBookCategory.createMany({ data: data.categoryIds.map((categoryId) => ({ bookId: id, categoryId })) });
      if (data.courseIds) await tx.libraryBookCourse.createMany({ data: data.courseIds.map((courseId) => ({ bookId: id, courseId })) });
      if (data.programIds) await tx.libraryBookProgram.createMany({ data: data.programIds.map((programId) => ({ bookId: id, programId })) });
      const final = await tx.libraryBook.findUnique({ where: { id: updated.id }, include: this.bookInclude() });
      return this.mapBook(final);
    });
  }

  async publishBook(id: string, userId: string) {
    const book = await this.prisma.libraryBook.findUnique({ where: { id }, select: { id: true, pdfAssetId: true } });
    if (!book) throw new NotFoundException('Ном олдсонгүй');
    return this.prisma.libraryBook.update({ where: { id }, data: { status: LibraryBookStatus.PUBLISHED, approvedById: userId, approvedAt: new Date(), archivedAt: null } });
  }

  async archiveBook(id: string, userId: string, roles: Role[]) {
    const book = await this.prisma.libraryBook.findUnique({ where: { id }, select: { id: true, createdById: true } });
    if (!book) throw new NotFoundException('Ном олдсонгүй');
    if (roles.includes(Role.TEACHER) && !roles.includes(Role.ADMIN) && !roles.includes(Role.MANAGER) && book.createdById !== userId) throw new ForbiddenException('Та энэ номыг archive хийх эрхгүй');
    return this.prisma.libraryBook.update({ where: { id }, data: { status: LibraryBookStatus.ARCHIVED, archivedAt: new Date() } });
  }

  async restoreBook(id: string) {
    return this.prisma.libraryBook.update({ where: { id }, data: { status: LibraryBookStatus.DRAFT, archivedAt: null, approvedAt: null, approvedById: null } });
  }

  async getPdfStream(id: string, userId: string, roles: Role[], download = false) {
    const book = await this.prisma.libraryBook.findUnique({
      where: { id },
      include: { courses: true, programs: true, pdfAsset: true },
    });
    if (!book) throw new NotFoundException('Ном олдсонгүй');
    if (!(await this.canAccessBook(book, userId, roles))) {
      throw new ForbiddenException('Энэ номыг үзэх эрхгүй байна');
    }
    if (download && !book.downloadAllowed && !roles.includes(Role.ADMIN) && !roles.includes(Role.MANAGER)) {
      throw new ForbiddenException('Энэ номыг татах эрх хаалттай байна');
    }
    const stream = await this.media.getObjectStream(book.pdfAsset.objectKey);
    await this.prisma.libraryBookAccessLog.create({
      data: { bookId: id, userId, action: download ? LibraryAccessAction.DOWNLOAD : LibraryAccessAction.VIEW },
    });
    return {
      stream,
      contentType: book.pdfAsset.mimeType || 'application/pdf',
      contentLength: Number(book.pdfAsset.sizeBytes),
      fileName: book.pdfAsset.originalName || `${book.title}.pdf`,
    };
  }

  async getPdfUrl(id: string, userId: string, roles: Role[], download = false) {
    const book = await this.prisma.libraryBook.findUnique({ where: { id }, include: { courses: true, programs: true, pdfAsset: true } });
    if (!book) throw new NotFoundException('Ном олдсонгүй');
    if (!(await this.canAccessBook(book, userId, roles))) throw new ForbiddenException('Энэ номыг үзэх эрхгүй байна');
    if (download && !book.downloadAllowed && !roles.includes(Role.ADMIN) && !roles.includes(Role.MANAGER)) throw new ForbiddenException('Энэ номыг татах эрх хаалттай байна');
    const url = await this.media.getPresignedUrl(book.pdfAsset.objectKey, 900);
    await this.prisma.libraryBookAccessLog.create({ data: { bookId: id, userId, action: download ? LibraryAccessAction.DOWNLOAD : LibraryAccessAction.VIEW } });
    return { presignedUrl: url, expiresInSeconds: 900, downloadAllowed: book.downloadAllowed };
  }

  async logView(id: string, userId: string, roles: Role[]) {
    await this.getPdfUrl(id, userId, roles, false);
    return { success: true };
  }

  async listCategories() { return this.prisma.libraryCategory.findMany({ orderBy: { name: 'asc' } }); }
  async createCategory(data: CreateLibraryCategoryDto) {
    return this.prisma.libraryCategory.create({ data: { name: data.name.trim(), code: data.code.trim().toUpperCase(), description: data.description?.trim() } });
  }
  async updateCategory(id: string, data: CreateLibraryCategoryDto) {
    return this.prisma.libraryCategory.update({ where: { id }, data: { name: data.name.trim(), code: data.code.trim().toUpperCase(), description: data.description?.trim() } });
  }
  async deleteCategory(id: string) {
    return this.prisma.libraryCategory.delete({ where: { id } });
  }
  async listTags() { return this.prisma.libraryTag.findMany({ orderBy: { name: 'asc' } }); }
  async createTag(data: CreateLibraryTagDto) { return this.prisma.libraryTag.upsert({ where: { name: data.name.trim() }, create: { name: data.name.trim() }, update: {} }); }
  async deleteTag(id: string) { return this.prisma.libraryTag.delete({ where: { id } }); }
}
