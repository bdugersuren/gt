import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { Workbook, CellValue } from 'exceljs';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { validateMongolianRegisterNumber } from '../utils/validation.util';

export type UserImportType = 'TEACHER' | 'STUDENT';

type ParsedRow = {
  row: number;
  username: string;
  email: string;
  fullName: string;
  code: string;
  phone?: string;
  departmentCode?: string;
  classGroupCode?: string;
  registerNumber?: string;
  temporaryPassword: string;
  errors: string[];
  departmentId?: string;
  classGroupId?: string;
  programId?: string;
};

@Injectable()
export class UserExcelImportService {
  private readonly maxRows = 2000;
  private readonly teacherHeaders = ['username', 'email', 'fullName', 'code', 'phone', 'departmentCode', 'temporaryPassword'];
  private readonly studentHeaders = ['username', 'email', 'fullName', 'registerNumber', 'code', 'phone', 'departmentCode', 'classGroupCode', 'temporaryPassword'];

  constructor(private prisma: PrismaService) {}

  normalizeType(value?: string): UserImportType {
    if (value === 'TEACHER' || value === 'STUDENT') return value;
    throw new BadRequestException('Import төрөл TEACHER эсвэл STUDENT байна');
  }

  checksum(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private headers(type: UserImportType) {
    return type === 'TEACHER' ? this.teacherHeaders : this.studentHeaders;
  }

  private text(value: CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      if ('formula' in value || 'sharedFormula' in value || 'hyperlink' in value) {
        throw new BadRequestException('Formula, hyperlink болон external reference зөвшөөрөхгүй');
      }
      if ('richText' in value) return value.richText.map((item) => item.text).join('').trim();
      throw new BadRequestException('Дэмжигдээгүй Excel cell төрөл байна');
    }
    return String(value).trim();
  }

  private async workbook(buffer: Buffer) {
    if (buffer.length < 4 || buffer.subarray(0, 2).toString('hex') !== '504b') {
      throw new BadRequestException('Файл хүчинтэй XLSX формат биш байна');
    }
    const workbook = new Workbook();
    try { await workbook.xlsx.load(buffer as any); }
    catch { throw new BadRequestException('Excel файлыг уншиж чадсангүй'); }
    return workbook;
  }

