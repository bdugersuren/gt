import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_TABLES = [
  'User', 'Department', 'ClassGroup', 'Course', 'Enrollment', 'Module', 'Lesson', 'LessonPrerequisite',
  'Assignment', 'Rubric', 'RubricCriteria', 'Submission', 'RubricScore', 'Question', 'Quiz', 'QuizQuestion',
  'QuizAttempt', 'InternshipLog', 'ProgressLog', 'AuditLog', 'JobVacancy', 'SkillBadge', 'Message',
  'Announcement', 'MediaAsset', 'LiveSession', 'LiveAttendee', 'LivePoll', 'Program', 'AcademicYear', 'StudentProfile', 'StaffProfile', 'Company', 'StudentClassMembership', 'CourseTeacher', 'StudentPromotion', 'CurriculumVersion', 'CurriculumCategory', 'ElectiveGroup', 'CurriculumItem', 'CurriculumItemSemester',
] as const;
const READ_ONLY_TABLES = new Set(['AuditLog', 'ProgressLog', 'QuizAttempt', 'LiveAttendee']);
const HIDDEN_FIELDS = new Set(['passwordHash']);

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private model(name: string): any {
    if (!(ADMIN_TABLES as readonly string[]).includes(name)) throw new NotFoundException('Ийм хүснэгт олдсонгүй');
    const model = ((Prisma as any).dmmf?.datamodel?.models || []).find((item: any) => item.name === name);
    if (!model) throw new NotFoundException('Хүснэгтийн schema олдсонгүй');
    return model;
  }
  private delegate(name: string): any {
    const delegate = (this.prisma as any)[name.charAt(0).toLowerCase() + name.slice(1)];
    if (!delegate) throw new NotFoundException('Хүснэгтийн API олдсонгүй');
    return delegate;
  }
  private fields(name: string): any[] { return this.model(name).fields.filter((field: any) => field.kind === 'scalar' && !HIDDEN_FIELDS.has(field.name)); }
  private clean(value: any): any {
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.clean(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !HIDDEN_FIELDS.has(key)).map(([key, item]) => [key, this.clean(item)]));
    return value;
  }
  private data(name: string, input: Record<string, unknown>) {
    const fieldMap = new Map(this.fields(name).map((field: any) => [field.name, field]));
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input || {})) {
      const field: any = fieldMap.get(key);
      if (!field || field.isId || field.isReadOnly || value === undefined) continue;
      if (value === '' && !field.isRequired) { result[key] = null; continue; }
      try {
        if (field.type === 'Int' || field.type === 'Float' || field.type === 'Decimal') {
          const numberValue = typeof value === 'number' ? value : Number(String(value).trim());
          if (!Number.isFinite(numberValue)) throw new Error(`${key} нь тоон утга байх ёстой`);
          result[key] = numberValue;
        } else if (field.type === 'Boolean') {
          if (typeof value === 'boolean') result[key] = value;
          else if (String(value).trim().toLowerCase() === 'true') result[key] = true;
          else if (String(value).trim().toLowerCase() === 'false') result[key] = false;
          else throw new Error(`${key} нь true эсвэл false байх ёстой`);
        } else if (field.type === 'DateTime' && value !== null && typeof value === 'string') {
          const dateValue = new Date(value);
          if (Number.isNaN(dateValue.getTime())) throw new Error(`${key} нь зөв огноо байх ёстой`);
          result[key] = dateValue;
        } else if (field.type === 'BigInt' && value !== null) {
          result[key] = BigInt(String(value).trim());
        } else if (field.type === 'Json' && typeof value === 'string') {
          result[key] = JSON.parse(value);
        } else {
          result[key] = value;
        }
      } catch (error) {
        if (error instanceof SyntaxError) throw new BadRequestException(`${key} нь зөв JSON байх ёстой`);
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException(error instanceof Error ? error.message : `${key} утга буруу байна`);
      }
    }
    return result;
  }
  async getTableList() {
    return ADMIN_TABLES.map((name) => ({ name, readOnly: READ_ONLY_TABLES.has(name), fields: this.fields(name).map((field: any) => ({ name: field.name, type: field.type })) }));
  }
  async getTableRows(name: string, page = 1, pageSize = 25, search = '') {
    const fields = this.fields(name); const searchable = fields.filter((field: any) => field.type === 'String').slice(0, 8);
    const where = search.trim() && searchable.length ? { OR: searchable.map((field: any) => ({ [field.name]: { contains: search.trim(), mode: 'insensitive' } })) } : undefined;
    const select = Object.fromEntries(fields.map((field: any) => [field.name, true])); const delegate = this.delegate(name);
    const [rows, total] = await Promise.all([delegate.findMany({ where, select, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [fields[0]?.name || 'id']: 'desc' } }), delegate.count({ where })]);
    return { rows: this.clean(rows), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), readOnly: READ_ONLY_TABLES.has(name) };
  }
  async createTableRow(name: string, input: Record<string, unknown>, userId: string) {
    if (READ_ONLY_TABLES.has(name)) throw new BadRequestException('Энэ хүснэгт зөвхөн харах горимтой');
    const row = await this.delegate(name).create({ data: this.data(name, input) }); await this.adminAudit(userId, 'ADMIN_TABLE_CREATE', { table: name, rowId: row.id }); return this.clean(row);
  }
  async updateTableRow(name: string, id: string, input: Record<string, unknown>, userId: string) {
    if (READ_ONLY_TABLES.has(name)) throw new BadRequestException('Энэ хүснэгт зөвхөн харах горимтой');
    const row = await this.delegate(name).update({ where: { id }, data: this.data(name, input) }); await this.adminAudit(userId, 'ADMIN_TABLE_UPDATE', { table: name, rowId: id }); return this.clean(row);
  }
  async deleteTableRow(name: string, id: string, userId: string) {
    if (READ_ONLY_TABLES.has(name) || name === 'User') throw new BadRequestException('Энэ хүснэгтийг шууд устгах боломжгүй');
    await this.delegate(name).delete({ where: { id } }); await this.adminAudit(userId, 'ADMIN_TABLE_DELETE', { table: name, rowId: id }); return { success: true };
  }
  private async adminAudit(userId: string, action: string, details: Record<string, unknown>) { await this.prisma.auditLog.create({ data: { userId, action, details: JSON.parse(JSON.stringify(details)) } }); }

  // Get recent Audit Logs
  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            code: true,
            roles: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  }

  // List recent backup files
  async getBackups() {
    return [];
  }

  // Create database & MinIO simulated backup
  async createBackup(executorId: string) {
    void executorId;
    throw new ServiceUnavailableException(
      'Хуурамч metadata backup идэвхгүй болсон. Баталгаатай pg_dump/MinIO backup-ийг ops backup job-оор ажиллуулна уу.',
    );
  }

  // Restore database
  async restoreBackup(filename: string, executorId: string) {
    void filename;
    void executorId;
    throw new ServiceUnavailableException(
      'Restore нь production API-аас шууд ажиллахгүй. Staging restore drill болон ажиллагааны зөвшөөрөл шаардлагатай.',
    );
  }
}
