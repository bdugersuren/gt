import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';

@Injectable()
export class VideosService {
  private minioClient: Minio.Client;
  private readonly bucketName = 'lms-media';

  constructor(
    @InjectQueue('video_transcoding') private transcodingQueue: Queue,
    private prisma: PrismaService,
  ) {
    // Initialize MinIO client
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
  }

  // Ensure MinIO bucket exists and has correct public policies for video streaming
  private async ensureBucketExists() {
    const exists = await this.minioClient.bucketExists(this.bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucketName);
    }
  }

  // Upload raw video buffer and queue a transcoding task
  async uploadRawVideo(
    file: Express.Multer.File,
    lessonId?: string,
    submissionId?: string,
  ) {
    if (!lessonId && !submissionId) {
      throw new BadRequestException('Лекцийн ID эсвэл даалгавар илгээлтийн ID-ийн аль нэгийг заавал заах ёстой');
    }

    await this.ensureBucketExists();

    const fileId = randomUUID();
    const rawKey = `raw/${fileId}${path.extname(file.originalname) || '.mp4'}`;
    const outputKeyPrefix = `hls/${fileId}/`;

    try {
      // 1. Upload raw video buffer to MinIO
      await this.minioClient.putObject(
        this.bucketName,
        rawKey,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype }
      );

      // 2. Add transcoding job to BullMQ queue
      const job = await this.transcodingQueue.add('transcode', {
        inputBucket: this.bucketName,
        inputKey: rawKey,
        outputBucket: this.bucketName,
        outputKeyPrefix,
        lessonId,
        submissionId,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800, count: 1000 },
      });

      return {
        success: true,
        jobId: job.id,
        rawFileUrl: `/minio/${this.bucketName}/${rawKey}`,
        message: 'Бичлэг амжилттай хадгалагдлаа. Хөрвүүлэлт дараалалд орсон.',
      };

    } catch (err: any) {
      console.error('Video upload/queue error:', err);
      throw new InternalServerErrorException(`Сүлжээний хадгалалтад видео хадгалахад алдаа гарлаа: ${err.message}`);
    }
  }

  // Handle worker callback and update the corresponding database tables
  async handleTranscodeCallback(data: {
    success: boolean;
    lessonId?: string;
    submissionId?: string;
    hlsStreamUrl?: string;
    error?: string;
  }) {
    if (!data.success) {
      console.error('[Transcode Callback] Transcoding failed with error:', data.error);
      
      // Update submission feedback if failed
      if (data.submissionId) {
        await this.prisma.submission.update({
          where: { id: data.submissionId },
          data: {
            feedback: `Видео хөрвүүлэлт амжилтгүй боллоо: ${data.error}`,
          },
        });
      }
      return { success: false, message: 'Алдаа амжилттай бүртгэгдлээ' };
    }

    if (!data.hlsStreamUrl) {
      throw new BadRequestException('Амжилттай хөрвүүлэлтэд HLS хаяг заавал байх ёстой');
    }

    const objectKey = data.hlsStreamUrl.split('/').slice(-3).join('/') || `hls/${randomUUID()}/master.m3u8`;
    const makeAsset = async (uploaderId: string, lessonId?: string, courseId?: string) =>
      this.prisma.mediaAsset.upsert({
        where: { objectKey },
        create: { bucketName: this.bucketName, objectKey, publicUrl: data.hlsStreamUrl, hlsUrl: data.hlsStreamUrl, type: 'VIDEO_HLS', originalName: objectKey.split('/').pop() || 'master.m3u8', mimeType: 'application/vnd.apple.mpegurl', sizeBytes: BigInt(0), uploaderId, lessonId, courseId },
        update: { publicUrl: data.hlsStreamUrl, hlsUrl: data.hlsStreamUrl },
      });

    // Lesson and submission are both represented by normalized MediaAsset relations.
    if (data.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({ where: { id: data.lessonId }, include: { module: { include: { course: { include: { teachers: true } } } } } });
      if (lesson) {
        const uploaderId = lesson.module.course.teachers[0]?.teacherId || (await this.prisma.user.findFirst({ where: { roles: { has: 'ADMIN' } }, select: { id: true } }))?.id;
        if (uploaderId) await makeAsset(uploaderId, data.lessonId, lesson.module.courseId);
      }
    }

    if (data.submissionId) {
      const submission = await this.prisma.submission.findUnique({ where: { id: data.submissionId }, select: { studentId: true, assignment: { select: { lesson: { select: { module: { select: { courseId: true } } } } } } } });
      if (submission) {
        const asset = await makeAsset(submission.studentId, undefined, submission.assignment.lesson.module.courseId);
        await this.prisma.submissionAsset.upsert({ where: { submissionId_assetId: { submissionId: data.submissionId, assetId: asset.id } }, create: { submissionId: data.submissionId, assetId: asset.id }, update: {} });
        await this.prisma.submission.update({ where: { id: data.submissionId }, data: { linkUrl: data.hlsStreamUrl } });
      }
    }

    return { success: true, message: 'Өгөгдлийн сан амжилттай шинэчлэгдлээ' };
  }
}

// Inline path helper in case path is not fully imported
const path = {
  extname: (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }
};
