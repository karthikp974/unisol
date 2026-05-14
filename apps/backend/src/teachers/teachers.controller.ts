import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PermissionAction } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";
import {
  BulkCreateTeachersDto,
  CreateTeacherDto,
  ResetTeacherPasswordDto,
  TeacherListQueryDto,
  UpdateTeacherAssignmentsDto,
  UpdateTeacherDto
} from "./teachers.dto";
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

  @Get("search")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  search(@Query() query: TeacherListQueryDto) {
    return this.teachers.search(query);
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

  @Post("bulk")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  bulkCreate(@Body() dto: BulkCreateTeachersDto) {
    return this.teachers.bulkCreate(dto);
  }

  @Patch(":id")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  update(@Param("id") id: string, @Body() dto: UpdateTeacherDto) {
    return this.teachers.update(id, dto);
  }

  @Patch(":id/assignments")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  updateAssignments(@Param("id") id: string, @Body() dto: UpdateTeacherAssignmentsDto) {
    return this.teachers.updateAssignments(id, dto);
  }

  @Post(":id/deactivate")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  deactivate(@Param("id") id: string) {
    return this.teachers.deactivate(id);
  }

  @Delete(":id")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  archive(@Param("id") id: string) {
    return this.teachers.archive(id);
  }

  @Post(":id/reactivate")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  reactivate(@Param("id") id: string) {
    return this.teachers.reactivate(id);
  }

  @Post(":id/reset-password")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  resetPassword(@Param("id") id: string, @Body() dto: ResetTeacherPasswordDto) {
    return this.teachers.resetPassword(id, dto);
  }
}
