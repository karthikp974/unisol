import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit, StreamableFile } from "@nestjs/common";
import {
  AnnouncementAudience,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementTeacherScope,
  PermissionAction,
  Prisma,
  StructureStatus,
  UserType
} from "@prisma/client";
import { createReadStream, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { AuthUser, ScopeRef, TeacherAssignmentContext } from "../auth/auth.types";
import { toPagination } from "../common/pagination.dto";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { AnnouncementQueryDto, CreateAnnouncementDto, UpdateAnnouncementDto } from "./announcements.dto";

const UPLOAD_ROOT = join(process.cwd(), "uploads", "announcements");
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
]);

@Injectable()
export class AnnouncementsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService
  ) {}

  onModuleInit() {
    if (!existsSync(UPLOAD_ROOT)) mkdirSync(UPLOAD_ROOT, { recursive: true });
  }

  async list(user: AuthUser, query: AnnouncementQueryDto) {
    const pagination = toPagination(query);
    const now = new Date();
    const expiry: Prisma.AnnouncementWhereInput = { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };

    if (user.type === UserType.ADMIN) {
      const where = this.buildAdminWhere(query);
      const [rows, total] = await this.fetchPage(where, pagination, query.includeReadStatus === true, user.id);
      return { items: rows.map((r) => this.toListDto(r, user.id)), total, page: pagination.page, pageSize: pagination.pageSize };
    }

    if (user.type === UserType.STUDENT) {
      const student = await this.prisma.studentProfile.findUnique({ where: { userId: user.id }, include: this.studentInclude });
      if (!student) return { items: [], total: 0, page: pagination.page, pageSize: pagination.pageSize };
      const where = this.buildStudentWhere(student, query, expiry);
      const [rows, total] = await this.fetchPage(where, pagination, true, user.id);
      return { items: rows.map((r) => this.toListDto(r, user.id)), total, page: pagination.page, pageSize: pagination.pageSize };
    }

    const where = this.buildTeacherWhere(user, query, expiry);
    const include = this.listInclude(true, user.id);
    const orderBy: Prisma.AnnouncementOrderByWithRelationInput[] = [{ pinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }];
    const candidates = await this.prisma.announcement.findMany({ where, include, orderBy, take: 400 });
    const filtered = candidates.filter((r) => this.teacherSeesAnnouncement(user, r));
    const total = filtered.length;
    const rows = filtered.slice(pagination.skip, pagination.skip + pagination.take);
    return { items: rows.map((r) => this.toListDto(r, user.id)), total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async getOne(user: AuthUser, id: string) {
    const row = await this.prisma.announcement.findUnique({
      where: { id },
      include: this.listInclude(true, user.id)
    });
    if (!row) throw new NotFoundException("Announcement not found.");
    await this.assertCanView(user, row);
    return { announcement: this.toDetailDto(row, user.id) };
  }

  async create(user: AuthUser, dto: CreateAnnouncementDto) {
    if (user.type === UserType.STUDENT) throw new ForbiddenException("Students cannot publish announcements.");
    const structural = await this.validateScope({
      campusId: dto.campusId,
      programId: dto.programId,
      branchId: dto.branchId,
      batchId: dto.batchId,
      classId: dto.classId,
      sectionId: dto.sectionId
    });
    let structuralData = structural;
    if (dto.audience === AnnouncementAudience.TEACHERS) {
      structuralData = {};
    }
    const teacher = this.normalizeTeacherFields(dto.audience, dto);
    if (user.type === UserType.TEACHER && !Object.values(structural).some(Boolean) && dto.audience !== AnnouncementAudience.TEACHERS) {
      throw new ForbiddenException("Teachers must publish student-targeted announcements inside an assigned scope.");
    }
    if (user.type === UserType.TEACHER && dto.audience === AnnouncementAudience.TEACHERS && teacher.teacherScope === AnnouncementTeacherScope.NONE) {
      throw new ForbiddenException("Teachers must choose a teacher audience scope.");
    }
    this.assertAllowed(user, PermissionAction.MANAGE_ANNOUNCEMENTS, this.mergeScope(structuralData, teacher));
    const status = dto.status ?? AnnouncementStatus.PUBLISHED;
    const pinned = dto.pinned ?? false;
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title.trim(),
        body: dto.body.trim(),
        audience: dto.audience,
        status,
        priority: dto.priority ?? AnnouncementPriority.NORMAL,
        pinned,
        pinnedAt: pinned ? new Date() : null,
        campusId: structuralData.campusId ?? null,
        programId: structuralData.programId ?? null,
        branchId: structuralData.branchId ?? null,
        batchId: structuralData.batchId ?? null,
        classId: structuralData.classId ?? null,
        sectionId: structuralData.sectionId ?? null,
        teacherScope: teacher.teacherScope,
        teacherCampusId: teacher.teacherCampusId ?? null,
        teacherProgramId: teacher.teacherProgramId ?? null,
        teacherBranchId: teacher.teacherBranchId ?? null,
        createdById: user.id,
        publishedAt: status === AnnouncementStatus.PUBLISHED ? new Date() : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined
      },
      include: this.listInclude(false, user.id)
    });
    await this.audit(user, "CREATE_ANNOUNCEMENT", "Announcement", announcement.id, { status, audience: dto.audience });
    return { announcement: this.toDetailDto(announcement as never, user.id) };
  }

  async update(user: AuthUser, id: string, dto: UpdateAnnouncementDto) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Announcement not found.");
    this.assertAllowed(user, PermissionAction.MANAGE_ANNOUNCEMENTS, this.announcementToScope(existing as never));

    const mergedAudience = dto.audience ?? existing.audience;
    const mergedScope: ScopeRef = {
      campusId: dto.campusId !== undefined ? dto.campusId ?? undefined : existing.campusId ?? undefined,
      programId: dto.programId !== undefined ? dto.programId ?? undefined : existing.programId ?? undefined,
      branchId: dto.branchId !== undefined ? dto.branchId ?? undefined : existing.branchId ?? undefined,
      batchId: dto.batchId !== undefined ? dto.batchId ?? undefined : existing.batchId ?? undefined,
      classId: dto.classId !== undefined ? dto.classId ?? undefined : existing.classId ?? undefined,
      sectionId: dto.sectionId !== undefined ? dto.sectionId ?? undefined : existing.sectionId ?? undefined
    };
    const structural =
      dto.campusId !== undefined ||
      dto.programId !== undefined ||
      dto.branchId !== undefined ||
      dto.batchId !== undefined ||
      dto.classId !== undefined ||
      dto.sectionId !== undefined
        ? await this.validateScope(mergedScope)
        : this.announcementToScope(existing as never);
    const teacher = this.normalizeTeacherFields(mergedAudience, { ...existing, ...dto, audience: mergedAudience } as CreateAnnouncementDto);

    const data: Prisma.AnnouncementUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.body !== undefined) data.body = dto.body.trim();
    if (dto.audience !== undefined) data.audience = dto.audience;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.pinned !== undefined) {
      data.pinned = dto.pinned;
      data.pinnedAt = dto.pinned ? new Date() : null;
    }
    if (dto.campusId !== undefined || dto.programId !== undefined || dto.branchId !== undefined || dto.batchId !== undefined || dto.classId !== undefined || dto.sectionId !== undefined) {
      data.campusId = structural.campusId ?? null;
      data.programId = structural.programId ?? null;
      data.branchId = structural.branchId ?? null;
      data.batchId = structural.batchId ?? null;
      data.classId = structural.classId ?? null;
      data.sectionId = structural.sectionId ?? null;
    }
    if (dto.teacherScope !== undefined || dto.audience !== undefined) {
      data.teacherScope = teacher.teacherScope;
      data.teacherCampusId = teacher.teacherCampusId ?? null;
      data.teacherProgramId = teacher.teacherProgramId ?? null;
      data.teacherBranchId = teacher.teacherBranchId ?? null;
    }

    const announcement = await this.prisma.announcement.update({ where: { id }, data, include: this.listInclude(false, user.id) });
    await this.audit(user, "UPDATE_ANNOUNCEMENT", "Announcement", id, {});
    return { announcement: this.toDetailDto(announcement as never, user.id) };
  }

  async archive(user: AuthUser, id: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException("Announcement not found.");
    this.assertAllowed(user, PermissionAction.MANAGE_ANNOUNCEMENTS, this.announcementToScope(announcement as never));
    await this.prisma.announcement.update({ where: { id }, data: { status: AnnouncementStatus.ARCHIVED } });
    await this.audit(user, "ARCHIVE_ANNOUNCEMENT", "Announcement", id);
    return { ok: true };
  }

  async markRead(user: AuthUser, id: string) {
    const row = await this.prisma.announcement.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Announcement not found.");
    await this.assertCanView(user, row as never);
    await this.prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId: user.id } },
      create: { announcementId: id, userId: user.id },
      update: { readAt: new Date() }
    });
    return { ok: true };
  }

  async addAttachment(user: AuthUser, announcementId: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException("Missing file.");
    if (file.size > MAX_ATTACHMENT_BYTES) throw new BadRequestException("Attachment too large (max 10MB).");
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException("Unsupported file type.");
    const announcement = await this.prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) throw new NotFoundException("Announcement not found.");
    this.assertAllowed(user, PermissionAction.MANAGE_ANNOUNCEMENTS, this.announcementToScope(announcement as never));

    const dir = join(UPLOAD_ROOT, announcementId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ext = this.extFromMime(file.mimetype);
    const storageKey = `${announcementId}/${randomUUID()}${ext}`;
    const full = join(UPLOAD_ROOT, storageKey);
    const fs = await import("fs/promises");
    await fs.writeFile(full, file.buffer);

    const att = await this.prisma.announcementAttachment.create({
      data: {
        announcementId,
        originalName: file.originalname.slice(0, 240),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey
      }
    });
    return { attachment: { id: att.id, originalName: att.originalName, mimeType: att.mimeType, sizeBytes: att.sizeBytes } };
  }

  async downloadAttachment(user: AuthUser, attachmentId: string) {
    const att = await this.prisma.announcementAttachment.findUnique({ where: { id: attachmentId }, include: { announcement: true } });
    if (!att) throw new NotFoundException("Attachment not found.");
    await this.assertCanView(user, att.announcement as never);
    const full = join(UPLOAD_ROOT, att.storageKey);
    if (!existsSync(full)) throw new NotFoundException("File missing on disk.");
    const stream = createReadStream(full);
    return new StreamableFile(stream, { type: att.mimeType, disposition: `attachment; filename="${encodeURIComponent(att.originalName)}"` });
  }

  private extFromMime(mime: string) {
    if (mime === "application/pdf") return ".pdf";
    if (mime.includes("wordprocessingml")) return ".docx";
    if (mime === "image/png") return ".png";
    if (mime === "image/jpeg") return ".jpg";
    if (mime === "image/webp") return ".webp";
    if (mime === "image/gif") return ".gif";
    return "";
  }

  private async fetchPage(where: Prisma.AnnouncementWhereInput, pagination: ReturnType<typeof toPagination>, withRead: boolean, userId: string) {
    const include = this.listInclude(withRead, userId);
    const orderBy: Prisma.AnnouncementOrderByWithRelationInput[] = [{ pinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }];
    return Promise.all([
      this.prisma.announcement.findMany({ where, include, orderBy, skip: pagination.skip, take: pagination.take }),
      this.prisma.announcement.count({ where })
    ]);
  }

  private listInclude(withRead: boolean, userId: string): Prisma.AnnouncementInclude {
    return {
      createdBy: { select: { id: true, fullName: true } },
      attachments: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
      ...(withRead ? { reads: { where: { userId }, take: 1, select: { readAt: true } } } : {})
    };
  }

  private buildAdminWhere(query: AnnouncementQueryDto): Prisma.AnnouncementWhereInput {
    const parts: Prisma.AnnouncementWhereInput[] = [];
    if (query.audience) parts.push({ audience: query.audience });
    if (query.status) parts.push({ status: query.status });
    if (query.priority) parts.push({ priority: query.priority });
    if (query.campusId) parts.push({ campusId: query.campusId });
    if (query.sectionId) parts.push({ sectionId: query.sectionId });
    if (query.createdById) parts.push({ createdById: query.createdById });
    if (query.search?.trim()) {
      const s = query.search.trim();
      parts.push({
        OR: [{ title: { contains: s, mode: "insensitive" } }, { body: { contains: s, mode: "insensitive" } }, { id: { startsWith: s, mode: "insensitive" } }]
      });
    }
    return parts.length ? { AND: parts } : {};
  }

  private buildStudentWhere(
    student: Prisma.StudentProfileGetPayload<{ include: AnnouncementsService["studentInclude"] }>,
    query: AnnouncementQueryDto,
    expiry: Prisma.AnnouncementWhereInput
  ): Prisma.AnnouncementWhereInput {
    const s = this.studentToScope(student);
    const structural: Prisma.AnnouncementWhereInput[] = [
      { OR: [{ campusId: null }, { campusId: s.campusId }] },
      { OR: [{ programId: null }, { programId: s.programId }] },
      { OR: [{ branchId: null }, { branchId: s.branchId }] },
      { OR: s.batchId ? [{ batchId: null }, { batchId: s.batchId }] : [{ batchId: null }] },
      { OR: [{ classId: null }, { classId: s.classId }] },
      { OR: [{ sectionId: null }, { sectionId: s.sectionId }] }
    ];
    const parts: Prisma.AnnouncementWhereInput[] = [
      expiry,
      { status: AnnouncementStatus.PUBLISHED },
      { audience: { in: [AnnouncementAudience.STUDENTS, AnnouncementAudience.BOTH, AnnouncementAudience.ALL] } },
      ...structural
    ];
    if (query.search?.trim()) {
      const s2 = query.search.trim();
      parts.push({
        OR: [{ title: { contains: s2, mode: "insensitive" } }, { body: { contains: s2, mode: "insensitive" } }, { id: { startsWith: s2, mode: "insensitive" } }]
      });
    }
    return { AND: parts };
  }

  private buildTeacherWhere(user: AuthUser, query: AnnouncementQueryDto, expiry: Prisma.AnnouncementWhereInput): Prisma.AnnouncementWhereInput {
    const structuralOr = this.structuralOrFromAssignments(user.assignments);
    const campusIds = [...new Set(user.assignments.map((a) => a.campusId).filter(Boolean))] as string[];
    const programIds = [...new Set(user.assignments.map((a) => a.programId).filter(Boolean))] as string[];
    const branchIds = [...new Set(user.assignments.map((a) => a.branchId).filter(Boolean))] as string[];

    const teacherTargetOr: Prisma.AnnouncementWhereInput[] = [
      { teacherScope: AnnouncementTeacherScope.INSTITUTION },
      { AND: [{ teacherScope: AnnouncementTeacherScope.NONE }, { OR: structuralOr }] }
    ];
    if (campusIds.length) teacherTargetOr.push({ teacherScope: AnnouncementTeacherScope.CAMPUS, teacherCampusId: { in: campusIds } });
    if (programIds.length) teacherTargetOr.push({ teacherScope: AnnouncementTeacherScope.DEPARTMENT, teacherProgramId: { in: programIds } });
    if (branchIds.length) teacherTargetOr.push({ teacherScope: AnnouncementTeacherScope.BRANCH, teacherBranchId: { in: branchIds } });

    const parts: Prisma.AnnouncementWhereInput[] = [
      expiry,
      { status: AnnouncementStatus.PUBLISHED },
      { audience: { in: [AnnouncementAudience.TEACHERS, AnnouncementAudience.BOTH, AnnouncementAudience.ALL] } },
      { OR: teacherTargetOr }
    ];
    if (query.search?.trim()) {
      const s2 = query.search.trim();
      parts.push({
        OR: [{ title: { contains: s2, mode: "insensitive" } }, { body: { contains: s2, mode: "insensitive" } }, { id: { startsWith: s2, mode: "insensitive" } }]
      });
    }
    return { AND: parts };
  }

  private structuralOrFromAssignments(assignments: TeacherAssignmentContext[]): Prisma.AnnouncementWhereInput[] {
    const rows: Prisma.AnnouncementWhereInput[] = [
      { campusId: null, programId: null, branchId: null, batchId: null, classId: null, sectionId: null }
    ];
    for (const a of assignments) {
      rows.push({
        campusId: a.campusId ?? undefined,
        programId: a.programId ?? undefined,
        branchId: a.branchId ?? undefined,
        batchId: a.batchId ?? undefined,
        classId: a.classId ?? undefined,
        sectionId: a.sectionId ?? undefined
      });
    }
    return rows;
  }

  private mergeScope(s: ScopeRef, t: { teacherScope: AnnouncementTeacherScope; teacherCampusId?: string; teacherProgramId?: string; teacherBranchId?: string }): ScopeRef {
    return {
      ...s,
      campusId: t.teacherCampusId ?? s.campusId,
      programId: t.teacherProgramId ?? s.programId,
      branchId: t.teacherBranchId ?? s.branchId
    };
  }

  private normalizeTeacherFields(
    audience: AnnouncementAudience,
    dto: Pick<CreateAnnouncementDto, "teacherScope" | "teacherCampusId" | "teacherProgramId" | "teacherBranchId">
  ) {
    let teacherScope = dto.teacherScope ?? AnnouncementTeacherScope.NONE;
    let teacherCampusId = dto.teacherCampusId;
    let teacherProgramId = dto.teacherProgramId;
    let teacherBranchId = dto.teacherBranchId;

    if (audience === AnnouncementAudience.STUDENTS) {
      return { teacherScope: AnnouncementTeacherScope.NONE, teacherCampusId: undefined, teacherProgramId: undefined, teacherBranchId: undefined };
    }
    if (audience === AnnouncementAudience.TEACHERS || audience === AnnouncementAudience.BOTH) {
      if (teacherScope === AnnouncementTeacherScope.NONE) {
        throw new BadRequestException("Select how teachers should be targeted.");
      }
    }
    if (teacherScope === AnnouncementTeacherScope.INSTITUTION) {
      teacherCampusId = undefined;
      teacherProgramId = undefined;
      teacherBranchId = undefined;
    }
    if (teacherScope === AnnouncementTeacherScope.CAMPUS && !teacherCampusId) throw new BadRequestException("Campus is required for this teacher scope.");
    if (teacherScope === AnnouncementTeacherScope.DEPARTMENT && !teacherProgramId) throw new BadRequestException("Department is required for this teacher scope.");
    if (teacherScope === AnnouncementTeacherScope.BRANCH && !teacherBranchId) throw new BadRequestException("Branch is required for this teacher scope.");
    return { teacherScope, teacherCampusId, teacherProgramId, teacherBranchId };
  }

  private async assertCanView(user: AuthUser, row: any) {
    if (user.type === UserType.ADMIN) {
      this.assertAllowed(user, PermissionAction.VIEW_ANNOUNCEMENTS, this.announcementToScope(row as never));
      return;
    }
    const items = await this.filterVisible(user, [row as never]);
    if (!items.length) throw new ForbiddenException("You cannot view this announcement.");
  }

  private async filterVisible(user: AuthUser, items: any[]) {
    if (user.type === UserType.ADMIN) return items;
    if (user.type === UserType.STUDENT) {
      const student = await this.prisma.studentProfile.findUnique({ where: { userId: user.id }, include: this.studentInclude });
      if (!student) return [];
      const studentScope = this.studentToScope(student);
      return items.filter(
        (item) =>
          (item.audience === AnnouncementAudience.ALL ||
            item.audience === AnnouncementAudience.STUDENTS ||
            item.audience === AnnouncementAudience.BOTH) && this.scopeMatchesAnnouncement(studentScope, item)
      );
    }
    return items.filter((item) => {
      if (!(item.audience === AnnouncementAudience.ALL || item.audience === AnnouncementAudience.TEACHERS || item.audience === AnnouncementAudience.BOTH)) {
        return false;
      }
      return this.teacherSeesAnnouncement(user, item);
    });
  }

  private teacherSeesAnnouncement(user: AuthUser, item: any) {
    if (item.teacherScope === AnnouncementTeacherScope.INSTITUTION) return true;
    if (item.teacherScope === AnnouncementTeacherScope.CAMPUS && item.teacherCampusId) {
      return user.assignments.some((a) => a.campusId === item.teacherCampusId);
    }
    if (item.teacherScope === AnnouncementTeacherScope.DEPARTMENT && item.teacherProgramId) {
      return user.assignments.some((a) => a.programId === item.teacherProgramId);
    }
    if (item.teacherScope === AnnouncementTeacherScope.BRANCH && item.teacherBranchId) {
      return user.assignments.some((a) => a.branchId === item.teacherBranchId);
    }
    if (item.teacherScope === AnnouncementTeacherScope.NONE) {
      return this.permissions.can(user, { action: PermissionAction.VIEW_ANNOUNCEMENTS, scope: this.announcementToScope(item) }).allowed;
    }
    return false;
  }

  private toListDto(row: any, userId: string) {
    const readAt = row.reads?.[0]?.readAt ?? null;
    return {
      id: row.id,
      title: row.title,
      body: row.body.slice(0, 280) + (row.body.length > 280 ? "…" : ""),
      audience: row.audience,
      status: row.status,
      priority: row.priority,
      pinned: row.pinned,
      scope: this.announcementToScope(row as never),
      teacherScope: row.teacherScope,
      teacherCampusId: row.teacherCampusId,
      teacherProgramId: row.teacherProgramId,
      teacherBranchId: row.teacherBranchId,
      createdBy: row.createdBy.fullName,
      createdById: row.createdBy.id,
      publishedAt: row.publishedAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      attachments: row.attachments,
      readAt
    };
  }

  private toDetailDto(row: any, userId: string) {
    const base = this.toListDto(row, userId);
    return { ...base, body: row.body };
  }

  private async validateScope(scope: ScopeRef): Promise<ScopeRef> {
    if (!scope.campusId && !scope.programId && !scope.branchId && !scope.batchId && !scope.classId && !scope.sectionId) {
      return {};
    }
    if (scope.sectionId) {
      const section = await this.prisma.section.findUnique({
        where: { id: scope.sectionId },
        include: { class: { include: { branch: { include: { program: true } }, batch: true } } }
      });
      if (!section || section.status !== StructureStatus.ACTIVE) throw new BadRequestException("Announcement section is invalid or archived.");
      return {
        campusId: section.class.branch.program.campusId,
        programId: section.class.branch.programId,
        branchId: section.class.branchId,
        batchId: section.class.batchId ?? undefined,
        classId: section.classId,
        sectionId: section.id
      };
    }
    if (scope.classId) {
      const cls = await this.prisma.academicClass.findUnique({ where: { id: scope.classId }, include: { branch: { include: { program: true } }, batch: true } });
      if (!cls || cls.status !== StructureStatus.ACTIVE) throw new BadRequestException("Announcement class is invalid or archived.");
      return { campusId: cls.branch.program.campusId, programId: cls.branch.programId, branchId: cls.branchId, batchId: cls.batchId ?? undefined, classId: cls.id };
    }
    if (scope.batchId) {
      const batch = await this.prisma.batch.findUnique({ where: { id: scope.batchId }, include: { branch: { include: { program: true } } } });
      if (!batch || batch.status !== StructureStatus.ACTIVE) throw new BadRequestException("Announcement batch is invalid or archived.");
      return { campusId: batch.branch.program.campusId, programId: batch.branch.programId, branchId: batch.branchId, batchId: batch.id };
    }
    if (scope.branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: scope.branchId }, include: { program: true } });
      if (!branch || branch.status !== StructureStatus.ACTIVE) throw new BadRequestException("Announcement branch is invalid or archived.");
      return { campusId: branch.program.campusId, programId: branch.programId, branchId: branch.id };
    }
    if (scope.programId) {
      const program = await this.prisma.program.findUnique({ where: { id: scope.programId } });
      if (!program || program.status !== StructureStatus.ACTIVE) throw new BadRequestException("Announcement program is invalid or archived.");
      return { campusId: program.campusId, programId: program.id };
    }
    if (scope.campusId) {
      const campus = await this.prisma.campus.findUnique({ where: { id: scope.campusId } });
      if (!campus || campus.status !== StructureStatus.ACTIVE) throw new BadRequestException("Announcement campus is invalid or archived.");
      return { campusId: campus.id };
    }
    return {};
  }

  private studentToScope(student: Prisma.StudentProfileGetPayload<{ include: AnnouncementsService["studentInclude"] }>): ScopeRef {
    return {
      campusId: student.section.class.branch.program.campusId,
      programId: student.section.class.branch.programId,
      branchId: student.section.class.branchId,
      batchId: student.section.class.batchId ?? undefined,
      classId: student.section.classId,
      sectionId: student.sectionId
    };
  }

  private announcementToScope(announcement: { campusId: string | null; programId: string | null; branchId: string | null; batchId: string | null; classId: string | null; sectionId: string | null }): ScopeRef {
    return {
      campusId: announcement.campusId ?? undefined,
      programId: announcement.programId ?? undefined,
      branchId: announcement.branchId ?? undefined,
      batchId: announcement.batchId ?? undefined,
      classId: announcement.classId ?? undefined,
      sectionId: announcement.sectionId ?? undefined
    };
  }

  private scopeMatchesAnnouncement(scope: ScopeRef, announcement: { campusId: string | null; programId: string | null; branchId: string | null; batchId: string | null; classId: string | null; sectionId: string | null }) {
    const target = this.announcementToScope(announcement);
    return Object.entries(target).every(([key, value]) => !value || scope[key as keyof ScopeRef] === value);
  }

  private assertAllowed(user: AuthUser, action: PermissionAction, scope?: ScopeRef) {
    const decision = this.permissions.can(user, { action, scope });
    if (!decision.allowed) throw new ForbiddenException(decision.reason);
  }

  private audit(user: AuthUser, action: string, entity: string, entityId: string, metadata?: Prisma.InputJsonObject) {
    return this.prisma.auditLog.create({ data: { userId: user.id, action, entity, entityId, metadata } });
  }

  private readonly studentInclude = {
    user: true,
    section: { include: { class: { include: { branch: { include: { program: true } }, batch: true } } } }
  } satisfies Prisma.StudentProfileInclude;
}