  async template(type: UserImportType): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet(type === 'TEACHER' ? 'Teachers' : 'Students');
    const headers = this.headers(type);
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    sheet.addRow(type === 'TEACHER'
      ? ['teacher01', 'teacher01@example.mn', 'Багшийн нэр', 'TCH-001', '99112233', 'VET-AGR', 'ChangeMe123!']
      : ['student01', 'student01@example.mn', 'Сурагчийн нэр', 'АЕ06231234', 'STU-001', '99112233', 'VET-AGR', 'CLASS-AGR-3A', 'ChangeMe123!']);
    sheet.columns.forEach((column) => { column.width = 22; });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + headers.length)}1` };
    const instructions = workbook.addWorksheet('Instructions');
    instructions.addRows([
      ['Гурвантамир LMS хэрэглэгч импортын заавар'],
      ['1', 'Толгой баганын нэрийг өөрчилж болохгүй.'],
      ['2', 'temporaryPassword хамгийн багадаа 12 тэмдэгт байна.'],
      ['3', 'departmentCode болон classGroupCode системд урьдчилан бүртгэлтэй байна.'],
      ['4', 'Formula, macro, hyperlink болон external reference зөвшөөрөхгүй.'],
      ['5', 'Жишээ мөрийг устгаад бодит мэдээллээ оруулна.'],
    ]);
    instructions.getColumn(1).width = 12;
    instructions.getColumn(2).width = 90;
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async parse(file: Buffer, type: UserImportType): Promise<ParsedRow[]> {
    const workbook = await this.workbook(file);
    const sheet = workbook.getWorksheet(type === 'TEACHER' ? 'Teachers' : 'Students') || workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel data sheet олдсонгүй');
    const expected = this.headers(type);
    const actual = (sheet.getRow(1).values as CellValue[]).slice(1).map((value) => this.text(value));
    const missing = expected.filter((header) => !actual.includes(header));
    if (missing.length) throw new BadRequestException(`Шаардлагатай багана дутуу: ${missing.join(', ')}`);
    const dataRows = Math.max(0, sheet.actualRowCount - 1);
    if (!dataRows) throw new BadRequestException('Excel файл өгөгдлийн мөргүй байна');
    if (dataRows > this.maxRows) throw new BadRequestException(`Нэг файл хамгийн ихдээ ${this.maxRows} мөртэй байна`);
    const index = Object.fromEntries(actual.map((header, i) => [header, i + 1]));
    const rows: ParsedRow[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.actualRowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      if (!row.hasValues) continue;
      const get = (header: string) => this.text(row.getCell(index[header]).value);
      rows.push({
        row: rowNumber, username: get('username'), email: get('email').toLowerCase(), fullName: get('fullName'), code: get('code').toUpperCase(),
        phone: get('phone') || undefined, departmentCode: get('departmentCode').toUpperCase() || undefined,
        classGroupCode: type === 'STUDENT' ? get('classGroupCode').toUpperCase() || undefined : undefined,
        registerNumber: type === 'STUDENT' ? get('registerNumber').toUpperCase() || undefined : undefined,
        temporaryPassword: get('temporaryPassword'), errors: [],
      });
    }
    return rows;
  }

  private async validate(file: Buffer, type: UserImportType): Promise<ParsedRow[]> {
    const rows = await this.parse(file, type);
    const departments = await this.prisma.department.findMany({ select: { id: true, code: true } });
    const classes = await this.prisma.classGroup.findMany({ select: { id: true, code: true, departmentId: true, programId: true } });
    const departmentMap = new Map(departments.map((item) => [item.code.toUpperCase(), item.id]));
    const classMap = new Map(classes.map((item) => [item.code.toUpperCase(), item]));
    const existing = await this.prisma.user.findMany({
      where: { OR: [
        { username: { in: rows.map((row) => row.username).filter(Boolean) } },
        { email: { in: rows.map((row) => row.email).filter(Boolean) } },
        { code: { in: rows.map((row) => row.code).filter(Boolean) } },
      ] }, select: { username: true, email: true, code: true },
    });
    const existingUsername = new Set(existing.map((item) => item.username));
    const existingEmail = new Set(existing.map((item) => item.email.toLowerCase()));
    const existingCode = new Set(existing.map((item) => item.code.toUpperCase()));
    const counts = (key: keyof Pick<ParsedRow, 'username' | 'email' | 'code'>) => rows.reduce((map, row) => map.set(row[key], (map.get(row[key]) || 0) + 1), new Map<string, number>());
    const usernames = counts('username'); const emails = counts('email'); const codes = counts('code');
    for (const row of rows) {
      if (!row.username || !row.email || !row.fullName || !row.code || !row.temporaryPassword) row.errors.push('Заавал бөглөх мэдээлэл дутуу');
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) row.errors.push('Имэйл формат буруу');
      if (row.temporaryPassword.length < 12) row.errors.push('Түр нууц үг 12-оос доош тэмдэгттэй');
      if (existingUsername.has(row.username)) row.errors.push('Username бүртгэлтэй');
      if (existingEmail.has(row.email)) row.errors.push('Имэйл бүртгэлтэй');
      if (existingCode.has(row.code)) row.errors.push('Код бүртгэлтэй');
      if ((usernames.get(row.username) || 0) > 1) row.errors.push('Excel дотор username давхардсан');
      if ((emails.get(row.email) || 0) > 1) row.errors.push('Excel дотор email давхардсан');
      if ((codes.get(row.code) || 0) > 1) row.errors.push('Excel дотор code давхардсан');
      if (!row.departmentCode || !departmentMap.has(row.departmentCode)) row.errors.push('Тэнхимийн код олдсонгүй');
      else row.departmentId = departmentMap.get(row.departmentCode);
      if (type === 'STUDENT') {
        if (!row.registerNumber || !validateMongolianRegisterNumber(row.registerNumber)) row.errors.push('Регистрийн дугаар буруу');
        const classGroup = row.classGroupCode ? classMap.get(row.classGroupCode) : undefined;
        if (!classGroup) row.errors.push('Ангийн код олдсонгүй');
        else {
          row.classGroupId = classGroup.id;
          row.programId = classGroup.programId || undefined;
          if (row.departmentId && classGroup.departmentId !== row.departmentId) row.errors.push('Анги сонгосон тэнхимд хамаарахгүй');
        }
      }
      row.errors = Array.from(new Set(row.errors));
    }
    return rows;
  }

  private safe(row: ParsedRow) {
      const { temporaryPassword: _password, departmentId: _departmentId, classGroupId: _classGroupId, programId: _programId, ...safe } = row;
    return { ...safe, valid: row.errors.length === 0 };
  }

  async preview(file: Buffer, type: UserImportType) {
    const rows = await this.validate(file, type);
    return { fileChecksum: this.checksum(file), totalRows: rows.length, validCount: rows.filter((row) => !row.errors.length).length, invalidCount: rows.filter((row) => row.errors.length).length, rows: rows.map((row) => this.safe(row)) };
  }

  async commit(file: Buffer, type: UserImportType, expectedChecksum: string, executorId: string, fileName: string) {
    const checksum = this.checksum(file);
    if (!expectedChecksum || checksum !== expectedChecksum) throw new BadRequestException('Preview хийсэн файл өөрчлөгдсөн байна');
    const rows = await this.validate(file, type);
    const valid = rows.filter((row) => !row.errors.length);
    const prepared = await Promise.all(valid.map(async (row) => ({ row, passwordHash: await bcrypt.hash(row.temporaryPassword, 10) })));
    if (prepared.length) await this.prisma.$transaction(prepared.map(({ row, passwordHash }) => this.prisma.user.create({ data: {
      username: row.username, email: row.email, fullName: row.fullName, code: row.code, phone: row.phone,
      registerNumber: type === 'STUDENT' ? row.registerNumber : undefined,
      roles: [type === 'TEACHER' ? Role.TEACHER : Role.STUDENT], passwordHash,
      staffProfile: type === 'TEACHER' ? { create: { departmentId: row.departmentId } } : undefined,
      studentProfile: type === 'STUDENT' ? { create: {
        status: 'ACTIVE', enrollmentYear: new Date().getFullYear(),
        classMemberships: row.classGroupId ? { create: { classGroupId: row.classGroupId, startDate: new Date(), isCurrent: true } } : undefined,
      } } : undefined,
    } })));
    await this.prisma.auditLog.create({ data: { userId: executorId, action: 'USER_EXCEL_IMPORT', details: { fileName, type, checksum, totalRows: rows.length, importedCount: prepared.length, failedCount: rows.length - prepared.length } } });
    return { success: rows.every((row) => !row.errors.length), fileChecksum: checksum, totalRows: rows.length, importedCount: prepared.length, failedCount: rows.length - prepared.length, errors: rows.filter((row) => row.errors.length).map((row) => this.safe(row)) };
  }

  async errorReport(file: Buffer, type: UserImportType): Promise<Buffer> {
    const rows = (await this.validate(file, type)).filter((row) => row.errors.length);
    const workbook = new Workbook(); const sheet = workbook.addWorksheet('Errors');
    sheet.addRow(['row', ...this.headers(type).filter((header) => header !== 'temporaryPassword'), 'errors']);
    for (const row of rows) sheet.addRow([row.row, ...this.headers(type).filter((header) => header !== 'temporaryPassword').map((header) => String((row as any)[header] || '')), row.errors.join('; ')]);
    sheet.getRow(1).font = { bold: true }; sheet.columns.forEach((column) => { column.width = 24; });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
