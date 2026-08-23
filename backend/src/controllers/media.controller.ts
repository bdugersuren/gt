import {
  Controller, Post, Get, Delete, Body, Param, Query,
  UseGuards, Request, UseInterceptors, UploadedFile, UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MediaService } from '../services/media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, MediaAssetType } from '@prisma/client';

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // ─── POST /api/media/upload — Нэг файл байршуулах ────────────────────────────
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('lessonId') lessonId?: string,
    @Body('courseId') courseId?: string,
    @Request() req?: any,
  ) {
    if (!file) throw new BadRequestException('Файл хавсаргагдаагүй байна');
    return this.mediaService.uploadFile(file, req.user.id, lessonId, courseId);
  }

  // ─── POST /api/media/upload/multi — Олон файл нэгэн зэрэг байршуулах ────────
  @Post('upload/multi')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('lessonId') lessonId?: string,
    @Body('courseId') courseId?: string,
    @Request() req?: any,
  ) {
    if (!files || files.length === 0) throw new BadRequestException('Файл хавсаргагдаагүй байна');
    return this.mediaService.uploadMultipleFiles(files, req.user.id, lessonId, courseId);
  }

  // ─── GET /api/media/presigned/:key — Presigned URL авах ─────────────────────
  @Get('presigned/:key(*)')
  async getPresigned(
    @Param('key') key: string,
    @Query('expiry') expiry?: string,
  ) {
    const expirySeconds = expiry ? parseInt(expiry) : 3600;
    const url = await this.mediaService.getPresignedUrl(key, expirySeconds);
    return { presignedUrl: url, expiresInSeconds: expirySeconds };
  }

  // ─── GET /api/media/list — Медиа файлын жагсаалт (lesson/course-аар шүүх) ───
  @Get('list')
  async listAssets(
    @Query('courseId')   courseId?:   string,
    @Query('lessonId')   lessonId?:   string,
    @Query('type')       type?:       string,
    @Query('skip')       skip?:       string,
    @Query('take')       take?:       string,
  ) {
    return this.mediaService.listAssets({
      courseId,
      lessonId,
      type: type as MediaAssetType | undefined,
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 50,
    });
  }

  // ─── GET /api/media/course/:courseId/summary — Backup-д зориулсан задаргаа ──
  @Get('course/:courseId/summary')
  @Roles(Role.TEACHER, Role.MANAGER, Role.ADMIN)
  async getCourseMediaSummary(@Param('courseId') courseId: string) {
    return this.mediaService.getCourseMediaSummary(courseId);
  }

  // ─── DELETE /api/media/:id — Файл устгах (Зөвхөн TEACHER / MANAGER / ADMIN) ─
  @Delete(':id')
  @Roles(Role.TEACHER, Role.MANAGER, Role.ADMIN)
  async deleteAsset(@Param('id') id: string) {
    return this.mediaService.deleteAsset(id);
  }
}
