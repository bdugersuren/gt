import { Module } from '@nestjs/common';
import { EvaluationsController } from '../controllers/evaluations.controller';
import { EvaluationsService } from '../services/evaluations.service';

@Module({
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
