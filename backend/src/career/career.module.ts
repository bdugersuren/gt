import { Module } from '@nestjs/common';
import { CareerController } from '../controllers/career.controller';
import { CareerService } from '../services/career.service';

@Module({
  controllers: [CareerController],
  providers: [CareerService],
  exports: [CareerService],
})
export class CareerModule {}
