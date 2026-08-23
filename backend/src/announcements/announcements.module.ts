import { Module } from '@nestjs/common';
import { AnnouncementsController } from '../controllers/announcements.controller';
import { AnnouncementsService } from '../services/announcements.service';

@Module({
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
