import { Module } from '@nestjs/common';
import { ClassGroupsController } from '../controllers/class-groups.controller';
import { ClassGroupsService } from '../services/class-groups.service';

@Module({
  controllers: [ClassGroupsController],
  providers: [ClassGroupsService],
  exports: [ClassGroupsService],
})
export class ClassGroupsModule {}
