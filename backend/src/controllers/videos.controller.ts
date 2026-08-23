import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideosService } from '../services/videos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('videos')
export class VideosController {
  constructor(private videosService: VideosService) {}

  // POST endpoint for uploading video files (Restricted to authenticated users)
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body('lessonId') lessonId?: string,
    @Body('submissionId') submissionId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Видео файлыг хавсаргана уу');
    }

    // Accept common video formats
    const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Зөвхөн дараах видео форматуудыг зөвшөөрнө: mp4, mov, mkv, webm');
    }

    return this.videosService.uploadRawVideo(file, lessonId, submissionId);
  }

  // POST endpoint for transcoder worker callbacks (Secured via internal shared secret token)
  @Post('transcode-callback')
  async callback(
    @Headers('x-transcoder-token') token: string,
    @Body() body: {
      success: boolean;
      lessonId?: string;
      submissionId?: string;
      hlsStreamUrl?: string;
      error?: string;
    },
  ) {
    const expectedToken = process.env.TRANSCODER_SHARED_SECRET;
    if (!token || token !== expectedToken) {
      throw new UnauthorizedException('Хандах эрх хүчингүй байна (Callback token invalid)');
    }

    return this.videosService.handleTranscodeCallback(body);
  }
}
