import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PermissionAction } from "@prisma/client";
import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";
import { ReportsQueryDto } from "./reports.dto";
import { ReportsService } from "./reports.service";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("summary")
  @RequiresPermission(PermissionAction.VIEW_REPORTS)
  summary(@CurrentUser() user: AuthUser, @Query() query: ReportsQueryDto) {
    return this.reports.summary(user, query);
  }

  @Get("attendance")
  @RequiresPermission(PermissionAction.VIEW_REPORTS)
  attendance(@CurrentUser() user: AuthUser, @Query() query: ReportsQueryDto) {
    return this.reports.attendance(user, query);
  }

  @Get("finance")
  @RequiresPermission(PermissionAction.VIEW_REPORTS)
  finance(@CurrentUser() user: AuthUser, @Query() query: ReportsQueryDto) {
    return this.reports.finance(user, query);
  }

  @Get("results")
  @RequiresPermission(PermissionAction.VIEW_REPORTS)
  results(@CurrentUser() user: AuthUser, @Query() query: ReportsQueryDto) {
    return this.reports.results(user, query);
  }

  @Get("attendance/export")
  @RequiresPermission(PermissionAction.VIEW_REPORTS)
  exportAttendance(@CurrentUser() user: AuthUser, @Query() query: ReportsQueryDto) {
    return this.reports.exportAttendance(user, query);
  }
}
