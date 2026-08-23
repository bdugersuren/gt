import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaAssetType } from '@prisma/client';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

// ─── Файлын хэмжээний хязгаар (байт) ─────────────────────────────────────────
const MAX_SIZE: Record<string, number> = {
  image:    10 * 1024 * 1024,   // 10 MB
  pdf:      20 * 1024 * 1024,   // 20 MB
  audio:    50 * 1024 * 1024,   // 50 MB
  markdown: 2  * 1024 * 1024,   // 2  MB
  video:    500 * 1024 * 1024,  // 500 MB
};

// ─── MIME → MediaAssetType + MinIO зам ────────────────────────────────────────
const MIME_MAP: Record<string, { type: MediaAssetType; folder: string; category: string }> = {
  'image/jpeg':       { type: MediaAssetType.IMAGE,    folder: 'images',   category: 'image' },
  'image/jpg':        { type: MediaAssetType.IMAGE,    folder: 'images',   category: 'image' },
  'image/png':        { type: MediaAssetType.IMAGE,    folder: 'images',   category: 'image' },
  'image/webp':       { type: MediaAssetType.IMAGE,    folder: 'images',   category: 'image' },
  'image/gif':        { type: MediaAssetType.IMAGE,    folder: 'images',   category: 'image' },
  'image/svg+xml':    { type: MediaAssetType.IMAGE,    folder: 'images',   category: 'image' },
  'application/pdf':  { type: MediaAssetType.PDF,      folder: 'pdfs',     category: 'pdf'   },
  'audio/mpeg':       { type: MediaAssetType.AUDIO,    folder: 'audio',    category: 'audio' },
  'audio/mp3':        { type: MediaAssetType.AUDIO,    folder: 'audio',    category: 'audio' },
  'audio/wav':        { type: MediaAssetType.AUDIO,    folder: 'audio',    category: 'audio' },
  'audio/ogg':        { type: MediaAssetType.AUDIO,    folder: 'audio',    category: 'audio' },
  'audio/aac':        { type: MediaAssetType.AUDIO,    folder: 'audio',    category: 'audio' },
  'audio/x-m4a':      { type: MediaAssetType.AUDIO,    folder: 'audio',    category: 'audio' },
  'text/markdown':    { type: MediaAssetType.MARKDOWN, folder: 'markdown', category: 'markdown' },
  'text/plain':       { type: MediaAssetType.MARKDOWN, folder: 'markdown', category: 'markdown' },
  'video/mp4':        { type: MediaAssetType.VIDEO_RAW, folder: 'raw',     category: 'video' },
  'video/quicktime':  { type: MediaAssetType.VIDEO_RAW, folder: 'raw',     category: 'video' },
  'video/x-matroska': { type: MediaAssetType.VIDEO_RAW, folder: 'raw',     category: 'video' },
  'video/webm':       { type: MediaAssetType.VIDEO_RAW, folder: 'raw',     category: 'video' },
};

export interface UploadResult {
  id: string;
  key: string;
  publicUrl: string;
  type: MediaAssetType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

@Injectable()
export class MediaService {
  private readonly minioClient: Minio.Client;
  private readonly bucket = 'lms-media';
  private readonly minioPublicBase: string;

