import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Request, Response, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurriculumService } from '../services/curriculum.service';
import { CreateCategoryDto, CreateCurriculumItemDto, CreateCurriculumVersionDto, CreateElectiveGroupDto, CreateSemesterAllocationDto, UpdateCurriculumItemDto, UpdateCurriculumVersionDto } from './dto/curriculum.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class CurriculumController {
  constructor(private readonly service: CurriculumService) {}
  @Get('academic-years')
  academicYears() { return this.service.listAcademicYears(); }
  @Get('curriculum-categories')
  categories() { return this.service.listCategories(); }
  @Get('programs/:programId/curriculum-versions') list(@Param('programId') id: string) { return this.service.listVersions(id); }
  @Post('programs/:programId/curriculum-versions') create(@Param('programId') id: string, @Body() dto: CreateCurriculumVersionDto) { return this.service.createVersion(id, dto); }
  @Get('curriculum-versions/:id') get(@Param('id') id: string) { return this.service.getVersion(id); }
  @Patch('curriculum-versions/:id') update(@Param('id') id: string, @Body() dto: UpdateCurriculumVersionDto) { return this.service.updateVersion(id, dto); }
  @Post('curriculum-versions/:id/duplicate') duplicate(@Param('id') id: string, @Body() dto: CreateCurriculumVersionDto) { return this.service.duplicateVersion(id, dto); }
  @Post('curriculum-versions/:id/approve') approve(@Param('id') id: string, @Request() req: any) { return this.service.approve(id, req.user.id); }
  @Patch('curriculum-versions/:id/archive') archive(@Param('id') id: string) { return this.service.archive(id); }
  @Get('curriculum-versions/:id/summary') summary(@Param('id') id: string) { return this.service.summary(id); }
  @Post('curriculum-versions/:id/validate') validate(@Param('id') id: string) { return this.service.validate(id); }
  @Get('curriculum-versions/:id/export') async export(@Param('id') id: string, @Response() response: any) { response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); response.setHeader('Content-Disposition', `attachment; filename="curriculum-${id}.xlsx"`); response.send(await this.service.exportWorkbook(id)); }
  @Get('curriculum-versions/:id/import/template') async template(@Param('id') id: string, @Response() response: any) { response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); response.setHeader('Content-Disposition', `attachment; filename="curriculum-import-template-${id}.xlsx"`); response.send(await this.service.templateWorkbook(id)); }
  @Post('curriculum-versions/:id/import/preview') @UseInterceptors(FileInterceptor('file')) previewImport(@Param('id') id: string, @UploadedFile() file: any) { if (!file) throw new BadRequestException('Excel файл оруулна уу'); return this.service.importPreview(id, file.buffer); }
  @Post('curriculum-versions/:id/import/commit') commitImport(@Param('id') id: string, @Body('rows') rows: Array<Record<string, unknown>>) { if (!Array.isArray(rows) || !rows.length) throw new BadRequestException('Импортлох мөр алга'); return this.service.importRows(id, rows); }
  @Post('curriculum-versions/:id/categories') category(@Param('id') id: string, @Body() dto: CreateCategoryDto) { return this.service.addCategory(id, dto); }
  @Post('curriculum-versions/:id/elective-groups') elective(@Param('id') id: string, @Body() dto: CreateElectiveGroupDto) { return this.service.addElectiveGroup(id, dto); }
  @Post('curriculum-versions/:id/items') item(@Param('id') id: string, @Body() dto: CreateCurriculumItemDto) { return this.service.addItem(id, dto); }
  @Patch('curriculum-items/:id') updateItem(@Param('id') id: string, @Body() dto: UpdateCurriculumItemDto) { return this.service.updateItem(id, dto); }
  @Delete('curriculum-items/:id') removeItem(@Param('id') id: string) { return this.service.removeItem(id); }
  @Post('curriculum-items/:id/semesters') semester(@Param('id') id: string, @Body() dto: CreateSemesterAllocationDto) { return this.service.addSemester(id, dto); }
  @Delete('curriculum-item-semesters/:id') removeSemester(@Param('id') id: string) { return this.service.removeSemester(id); }
}
