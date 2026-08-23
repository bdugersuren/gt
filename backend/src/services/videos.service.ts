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

    // 1. If associated with a Lesson (Teacher lecture video)
    if (data.lessonId) {
      await this.prisma.lesson.update({
        where: { id: data.lessonId },
        data: {
          videoUrl: data.hlsStreamUrl,
        },
      });
      console.log(`[Transcode Callback] Lesson ${data.lessonId} videoUrl updated to ${data.hlsStreamUrl}`);
    }

    // 2. If associated with a Submission (Student practical video proof)
    if (data.submissionId) {
      await this.prisma.submission.update({
        where: { id: data.submissionId },
        data: {
          hlsStreamUrl: data.hlsStreamUrl,
        },
      });
      console.log(`[Transcode Callback] Submission ${data.submissionId} hlsStreamUrl updated to ${data.hlsStreamUrl}`);
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
