import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PermissionAction } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";
import { BulkCreateStudentsDto, CreateStudentDto, ResetStudentPasswordDto, StudentListQueryDto, UpdateStudentDto } from "./students.dto";
import { StudentsService } from "./students.service";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("students")
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  list(@Query() query: StudentListQueryDto) {
    return this.students.list(query);
  }

  @Get("search")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  search(@Query() query: StudentListQueryDto) {
    return this.students.search(query);
  }

  @Get(":id")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  get(@Param("id") id: string) {
    return this.students.get(id);
  }

  @Post()
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  create(@Body() dto: CreateStudentDto) {
    return this.students.create(dto);
  }

  @Post("bulk")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  bulkCreate(@Body() dto: BulkCreateStudentsDto) {
    return this.students.bulkCreate(dto);
  }

  @Patch(":id")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  update(@Param("id") id: string, @Body() dto: UpdateStudentDto) {
    return this.students.update(id, dto);
  }

  @Post(":id/deactivate")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  deactivate(@Param("id") id: string) {
    return this.students.deactivate(id);
  }

  @Delete(":id")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  archive(@Param("id") id: string) {
    return this.students.archive(id);
  }

  @Post(":id/reactivate")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  reactivate(@Param("id") id: string) {
    return this.students.reactivate(id);
  }

  @Post(":id/reset-password")
  @RequiresPermission(PermissionAction.MANAGE_USERS)
  resetPassword(@Param("id") id: string, @Body() dto: ResetStudentPasswordDto) {
    return this.students.resetPassword(id, dto);
  }
}