  constructor(private readonly prisma: PrismaService) {
    this.minioClient = new Minio.Client({
      endPoint:  process.env.MINIO_ENDPOINT  || 'minio',
      port:      parseInt(process.env.MINIO_PORT || '9000'),
      useSSL:    false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    // Олон нийтэд харагдах public URL (browser-аас хандах)
    // Docker-ийн дотор: http://minio:9000  — хост машинаас: http://localhost:9000
    this.minioPublicBase =
      process.env.MINIO_PUBLIC_BASE_URL || 'http://localhost:9000';
  }

  // ─── MinIO bucket байгаа эсэхийг шалгаж тохируулах ─────────────────────────
  async ensureBucketReady() {
    const exists = await this.minioClient.bucketExists(this.bucket);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucket);
    }

    // Нийтийн хандалтын бодлого: images, pdfs, audio, markdown, hls фолдеруудт
    // зөвхөн GetObject хандалт зөвшөөрнө. raw/ фолдер хаалттай.
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect:    'Allow',
          Principal: { AWS: ['*'] },
          Action:    ['s3:GetObject'],
          Resource: [
            `arn:aws:s3:::${this.bucket}/images/*`,
            `arn:aws:s3:::${this.bucket}/pdfs/*`,
            `arn:aws:s3:::${this.bucket}/audio/*`,
            `arn:aws:s3:::${this.bucket}/markdown/*`,
            `arn:aws:s3:::${this.bucket}/hls/*`,
          ],
        },
      ],
    };
    await this.minioClient.setBucketPolicy(this.bucket, JSON.stringify(policy));
  }

  // ─── Нэг файл байршуулах ─────────────────────────────────────────────────────
  async uploadFile(
    file:       Express.Multer.File,
    uploaderId: string,
    lessonId?:  string,
    courseId?:  string,
  ): Promise<UploadResult> {
    const mime = file.mimetype.toLowerCase();
    const meta = MIME_MAP[mime];

    if (!meta) {
      throw new BadRequestException(
        `Зөвшөөрөгдөөгүй файлын төрөл: ${mime}. ` +
        `Дэмжих форматууд: зураг (jpeg/png/webp/gif), pdf, аудио (mp3/wav/ogg/aac), markdown, видео (mp4/mov/mkv/webm).`
      );
    }

    // Хэмжээний шалгалт
    const maxBytes = MAX_SIZE[meta.category];
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `Файлын хэмжээ хэт их байна. ${meta.category} файлд хамгийн ихдээ ${Math.round(maxBytes / 1024 / 1024)} MB зөвшөөрнө.`
      );
    }

    await this.ensureBucketReady();

    // Файлын нэр: folder/uuid.ext
    const ext = this.extractExt(file.originalname);
    const uuid = randomUUID();
    const objectKey = `${meta.folder}/${uuid}${ext}`;
    const publicUrl = `${this.minioPublicBase}/${this.bucket}/${objectKey}`;

    try {
      // MinIO-д байршуулах
      const stream = Readable.from(file.buffer);
      await this.minioClient.putObject(
        this.bucket,
        objectKey,
        stream,
        file.size,
        {
          'Content-Type':        file.mimetype,
          'X-Amz-Meta-Original': encodeURIComponent(file.originalname),
          'X-Amz-Meta-Uploader': uploaderId,
          ...(lessonId ? { 'X-Amz-Meta-Lesson':  lessonId } : {}),
          ...(courseId ? { 'X-Amz-Meta-Course':  courseId } : {}),
        }
      );

      // Өгөгдлийн санд metadata хадгалах
      const asset = await this.prisma.mediaAsset.create({
        data: {
          bucketName:   this.bucket,
          objectKey,
          publicUrl,
          type:         meta.type,
          originalName: file.originalname,
          mimeType:     file.mimetype,
          sizeBytes:    BigInt(file.size),
          uploaderId,
          lessonId:     lessonId || null,
          courseId:     courseId || null,
        },
      });

      return {
        id:           asset.id,
        key:          objectKey,
        publicUrl,
        type:         asset.type,
        originalName: asset.originalName,
        mimeType:     asset.mimeType,
        sizeBytes:    file.size,
        uploadedAt:   asset.createdAt,
      };

    } catch (err: any) {
      // MinIO-д байршуулаагүй байвал устгаж цэвэрлэх
      try { await this.minioClient.removeObject(this.bucket, objectKey); } catch {}
      throw new InternalServerErrorException(`Файл байршуулахад алдаа гарлаа: ${err.message}`);
    }
  }

  // ─── Олон файл нэгэн зэрэг байршуулах ───────────────────────────────────────
  async uploadMultipleFiles(
    files:      Express.Multer.File[],
    uploaderId: string,
    lessonId?:  string,
    courseId?:  string,
  ): Promise<UploadResult[]> {
    if (files.length > 10) {
      throw new BadRequestException('Нэг дор хамгийн ихдээ 10 файл байршуулах боломжтой.');
    }
    return Promise.all(
      files.map(f => this.uploadFile(f, uploaderId, lessonId, courseId))
    );
  }

  // ─── Presigned URL үүсгэх (хуваалцах / хязгаарлагдмал хандалт) ─────────────
  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.minioClient.presignedGetObject(this.bucket, key, expirySeconds);
  }

  // ─── Курс эсвэл лекцтэй холбоотой бүх материалыг жагсаах ───────────────────
  async listAssets(options: {
    courseId?:  string;
    lessonId?:  string;
    type?:      MediaAssetType;
    uploaderId?: string;
    skip?:      number;
    take?:      number;
  }) {
    const { courseId, lessonId, type, uploaderId, skip = 0, take = 50 } = options;
    const [assets, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where: {
          ...(courseId  ? { courseId }  : {}),
          ...(lessonId  ? { lessonId }  : {}),
          ...(type      ? { type }      : {}),
          ...(uploaderId ? { uploaderId } : {}),
        },
        include: {
          uploader: { select: { id: true, fullName: true, code: true } },
          lesson:   { select: { id: true, title: true } },
          course:   { select: { id: true, title: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.mediaAsset.count({
        where: {
          ...(courseId  ? { courseId }  : {}),
          ...(lessonId  ? { lessonId }  : {}),
          ...(type      ? { type }      : {}),
          ...(uploaderId ? { uploaderId } : {}),
        },
      }),
    ]);

    return { assets: assets.map(a => ({ ...a, sizeBytes: Number(a.sizeBytes) })), total, skip, take };
  }

  // ─── Файл устгах ─────────────────────────────────────────────────────────────
  async deleteAsset(id: string): Promise<{ success: boolean; message: string }> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Медиа файл олдсонгүй');

    // MinIO-оос устгах
    try {
      await this.minioClient.removeObject(this.bucket, asset.objectKey);
    } catch (err: any) {
      // Хэрэв MinIO-д байхгүй байсан ч metadata-г устгана
      console.warn(`MinIO removeObject warning: ${err.message}`);
    }

    // Өгөгдлийн сангаас metadata-г устгах
    await this.prisma.mediaAsset.delete({ where: { id } });

    return { success: true, message: 'Файл болон metadata амжилттай устгагдлаа' };
  }

  // ─── Backup хийхэд зориулсан: курсийн бүх медиа файлын задаргаа ────────────
  async getCourseMediaSummary(courseId: string) {
    const assets = await this.prisma.mediaAsset.findMany({
      where: { courseId },
      include: {
        lesson:   { select: { id: true, title: true } },
        uploader: { select: { fullName: true, code: true } },
      },
      orderBy: [{ lessonId: 'asc' }, { createdAt: 'asc' }],
    });

    const totalSizeBytes = assets.reduce((sum, a) => sum + Number(a.sizeBytes), 0);
    const byType = assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});

    return {
      courseId,
      totalFiles: assets.length,
      totalSizeMB: (totalSizeBytes / 1024 / 1024).toFixed(2),
      byType,
      assets: assets.map(a => ({
        id:           a.id,
        objectKey:    a.objectKey,
        publicUrl:    a.publicUrl,
        type:         a.type,
        originalName: a.originalName,
        mimeType:     a.mimeType,
        sizeBytes:    Number(a.sizeBytes),
        lesson:       a.lesson,
        uploader:     a.uploader,
        createdAt:    a.createdAt,
      })),
    };
  }

  // ─── Туслах: файлын өргөтгөлийг авах ────────────────────────────────────────
  private extractExt(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
  }
}
