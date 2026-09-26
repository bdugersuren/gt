import { Module } from '@nestjs/common';
import { PromotionsController } from '../controllers/promotions.controller';
import { PromotionsService } from '../services/promotions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [PromotionsController], providers: [PromotionsService] })
export class PromotionsModule {}
