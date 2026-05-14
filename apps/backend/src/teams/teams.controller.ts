import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PermissionAction } from "@prisma/client";
import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";
import { CreateTeamDto, TeamQueryDto } from "./teams.dto";
import { TeamsService } from "./teams.service";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @RequiresPermission(PermissionAction.VIEW_TEAMS)
  list(@CurrentUser() user: AuthUser, @Query() query: TeamQueryDto) {
    return this.teams.list(user, query);
  }

  @Get("me")
  @RequiresPermission(PermissionAction.VIEW_TEAMS)
  myTeams(@CurrentUser() user: AuthUser) {
    return this.teams.myTeams(user);
  }

  @Get("options")
  @RequiresPermission(PermissionAction.VIEW_TEAMS)
  options(@CurrentUser() user: AuthUser) {
    return this.teams.options(user);
  }

  @Post()
  @RequiresPermission(PermissionAction.MANAGE_TEAMS)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teams.create(user, dto);
  }

  @Post(":id/archive")
  @RequiresPermission(PermissionAction.MANAGE_TEAMS)
  archive(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.teams.archive(user, id);
  }
}
