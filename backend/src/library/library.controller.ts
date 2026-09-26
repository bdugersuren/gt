import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { LibraryService } from './library.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateLibraryBookDto } from './dto/create-library-book.dto';
import { UpdateLibraryBookDto } from './dto/update-library-book.dto';
import { CreateLibraryCategoryDto } from './dto/create-library-category.dto';
import { CreateLibraryTagDto } from './dto/create-library-tag.dto';

@Controller('library')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get('books')
  @Roles(Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.ADMIN)
  listBooks(@Request() req: any, @Query() query: any) {
    return this.library.listBooks(req.user.id, req.user.roles || [], query);
  }

  @Get('books/:id/pdf')
  @Roles(Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.ADMIN)
  async pdf(@Param('id') id: string, @Request() req: any, @Res() response: Response) {
    const result = await this.library.getPdfStream(id, req.user.id, req.user.roles || [], false);
    response.set({
      'Content-Type': result.contentType,
      'Content-Length': String(result.contentLength),
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
      'Cache-Control': 'private, no-store',
    });
    result.stream.on('error', (error) => {
      if (!response.headersSent) response.status(404).json({ message: 'PDF файл олдсонгүй' });
      else response.destroy(error);
    });
    result.stream.pipe(response);
  }

  @Get('books/:id/download')
  @Roles(Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.ADMIN)
  async downloadPdf(@Param('id') id: string, @Request() req: any, @Res() response: Response) {
    const result = await this.library.getPdfStream(id, req.user.id, req.user.roles || [], true);
    response.set({
      'Content-Type': result.contentType,
      'Content-Length': String(result.contentLength),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
      'Cache-Control': 'private, no-store',
    });
    result.stream.on('error', (error) => {
      if (!response.headersSent) response.status(404).json({ message: 'PDF файл олдсонгүй' });
      else response.destroy(error);
    });
    result.stream.pipe(response);
  }

  @Get('books/:id')
  @Roles(Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.ADMIN)
  book(@Param('id') id: string, @Request() req: any) {
    return this.library.getBook(id, req.user.id, req.user.roles || []);
  }

  @Get('books/:id/pdf-url')
  @Roles(Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.ADMIN)
  pdfUrl(@Param('id') id: string, @Request() req: any) {
    return this.library.getPdfUrl(id, req.user.id, req.user.roles || [], false);
  }

  @Get('books/:id/download-url')
  @Roles(Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.ADMIN)
  downloadUrl(@Param('id') id: string, @Request() req: any) {
    return this.library.getPdfUrl(id, req.user.id, req.user.roles || [], true);
  }

  @Post('books/:id/view')
  @Roles(Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.ADMIN)
  view(@Param('id') id: string, @Request() req: any) {
    return this.library.logView(id, req.user.id, req.user.roles || []);
  }

  @Post('books/:id/download')
  @Roles(Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.ADMIN)
  download(@Param('id') id: string, @Request() req: any) {
    return this.library.getPdfUrl(id, req.user.id, req.user.roles || [], true);
  }

  @Get('manage/books')
  @Roles(Role.TEACHER, Role.MANAGER, Role.ADMIN)
  manageBooks(@Request() req: any, @Query() query: any) {
    return this.library.listBooks(req.user.id, req.user.roles || [], { ...query, manage: true });
  }

  @Get('manage/books/:id')
  @Roles(Role.TEACHER, Role.MANAGER, Role.ADMIN)
  manageBook(@Param('id') id: string, @Request() req: any) {
    return this.library.getBook(id, req.user.id, req.user.roles || [], true);
  }

  @Post('books')
  @Roles(Role.TEACHER, Role.MANAGER, Role.ADMIN)
  createBook(@Body() dto: CreateLibraryBookDto, @Request() req: any) {
    return this.library.createBook(req.user.id, req.user.roles || [], dto);
  }

  @Patch('books/:id')
  @Roles(Role.TEACHER, Role.MANAGER, Role.ADMIN)
  updateBook(@Param('id') id: string, @Body() dto: UpdateLibraryBookDto, @Request() req: any) {
    return this.library.updateBook(id, req.user.id, req.user.roles || [], dto);
  }

  @Delete('books/:id')
  @Roles(Role.TEACHER, Role.MANAGER, Role.ADMIN)
  archive(@Param('id') id: string, @Request() req: any) {
    return this.library.archiveBook(id, req.user.id, req.user.roles || []);
  }

  @Post('books/:id/publish')
  @Roles(Role.MANAGER, Role.ADMIN)
  publish(@Param('id') id: string, @Request() req: any) {
    return this.library.publishBook(id, req.user.id);
  }

  @Post('books/:id/archive')
  @Roles(Role.TEACHER, Role.MANAGER, Role.ADMIN)
  archiveBook(@Param('id') id: string, @Request() req: any) {
    return this.library.archiveBook(id, req.user.id, req.user.roles || []);
  }

  @Post('books/:id/restore')
  @Roles(Role.MANAGER, Role.ADMIN)
  restore(@Param('id') id: string) {
    return this.library.restoreBook(id);
  }

  @Get('categories')
  @Roles(Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.ADMIN)
  categories() { return this.library.listCategories(); }

  @Post('categories')
  @Roles(Role.MANAGER, Role.ADMIN)
  createCategory(@Body() dto: CreateLibraryCategoryDto) { return this.library.createCategory(dto); }

  @Patch('categories/:id')
  @Roles(Role.MANAGER, Role.ADMIN)
  updateCategory(@Param('id') id: string, @Body() dto: CreateLibraryCategoryDto) { return this.library.updateCategory(id, dto); }

  @Delete('categories/:id')
  @Roles(Role.MANAGER, Role.ADMIN)
  deleteCategory(@Param('id') id: string) { return this.library.deleteCategory(id); }

  @Get('tags')
  @Roles(Role.STUDENT, Role.TEACHER, Role.MANAGER, Role.ADMIN)
  tags() { return this.library.listTags(); }

  @Post('tags')
  @Roles(Role.MANAGER, Role.ADMIN)
  createTag(@Body() dto: CreateLibraryTagDto) { return this.library.createTag(dto); }

  @Delete('tags/:id')
  @Roles(Role.MANAGER, Role.ADMIN)
  deleteTag(@Param('id') id: string) { return this.library.deleteTag(id); }
}
