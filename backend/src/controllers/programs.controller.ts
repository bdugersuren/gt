import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProgramsService } from '../services/programs.service';
import { CreateProgramDto, CreateProgramGradeCourseDto } from '../programs/dto/create-program.dto';
import { UpdateProgramDto } from '../programs/dto/update-program.dto';

@Controller('programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgramsController {
  constructor(private service: ProgramsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() @Roles(Role.ADMIN, Role.MANAGER) create(@Body() dto: CreateProgramDto) { return this.service.create(dto); }
  @Patch(':id') @Roles(Role.ADMIN, Role.MANAGER) update(@Param('id') id: string, @Body() dto: UpdateProgramDto) { return this.service.update(id, dto); }
  @Patch(':id/archive') @Roles(Role.ADMIN, Role.MANAGER) archive(@Param('id') id: string) { return this.service.archive(id); }
  @Delete(':id') @Roles(Role.ADMIN, Role.MANAGER) remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/grade-courses') @Roles(Role.ADMIN, Role.MANAGER) addGradeCourse(@Param('id') id: string, @Body() dto: CreateProgramGradeCourseDto) { return this.service.addGradeCourse(id, dto); }
  @Delete(':id/grade-courses/:mappingId') @Roles(Role.ADMIN, Role.MANAGER) removeGradeCourse(@Param('id') id: string, @Param('mappingId') mappingId: string) { return this.service.removeGradeCourse(id, mappingId); }
}
