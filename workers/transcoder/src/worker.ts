import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import * as Minio from 'minio';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Connect to Redis instance
const connection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
});

const callbackUrl = process.env.BACKEND_CALLBACK_URL || 'http://backend:5000/api/videos/transcode-callback';
const callbackToken = process.env.TRANSCODER_SHARED_SECRET;
if (!callbackToken) throw new Error('TRANSCODER_SHARED_SECRET is required');

// Connect to MinIO instance
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

console.log('Video Transcoder worker starting up...');

// Create a BullMQ Worker
const worker = new Worker(
  'video_transcoding',
  async (job: Job) => {
    const { inputBucket, inputKey, outputBucket, outputKeyPrefix, lessonId, submissionId } = job.data;
    console.log(`[Job ${job.id}] Processing video transcoding:`, { inputBucket, inputKey, outputBucket, outputKeyPrefix });

    // 1. Create a secure temporary workspace
    const tmpDir = path.join(os.tmpdir(), `transcode_job_${job.id}`);
    const localInputPath = path.join(tmpDir, 'input.mp4');
    const localOutputDir = path.join(tmpDir, 'hls');

    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(localOutputDir, { recursive: true });

    try {
      // 2. Download raw video from MinIO
      console.log(`[Job ${job.id}] Downloading raw video from MinIO: ${inputBucket}/${inputKey}...`);
      await minioClient.fGetObject(inputBucket, inputKey, localInputPath);

      // 3. Transcode raw video to Adaptive Multi-Bitrate HLS (360p, 480p, 720p)
      console.log(`[Job ${job.id}] Starting Adaptive Multi-Bitrate FFmpeg transcoding...`);

      const profiles = [
        { name: '360p', height: 360, vBitrate: '400k', maxRate: '500k', bufSize: '1000k', aBitrate: '64k', bandwidth: 464000, width: 640 },
        { name: '480p', height: 480, vBitrate: '800k', maxRate: '1000k', bufSize: '2000k', aBitrate: '96k', bandwidth: 896000, width: 854 },
        { name: '720p', height: 720, vBitrate: '1500k', maxRate: '1800k', bufSize: '3000k', aBitrate: '128k', bandwidth: 1628000, width: 1280 },
      ];

      for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];
        console.log(`[Job ${job.id}] Encoding profile ${p.name} (${i + 1}/${profiles.length})...`);
        await new Promise<void>((resolve, reject) => {
          ffmpeg(localInputPath)
            .outputOptions([
              '-profile:v main',
              `-vf scale=-2:${p.height}`,
              '-c:a aac',
              '-ar 48000',
              `-b:a ${p.aBitrate}`,
              '-c:v h264',
              '-pix_fmt yuv420p',
              '-crf 23',
              `-b:v ${p.vBitrate}`,
              `-maxrate ${p.maxRate}`,
              `-bufsize ${p.bufSize}`,
              '-hls_time 6',
              '-hls_playlist_type vod',
              '-hls_segment_filename', path.join(localOutputDir, `${p.name}_%03d.ts`),
            ])
            .output(path.join(localOutputDir, `${p.name}.m3u8`))
            .on('progress', (progress) => {
              const base = Math.floor((i / profiles.length) * 100);
              const slice = Math.floor(((progress.percent || 0) / profiles.length));
              job.updateProgress(Math.min(99, base + slice));
            })
            .on('end', () => {
              console.log(`[Job ${job.id}] Profile ${p.name} finished successfully.`);
              resolve();
            })
            .on('error', (err) => {
              console.error(`[Job ${job.id}] Profile ${p.name} error:`, err);
              reject(err);
            })
            .run();
        });
      }

      // Generate Master Playlist index.m3u8 pointing to the variants
      const masterPlaylistContent = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        ...profiles.flatMap((p) => [
          `#EXT-X-STREAM-INF:BANDWIDTH=${p.bandwidth},RESOLUTION=${p.width}x${p.height},NAME="${p.name}"`,
          `${p.name}.m3u8`,
        ]),
      ].join('\n');

      fs.writeFileSync(path.join(localOutputDir, 'index.m3u8'), masterPlaylistContent);
      console.log(`[Job ${job.id}] Master playlist index.m3u8 created successfully.`);

      // 4. Upload HLS output files (.m3u8 and .ts files) back to MinIO
      console.log(`[Job ${job.id}] Uploading HLS segments to MinIO output path: ${outputBucket}/${outputKeyPrefix}...`);
      const files = fs.readdirSync(localOutputDir);
      for (const file of files) {
        const filePath = path.join(localOutputDir, file);
        const objectKey = `${outputKeyPrefix}${file}`;
        
        let contentType = 'application/octet-stream';
        if (file.endsWith('.m3u8')) contentType = 'application/x-mpegURL';
        else if (file.endsWith('.ts')) contentType = 'video/MP2T';

        await minioClient.fPutObject(outputBucket, objectKey, filePath, {
          'Content-Type': contentType,
        });
      }

      const hlsStreamUrl = `/minio/${outputBucket}/${outputKeyPrefix}index.m3u8`;
      console.log(`[Job ${job.id}] Successfully uploaded all HLS segments. HLS Manifest: ${hlsStreamUrl}`);

      // 5. Send Callback request to NestJS backend API inside lms-net
      console.log(`[Job ${job.id}] Sending callback to NestJS backend...`);
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-transcoder-token': callbackToken,
        },
        body: JSON.stringify({
          success: true,
          lessonId,
          submissionId,
          hlsStreamUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`NestJS backend callback failed: ${response.statusText} (${response.status})`);
      }

      console.log(`[Job ${job.id}] Callback processed successfully.`);
      return { success: true, hlsStreamUrl };

    } catch (error: any) {
      console.error(`[Job ${job.id}] Processing failed:`, error);
      
      // Notify backend of failure
      try {
        await fetch(callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-transcoder-token': callbackToken,
          },
          body: JSON.stringify({
            success: false,
            lessonId,
            submissionId,
            error: error.message || 'Unknown transcoding error',
          }),
        });
      } catch (cbErr) {
        console.error(`[Job ${job.id}] Failed to send failure callback:`, cbErr);
      }

      throw error; // Let BullMQ mark the job as failed

    } finally {
      // 6. Clean up temporary files on local disk
      try {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
          console.log(`[Job ${job.id}] Temporary workspace cleaned up.`);
        }
      } catch (cleanupErr) {
        console.error(`[Job ${job.id}] Failed to clean up temp dir:`, cleanupErr);
      }
    }
  },
  {
    connection,
    concurrency: 1, // Process one video at a time to prevent high CPU starvation
  }
);

worker.on('completed', (job) => {
  console.log(`[Job ${job.id}] Completed successfully!`);
});

worker.on('failed', (job, err) => {
  console.error(`[Job ${job?.id}] Failed with error:`, err);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}; closing worker`);
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
