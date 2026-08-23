import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideosController } from '../controllers/videos.controller';
import { VideosService } from '../services/videos.service';

@Module({
  imports: [
    // Register the BullMQ video transcoding queue
    BullModule.registerQueue({
      name: 'video_transcoding',
    }),
  ],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
