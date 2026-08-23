import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ClassGroupsService } from '../services/class-groups.service';
import { CreateClassGroupDto } from '../class-groups/dto/create-class-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('class-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassGroupsController {
  constructor(private classGroupsService: ClassGroupsService) {}

  // Get list of all class groups
  @Get()
  async findAll() {
    return this.classGroupsService.findAll();
  }

  // Get details of a single class group (includes students list)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.classGroupsService.findOne(id);
  }

  // Create a new class group (Restricted to Admins and Managers)
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  async create(@Body() createClassGroupDto: CreateClassGroupDto) {
    return this.classGroupsService.create(createClassGroupDto);
  }
}
