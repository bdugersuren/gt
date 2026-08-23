import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { CareerService } from '../services/career.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('career')
export class CareerController {
  constructor(private careerService: CareerService) {}

  /**
   * Retrieves matched job vacancies based on the student's completed competency units.
   * Access is limited to authenticated students.
   */
  @Get('match-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getMatchedJobs(@Request() req: any) {
    return this.careerService.matchJobs(req.user.id);
  }

  @Get('gamification/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getGamificationStats(@Request() req: any) {
    return this.careerService.getGamificationStats(req.user.id);
  }

  @Get('gamification/leaderboard')
  async getLeaderboard() {
    return this.careerService.getLeaderboard();
  }

  /**
   * Retrieves public E-Portfolio data (unauthenticated, public access) for recruiters.
   */
  @Get('portfolio/:code')
  async getPublicPortfolio(@Param('code') code: string) {
    return this.careerService.getPublicPortfolio(code);
  }
}
