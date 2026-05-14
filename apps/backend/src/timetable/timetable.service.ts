import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PermissionAction, Prisma, StructureStatus, TimetableSlotStatus, UserType } from "@prisma/client";
import { AuthUser, ScopeRef } from "../auth/auth.types";
import { toPagination } from "../common/pagination.dto";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTimetableSlotDto, TimetableQueryDto, UpdateTimetableSlotDto } from "./timetable.dto";

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService
  ) {}

  async list(user: AuthUser, query: TimetableQueryDto) {
    if (user.type === UserType.STUDENT) {
      return this.myTimetable(user);
    }

    const scope = this.queryToScope(query);
    if (user.type === UserType.TEACHER && !scope && !query.teacherProfileId) {
      throw new ForbiddenException("Teacher timetable lists must be filtered by assigned scope or own profile.");
    }
    if (user.type === UserType.TEACHER && query.teacherProfileId) {
      const ownProfile = await this.prisma.teacherProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!ownProfile || ownProfile.id !== query.teacherProfileId) {
        throw new ForbiddenException("Teachers can only view their own teacher timetable directly.");
      }
    }
    if (scope) this.assertAllowed(user, PermissionAction.MANAGE_TIMETABLE, scope);

    const pagination = toPagination(query);
    const where: Prisma.TimetableSlotWhereInput = {
      status: TimetableSlotStatus.ACTIVE,
      campusId: query.campusId,
      classId: query.classId,
      sectionId: query.sectionId,
      teacherProfileId: query.teacherProfileId,
      ...(query.search
        ? {
            OR: [
              { room: { contains: query.search, mode: "insensitive" } },
              { subject: { name: { contains: query.search, mode: "insensitive" } } },
              { teacherProfile: { user: { fullName: { contains: query.search, mode: "insensitive" } } } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.timetableSlot.findMany({
        where,
        include: this.include,
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.timetableSlot.count({ where })
    ]);

    return { items: items.map((slot) => this.toSlotObject(slot)), total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async create(user: AuthUser, dto: CreateTimetableSlotDto) {
    await this.validateScope(dto);
    this.assertAllowed(user, PermissionAction.MANAGE_TIMETABLE, dto);
    if (dto.teacherProfileId) {
      await this.ensureTeacher(dto.teacherProfileId);
      await this.assertTeacherFree(dto.teacherProfileId, dto.dayOfWeek, dto.startTime, dto.endTime);
    }
    if (dto.room) {
      await this.assertRoomFree(dto.room, dto.dayOfWeek, dto.startTime, dto.endTime);
    }

    try {
      const slot = await this.prisma.timetableSlot.create({
        data: {
          campusId: dto.campusId,
          programId: dto.programId,
          branchId: dto.branchId,
          batchId: dto.batchId,
          classId: dto.classId,
          sectionId: dto.sectionId,
          subjectId: dto.subjectId,
          teacherProfileId: dto.teacherProfileId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime.trim(),
          endTime: dto.endTime.trim(),
          room: dto.room?.trim(),
          createdById: user.id
        },
        include: this.include
      });
      await this.audit(user, "CREATE_TIMETABLE_SLOT", "TimetableSlot", slot.id);
      return { slot: this.toSlotObject(slot) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("This section already has a timetable slot for the selected day and time.");
      }
      throw error;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateTimetableSlotDto) {
    const existing = await this.prisma.timetableSlot.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Timetable slot not found.");
    this.assertAllowed(user, PermissionAction.MANAGE_TIMETABLE, this.slotToScope(existing));

    const merged = {
      campusId: existing.campusId,
      programId: existing.programId,
      branchId: existing.branchId,
      batchId: existing.batchId,
      classId: existing.classId,
      sectionId: existing.sectionId,
      subjectId: dto.subjectId ?? existing.subjectId ?? undefined,
      teacherProfileId: dto.teacherProfileId ?? existing.teacherProfileId ?? undefined,
      dayOfWeek: dto.dayOfWeek ?? existing.dayOfWeek,
      startTime: dto.startTime?.trim() ?? existing.startTime,
      endTime: dto.endTime?.trim() ?? existing.endTime,
      room: dto.room?.trim() ?? existing.room ?? undefined
    };
    await this.validateScope(merged);
    if (merged.teacherProfileId) {
      await this.ensureTeacher(merged.teacherProfileId);
      await this.assertTeacherFree(merged.teacherProfileId, merged.dayOfWeek, merged.startTime, merged.endTime, id);
    }
    if (merged.room) {
      await this.assertRoomFree(merged.room, merged.dayOfWeek, merged.startTime, merged.endTime, id);
    }

    try {
      const slot = await this.prisma.timetableSlot.update({
        where: { id },
        data: {
          subjectId: merged.subjectId,
          teacherProfileId: merged.teacherProfileId,
          dayOfWeek: merged.dayOfWeek,
          startTime: merged.startTime,
          endTime: merged.endTime,
          room: merged.room
        },
        include: this.include
      });
      await this.audit(user, "UPDATE_TIMETABLE_SLOT", "TimetableSlot", id);
      return { slot: this.toSlotObject(slot) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("This section already has a timetable slot for the selected day and time.");
      }
      throw error;
    }
  }

  async export(user: AuthUser, query: TimetableQueryDto) {
    const page = await this.list(user, { ...query, page: 1, pageSize: 100 });
    const rows = [
      ["Day", "Time", "Campus", "Branch", "Semester", "Section", "Subject", "Teacher", "Room"],
      ...page.items.map((slot) => [
        String(slot.dayOfWeek),
        slot.time,
        slot.structure.campus,
        slot.structure.branch,
        String(slot.structure.semester),
        slot.structure.section,
        slot.structure.subject,
        slot.teacher,
        slot.room ?? ""
      ])
    ];
    return { filename: "timetable-export.csv", csv: rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n") };
  }

  async archive(user: AuthUser, id: string) {
    const slot = await this.prisma.timetableSlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException("Timetable slot not found.");
    this.assertAllowed(user, PermissionAction.MANAGE_TIMETABLE, this.slotToScope(slot));
    await this.prisma.timetableSlot.update({ where: { id }, data: { status: TimetableSlotStatus.ARCHIVED } });
    await this.audit(user, "ARCHIVE_TIMETABLE_SLOT", "TimetableSlot", id);
    return { ok: true };
  }

  async myTimetable(user: AuthUser) {
    if (user.type === UserType.STUDENT) {
      const student = await this.prisma.studentProfile.findUnique({ where: { userId: user.id } });
      if (!student) throw new NotFoundException("Student profile not found.");
      const slots = await this.prisma.timetableSlot.findMany({
        where: { sectionId: student.sectionId, status: TimetableSlotStatus.ACTIVE },
        include: this.include,
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
      });
      return { items: slots.map((slot) => this.toSlotObject(slot)) };
    }

    const teacher = await this.prisma.teacherProfile.findUnique({ where: { userId: user.id } });
    if (!teacher) throw new NotFoundException("Teacher profile not found.");
    const slots = await this.prisma.timetableSlot.findMany({
      where: { teacherProfileId: teacher.id, status: TimetableSlotStatus.ACTIVE },
      include: this.include,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    });
    return { items: slots.map((slot) => this.toSlotObject(slot)) };
  }

  private async validateScope(scope: CreateTimetableSlotDto) {
    if (scope.startTime >= scope.endTime) {
      throw new BadRequestException("Start time must be before end time.");
    }
    const section = await this.prisma.section.findUnique({
      where: { id: scope.sectionId },
      include: { class: { include: { batch: { include: { branch: { include: { program: true } } } } } } }
    });
    if (
      !section ||
      section.status !== StructureStatus.ACTIVE ||
      section.classId !== scope.classId ||
      section.class.status !== StructureStatus.ACTIVE ||
      section.class.batchId !== scope.batchId ||
      section.class.batch.status !== StructureStatus.ACTIVE ||
      section.class.batch.branchId !== scope.branchId ||
      section.class.batch.branch.status !== StructureStatus.ACTIVE ||
      section.class.batch.branch.programId !== scope.programId ||
      section.class.batch.branch.program.status !== StructureStatus.ACTIVE ||
      section.class.batch.branch.program.campusId !== scope.campusId
    ) {
      throw new BadRequestException("Timetable scope is invalid or archived.");
    }
    if (scope.subjectId) {
      const subject = await this.prisma.subject.findUnique({ where: { id: scope.subjectId } });
      if (!subject || subject.status !== StructureStatus.ACTIVE || subject.branchId !== scope.branchId || subject.semesterNumber !== section.class.semesterNumber) {
        throw new BadRequestException("Subject does not match selected branch and semester.");
      }
    }
  }

  private async ensureTeacher(teacherProfileId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({ where: { id: teacherProfileId }, include: { user: true } });
    if (!teacher || teacher.user.status !== "ACTIVE") throw new BadRequestException("Teacher does not exist or is inactive.");
  }

  private async assertTeacherFree(teacherProfileId: string, dayOfWeek: number, startTime: string, endTime: string, excludeId?: string) {
    const overlap = await this.prisma.timetableSlot.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        teacherProfileId,
        dayOfWeek,
        status: TimetableSlotStatus.ACTIVE,
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });
    if (overlap) throw new ConflictException("Teacher already has a timetable slot during this time.");
  }

  private async assertRoomFree(room: string, dayOfWeek: number, startTime: string, endTime: string, excludeId?: string) {
    const overlap = await this.prisma.timetableSlot.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        room,
        dayOfWeek,
        status: TimetableSlotStatus.ACTIVE,
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });
    if (overlap) throw new ConflictException("Room already has a timetable slot during this time.");
  }

  private assertAllowed(user: AuthUser, action: PermissionAction, scope?: ScopeRef) {
    const decision = this.permissions.can(user, { action, scope });
    if (!decision.allowed) throw new ForbiddenException(decision.reason);
  }

  private queryToScope(query: TimetableQueryDto): ScopeRef | undefined {
    if (!query.campusId && !query.classId && !query.sectionId) return undefined;
    return { campusId: query.campusId, classId: query.classId, sectionId: query.sectionId };
  }

  private slotToScope(slot: { campusId: string; classId: string; sectionId: string }): ScopeRef {
    return { campusId: slot.campusId, classId: slot.classId, sectionId: slot.sectionId };
  }

  private include = {
    campus: true,
    program: true,
    branch: true,
    batch: true,
    class: true,
    section: true,
    subject: true,
    teacherProfile: { include: { user: true } }
  } satisfies Prisma.TimetableSlotInclude;

  private toSlotObject(slot: {
    id: string;
    campusId: string;
    programId: string;
    branchId: string;
    batchId: string;
    classId: string;
    sectionId: string;
    subjectId: string | null;
    teacherProfileId: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string | null;
    campus: { code: string };
    program: { code: string };
    branch: { code: string };
    batch: { startYear: number; endYear: number };
    class: { semesterNumber: number; label: string };
    section: { name: string };
    subject: { code: string; name: string } | null;
    teacherProfile: { employeeCode: string; user: { fullName: string } } | null;
  }) {
    return {
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      time: `${slot.startTime}-${slot.endTime}`,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      structure: {
        campusId: slot.campusId,
        programId: slot.programId,
        branchId: slot.branchId,
        batchId: slot.batchId,
        classId: slot.classId,
        sectionId: slot.sectionId,
        subjectId: slot.subjectId,
        campus: slot.campus.code,
        program: slot.program.code,
        branch: slot.branch.code,
        batch: `${slot.batch.startYear}-${slot.batch.endYear}`,
        semester: slot.class.semesterNumber,
        classLabel: slot.class.label,
        section: slot.section.name,
        subject: slot.subject ? `${slot.subject.code} - ${slot.subject.name}` : "General"
      },
      teacherProfileId: slot.teacherProfileId,
      teacher: slot.teacherProfile ? `${slot.teacherProfile.employeeCode} - ${slot.teacherProfile.user.fullName}` : "Unassigned"
    };
  }

  private async audit(user: AuthUser, action: string, entity: string, entityId?: string) {
    await this.prisma.auditLog.create({ data: { action, entity, entityId, userId: user.id } });
  }
}
