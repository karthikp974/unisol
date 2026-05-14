import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { PermissionAction } from "@prisma/client";
import { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";
import { AnnouncementQueryDto, CreateAnnouncementDto, UpdateAnnouncementDto } from "./announcements.dto";
import { AnnouncementsService } from "./announcements.service";

const upload = memoryStorage();
const maxBytes = 10 * 1024 * 1024;

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  @RequiresPermission(PermissionAction.VIEW_ANNOUNCEMENTS)
  list(@CurrentUser() user: AuthUser, @Query() query: AnnouncementQueryDto) {
    return this.announcements.list(user, query);
  }

  @Get(":id/attachments/:attachmentId/file")
  @RequiresPermission(PermissionAction.VIEW_ANNOUNCEMENTS)
  downloadAttachment(@CurrentUser() user: AuthUser, @Param("attachmentId") attachmentId: string) {
    return this.announcements.downloadAttachment(user, attachmentId);
  }

  @Get(":id")
  @RequiresPermission(PermissionAction.VIEW_ANNOUNCEMENTS)
  getOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.announcements.getOne(user, id);
  }

  @Post()
  @RequiresPermission(PermissionAction.MANAGE_ANNOUNCEMENTS)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAnnouncementDto) {
    return this.announcements.create(user, dto);
  }

  @Patch(":id")
  @RequiresPermission(PermissionAction.MANAGE_ANNOUNCEMENTS)
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcements.update(user, id, dto);
  }

  @Post(":id/archive")
  @RequiresPermission(PermissionAction.MANAGE_ANNOUNCEMENTS)
  archive(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.announcements.archive(user, id);
  }

  @Post(":id/read")
  @RequiresPermission(PermissionAction.VIEW_ANNOUNCEMENTS)
  markRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.announcements.markRead(user, id);
  }

  @Post(":id/attachments")
  @RequiresPermission(PermissionAction.MANAGE_ANNOUNCEMENTS)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: upload,
      limits: { fileSize: maxBytes }
    })
  )
  uploadAttachment(@CurrentUser() user: AuthUser, @Param("id") id: string, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file?.buffer) throw new BadRequestException("File is required.");
    return this.announcements.addAttachment(user, id, file);
  }
}
