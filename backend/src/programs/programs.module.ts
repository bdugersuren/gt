import { Module } from '@nestjs/common';
import { ProgramsController } from '../controllers/programs.controller';
import { ProgramsService } from '../services/programs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [ProgramsController], providers: [ProgramsService], exports: [ProgramsService] })
export class ProgramsModule {}
