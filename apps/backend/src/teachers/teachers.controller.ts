import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PermissionAction } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";
import { CreateTeacherDto, TeacherListQueryDto } from "./teachers.dto";
import { TeachersService } from "./teachers.service";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("teachers")
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Get()
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  list(@Query() query: TeacherListQueryDto) {
    return this.teachers.list(query);
  }

  @Get(":id")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  get(@Param("id") id: string) {
    return this.teachers.get(id);
  }

  @Post("validate")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  validate(@Body() dto: CreateTeacherDto) {
    return this.teachers.validate(dto);
  }

  @Post()
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  create(@Body() dto: CreateTeacherDto) {
    return this.teachers.create(dto);
  }
}
