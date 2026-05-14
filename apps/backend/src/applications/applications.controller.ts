import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PermissionAction } from "@prisma/client";
import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";
import { ApplicationQueryDto, CreateApplicationDto, ReviewApplicationDto } from "./applications.dto";
import { ApplicationsService } from "./applications.service";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("applications")
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  @RequiresPermission(PermissionAction.VIEW_APPLICATIONS)
  list(@CurrentUser() user: AuthUser, @Query() query: ApplicationQueryDto) {
    return this.applications.list(user, query);
  }

  @Get("me")
  @RequiresPermission(PermissionAction.VIEW_APPLICATIONS)
  myApplications(@CurrentUser() user: AuthUser, @Query() query: ApplicationQueryDto) {
    return this.applications.myApplications(user, query);
  }

  @Post()
  @RequiresPermission(PermissionAction.VIEW_APPLICATIONS)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateApplicationDto) {
    return this.applications.create(user, dto);
  }

  @Patch(":id/review")
  @RequiresPermission(PermissionAction.MANAGE_APPLICATIONS)
  review(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ReviewApplicationDto) {
    return this.applications.review(user, id, dto);
  }
}
