import { Module } from '@nestjs/common';
import { EsisController } from '../controllers/esis.controller';
import { EsisService } from '../services/esis.service';

@Module({
  controllers: [EsisController],
  providers: [EsisService],
  exports: [EsisService],
})
export class EsisModule {}
