import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DepartmentsService } from '../services/departments.service';
import { CreateDepartmentDto } from '../departments/dto/create-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private departmentsService: DepartmentsService) {}

  // Get list of all departments
  @Get()
  async findAll() {
    return this.departmentsService.findAll();
  }

  // Get details of a single department
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  // Create a new department (Restricted to Admins and Managers)
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  async create(@Body() createDeptDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDeptDto);
  }
}
