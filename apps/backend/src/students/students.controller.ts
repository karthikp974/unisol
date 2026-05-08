import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PermissionAction } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";
import { CreateStudentDto, StudentListQueryDto, UpdateStudentDto } from "./students.dto";
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
}
