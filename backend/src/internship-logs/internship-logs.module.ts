import { Module } from '@nestjs/common';
import { InternshipLogsController } from '../controllers/internship-logs.controller';
import { InternshipLogsService } from '../services/internship-logs.service';

@Module({
  controllers: [InternshipLogsController],
  providers: [InternshipLogsService],
  exports: [InternshipLogsService],
})
export class InternshipLogsModule {}
