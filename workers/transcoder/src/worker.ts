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

      // 3. Transcode raw video to HLS (720p, mobile-friendly encoding)
      console.log(`[Job ${job.id}] Starting FFmpeg transcoding...`);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(localInputPath)
          .outputOptions([
            '-profile:v main',
            '-vf scale=-2:720', // Scale height to 720p, automatically calculate width keeping aspect ratio (divisible by 2)
            '-c:a aac',
            '-ar 48000',
            '-b:a 128k',
            '-c:v h264',
            '-pix_fmt yuv420p',
            '-crf 23',
            '-maxrate 1500k',
            '-bufsize 3000k',
            '-hls_time 6', // Split segments every 6 seconds
            '-hls_playlist_type vod',
            '-hls_segment_filename', path.join(localOutputDir, 'segment_%03d.ts')
          ])
          .output(path.join(localOutputDir, 'index.m3u8'))
          .on('start', (cmd) => {
            console.log(`[Job ${job.id}] Spawned FFmpeg command:`, cmd);
          })
          .on('progress', (progress) => {
            // Update BullMQ progress percentage
            job.updateProgress(Math.floor(progress.percent || 0));
          })
          .on('end', () => {
            console.log(`[Job ${job.id}] FFmpeg transcoding finished successfully.`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`[Job ${job.id}] FFmpeg error:`, err);
            reject(err);
          })
          .run();
      });

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
