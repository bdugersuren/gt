import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PromotionsService } from '../services/promotions.service';
import { ApprovePromotionDto, GraduateDto, PromotionQueryDto, RejectPromotionDto } from '../promotions/dto/promotion.dto';

@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class PromotionsController {
  constructor(private service: PromotionsService) {}
  @Get() list() { return this.service.list(); }
  @Get('candidates') candidates(@Query() query: PromotionQueryDto) { return this.service.candidates(query); }
  @Post('preview') preview(@Body() query: PromotionQueryDto) { return this.service.candidates(query); }
  @Post('approve') approve(@Body() dto: ApprovePromotionDto, @Request() req: any) { return this.service.approve(dto, req.user.id); }
  @Post('reject') reject(@Body() dto: RejectPromotionDto, @Request() req: any) { return this.service.reject(dto, req.user.id); }
  @Post('graduate') graduate(@Body() dto: GraduateDto, @Request() req: any) { return this.service.graduate(dto, req.user.id); }
}
