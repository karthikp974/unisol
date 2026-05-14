import { Controller, Get, NotFoundException, Query, UseGuards } from "@nestjs/common";
import { AnnouncementAudience, AnnouncementStatus, AnnouncementTeacherScope, PermissionAction, Prisma, ResultEntryStatus, StructureStatus, StudentApplicationStatus, TimetableSlotStatus, UserStatus } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { toPagination } from "../common/pagination.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequiresPermission } from "../permissions/requires-permission.decorator";
import { PrismaService } from "../prisma/prisma.service";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("portals")
export class PortalsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("admin")
  @RequiresPermission(PermissionAction.VIEW_ADMIN_PORTAL)
  admin(@CurrentUser() user: AuthUser) {
    return { portal: "ADMIN", userId: user.id, sections: ["Overview", "Academics", "Structure", "Finance", "Engage"] };
  }

  @Get("teacher")
  @RequiresPermission(PermissionAction.VIEW_TEACHER_PORTAL)
  teacher(@CurrentUser() user: AuthUser) {
    return {
      portal: "TEACHER",
      userId: user.id,
      activeRoles: user.assignments.map((assignment) => ({
        role: assignment.role,
        scope: {
          campusGroupId: assignment.campusGroupId,
          campusId: assignment.campusId,
          programId: assignment.programId,
          branchId: assignment.branchId,
          batchId: assignment.batchId,
          classId: assignment.classId,
          sectionId: assignment.sectionId,
          subjectId: assignment.subjectId
        }
      }))
    };
  }

  @Get("teacher/dashboard")
  @RequiresPermission(PermissionAction.VIEW_TEACHER_PORTAL)
  async teacherDashboard(@CurrentUser() user: AuthUser) {
    const teacher = await this.getActiveTeacher(user.id);
    const assignments = teacher.assignments.map((assignment) => this.toTeacherScopeObject(assignment));
    const studentWhere = this.studentWhereForAssignments(teacher.assignments);
    const timetableWhere = this.timetableWhereForAssignments(teacher.id, teacher.assignments);
    const today = this.todayDayOfWeek();
    const [students, pendingApplications, teams, resultIssues, todaySlots, announcements] = await Promise.all([
      this.prisma.studentProfile.count({ where: studentWhere }),
      this.prisma.studentApplication.count({ where: { status: StudentApplicationStatus.PENDING, studentProfile: studentWhere } }),
      this.prisma.studentTeam.count({ where: { status: "ACTIVE", OR: this.sectionWhereForAssignments(teacher.assignments) } }),
      this.prisma.resultEntry.count({ where: { status: { in: [ResultEntryStatus.FAIL, ResultEntryStatus.ABSENT, ResultEntryStatus.WITHHELD] }, studentProfile: studentWhere } }),
      this.prisma.timetableSlot.findMany({
        where: { status: TimetableSlotStatus.ACTIVE, dayOfWeek: today, OR: timetableWhere },
        include: { campus: true, program: true, branch: true, batch: true, class: true, section: true, subject: true, teacherProfile: { include: { user: true } } },
        orderBy: [{ startTime: "asc" }],
        take: 12
      }),
      this.prisma.announcement.findMany({
        where: {
          status: AnnouncementStatus.PUBLISHED,
          OR: [...this.announcementWhereForAssignments(teacher.assignments), ...this.announcementTeacherTargetOr(teacher.assignments)]
        },
        orderBy: { publishedAt: "desc" },
        take: 5
      })
    ]);

    return {
      teacher: {
        id: teacher.id,
        fullName: teacher.user.fullName,
        employeeCode: teacher.employeeCode,
        email: teacher.user.email
      },
      assignments,
      counts: { students, pendingApplications, teams, resultIssues, todayClasses: todaySlots.length, announcements: announcements.length },
      todayTimetable: todaySlots.map((slot) => this.toTimetableObject(slot)),
      announcements: announcements.map((announcement) => ({ id: announcement.id, title: announcement.title, audience: announcement.audience, publishedAt: announcement.publishedAt })),
      quickActions: this.quickActionsForAssignments(teacher.assignments)
    };
  }

  @Get("teacher/students")
  @RequiresPermission(PermissionAction.VIEW_STUDENTS)
  async teacherStudents(@CurrentUser() user: AuthUser, @Query() query: { assignmentId?: string; page?: number; pageSize?: number; search?: string }) {
    const teacher = await this.getActiveTeacher(user.id);
    const pagination = toPagination({ page: query.page ?? 1, pageSize: query.pageSize ?? 25, search: query.search });
    const selectedAssignments = query.assignmentId ? teacher.assignments.filter((assignment) => assignment.id === query.assignmentId) : teacher.assignments;
    if (!selectedAssignments.length) throw new NotFoundException("Teacher assignment not found.");
    const where: Prisma.StudentProfileWhereInput = {
      ...this.studentWhereForAssignments(selectedAssignments),
      ...(query.search
        ? {
            OR: [
              { rollNumber: { contains: query.search, mode: "insensitive" } },
              { user: { fullName: { contains: query.search, mode: "insensitive" } } },
              { user: { email: { contains: query.search, mode: "insensitive" } } }
            ]
          }
        : {})
    };
    const [items, total] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where,
        include: {
          user: true,
          section: { include: { class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } } } },
          attendanceEntries: { select: { status: true }, take: 100 },
          feeAssignments: { include: { feeStructure: true } },
          resultEntries: { select: { status: true } }
        },
        orderBy: { rollNumber: "asc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.studentProfile.count({ where })
    ]);
    return {
      items: items.map((student) => {
        const present = student.attendanceEntries.filter((entry) => entry.status === "PRESENT").length;
        const totalAttendance = student.attendanceEntries.length;
        const due = student.feeAssignments.reduce((sum, assignment) => sum + Number(assignment.feeStructure.amount), 0);
        const failed = student.resultEntries.filter((entry) => entry.status === "FAIL" || entry.status === "ABSENT" || entry.status === "WITHHELD").length;
        return {
          id: student.id,
          rollNumber: student.rollNumber,
          fullName: student.user.fullName,
          email: student.user.email.endsWith("@students.local") ? null : student.user.email,
          section: student.section.name,
          class: student.section.class.label,
          semester: student.section.class.semesterNumber,
          branch: student.section.class.batch.branch.name,
          department: student.section.class.batch.branch.program.name,
          campus: student.section.class.batch.branch.program.campus.code,
          attendance: { total: totalAttendance, present, percentage: totalAttendance ? Math.round((present / totalAttendance) * 10000) / 100 : 0 },
          fees: { assigned: student.feeAssignments.length, due },
          results: { entries: student.resultEntries.length, issues: failed }
        };
      }),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  @Get("student")
  @RequiresPermission(PermissionAction.VIEW_STUDENT_PORTAL)
  student(@CurrentUser() user: AuthUser) {
    return { portal: "STUDENT", userId: user.id, sections: ["Attendance", "Fees", "Applications", "Marks"] };
  }

  @Get("student/academic")
  @RequiresPermission(PermissionAction.VIEW_STUDENT_PORTAL)
  async studentAcademic(@CurrentUser() user: AuthUser) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: {
        user: true,
        section: {
          include: {
            class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } },
            subjectAssignments: {
              where: { isActive: true, subject: { status: StructureStatus.ACTIVE, isArchived: false } },
              include: { subject: { include: { syllabi: { where: { isArchived: false }, include: { units: { where: { isArchived: false }, orderBy: { unitOrder: "asc" } } } } } } },
              orderBy: { subject: { code: "asc" } }
            },
            roleAssignments: {
              where: { isActive: true },
              include: { teacherProfile: { include: { user: true } }, subject: true }
            },
            timetableSlots: {
              where: { status: TimetableSlotStatus.ACTIVE },
              include: { subject: true, teacherProfile: { include: { user: true } } },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
            },
            feeStructures: {
              where: { isActive: true, isArchived: false },
              include: { feeHead: true },
              orderBy: { createdAt: "desc" }
            },
            announcements: {
              where: { status: AnnouncementStatus.PUBLISHED },
              orderBy: { createdAt: "desc" },
              take: 10
            }
          }
        }
      }
    });
    if (!student) throw new NotFoundException("Student profile not found.");

    const section = student.section;
    const cls = section.class;
    const fallbackSubjects = section.subjectAssignments.length
      ? []
      : await this.prisma.subject.findMany({
          where: {
            branchId: cls.batch.branchId,
            semesterNumber: cls.semesterNumber,
            status: StructureStatus.ACTIVE,
            isArchived: false,
            OR: [{ batchId: cls.batchId }, { batchId: null }]
          },
          include: { syllabi: { where: { isArchived: false }, include: { units: { where: { isArchived: false }, orderBy: { unitOrder: "asc" } } } } },
          orderBy: { code: "asc" }
        });
    const subjects = section.subjectAssignments.length ? section.subjectAssignments.map((item) => item.subject) : fallbackSubjects;

    return {
      student: {
        id: student.id,
        fullName: student.user.fullName,
        rollNumber: student.rollNumber,
        currentSectionId: section.id
      },
      section: {
        id: section.id,
        code: section.code,
        name: section.name,
        semester: cls.semesterNumber,
        class: cls.label,
        batch: cls.batch.batchCode,
        branch: cls.batch.branch.name,
        department: cls.batch.branch.program.name,
        campus: cls.batch.branch.program.campus.name
      },
      subjects: subjects.map((subject) => ({
        id: subject.id,
        code: subject.code,
        name: subject.name,
        syllabi: subject.syllabi.map((syllabus) => ({
          id: syllabus.id,
          units: syllabus.units.map((unit) => ({ id: unit.id, title: unit.unitTitle, order: unit.unitOrder }))
        }))
      })),
      teachers: section.roleAssignments.map((assignment) => ({
        role: assignment.role,
        teacherId: assignment.teacherProfileId,
        name: assignment.teacherProfile.user.fullName,
        subjectCode: assignment.subject?.code ?? null
      })),
      timetable: section.timetableSlots.map((slot) => ({
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
        subject: slot.subject?.name ?? null,
        teacher: slot.teacherProfile?.user.fullName ?? null
      })),
      feeStructures: section.feeStructures.map((fee) => ({
        id: fee.id,
        name: fee.feeName ?? fee.feeHead.name,
        amount: Number(fee.amount),
        dueDate: fee.dueDate?.toISOString().slice(0, 10) ?? null
      })),
      announcements: section.announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        publishedAt: announcement.publishedAt
      }))
    };
  }

  @Get("database")
  @RequiresPermission(PermissionAction.VIEW_DB_PORTAL)
  database(@CurrentUser() user: AuthUser) {
    return { portal: "DATABASE", userId: user.id, mode: "read-only-first", tablesVisible: true };
  }

  private async getActiveTeacher(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        assignments: {
          where: { isActive: true },
          include: { campusGroup: true, campus: true, program: true, branch: true, batch: true, class: true, section: true, subject: true, permissions: true },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }]
        }
      }
    });
    if (!teacher || teacher.isArchived) throw new NotFoundException("Teacher profile not found.");
    return teacher;
  }

  private toTeacherScopeObject(assignment: Awaited<ReturnType<PortalsController["getActiveTeacher"]>>["assignments"][number]) {
    const scopeParts = [
      assignment.campus?.code,
      assignment.program?.code,
      assignment.branch?.code,
      assignment.batch ? `${assignment.batch.startYear}-${assignment.batch.endYear}` : null,
      assignment.class?.label,
      assignment.section?.name,
      assignment.subject?.code
    ].filter(Boolean);
    return {
      id: assignment.id,
      role: assignment.role,
      scopeLabel: scopeParts.length ? scopeParts.join(" / ") : assignment.campusGroup?.name ?? "Assigned scope",
      campus: assignment.campus ? { id: assignment.campus.id, code: assignment.campus.code, name: assignment.campus.name } : null,
      department: assignment.program ? { id: assignment.program.id, code: assignment.program.code, name: assignment.program.name } : null,
      branch: assignment.branch ? { id: assignment.branch.id, code: assignment.branch.code, name: assignment.branch.name } : null,
      batch: assignment.batch ? { id: assignment.batch.id, startYear: assignment.batch.startYear, endYear: assignment.batch.endYear } : null,
      class: assignment.class ? { id: assignment.class.id, label: assignment.class.label, semesterNumber: assignment.class.semesterNumber } : null,
      section: assignment.section ? { id: assignment.section.id, name: assignment.section.name } : null,
      subject: assignment.subject ? { id: assignment.subject.id, code: assignment.subject.code, name: assignment.subject.name } : null,
      actions: this.quickActionsForAssignments([assignment])
    };
  }

  private studentWhereForAssignments(assignments: Awaited<ReturnType<PortalsController["getActiveTeacher"]>>["assignments"]): Prisma.StudentProfileWhereInput {
    const OR = assignments.map((assignment) => this.studentWhereForAssignment(assignment));
    return { currentStatus: UserStatus.ACTIVE, isArchived: false, OR: OR.length ? OR : [{ id: "__none__" }] };
  }

  private studentWhereForAssignment(assignment: Awaited<ReturnType<PortalsController["getActiveTeacher"]>>["assignments"][number]): Prisma.StudentProfileWhereInput {
    if (assignment.sectionId) return { sectionId: assignment.sectionId };
    if (assignment.classId) return { section: { classId: assignment.classId } };
    if (assignment.batchId) return { section: { class: { batchId: assignment.batchId } } };
    if (assignment.branchId) return { section: { class: { branchId: assignment.branchId } } };
    if (assignment.programId) return { section: { class: { branch: { programId: assignment.programId } } } };
    if (assignment.campusId) return { section: { campusId: assignment.campusId } };
    return { id: "__none__" };
  }

  private sectionWhereForAssignments(assignments: Awaited<ReturnType<PortalsController["getActiveTeacher"]>>["assignments"]): Prisma.StudentTeamWhereInput[] {
    return assignments.map((assignment) => {
      if (assignment.sectionId) return { sectionId: assignment.sectionId };
      if (assignment.classId) return { section: { classId: assignment.classId } };
      if (assignment.branchId) return { section: { class: { branchId: assignment.branchId } } };
      if (assignment.programId) return { section: { class: { branch: { programId: assignment.programId } } } };
      if (assignment.campusId) return { section: { campusId: assignment.campusId } };
      return { id: "__none__" };
    });
  }

  private timetableWhereForAssignments(teacherProfileId: string, assignments: Awaited<ReturnType<PortalsController["getActiveTeacher"]>>["assignments"]): Prisma.TimetableSlotWhereInput[] {
    return [{ teacherProfileId }, ...assignments.map((assignment) => {
      if (assignment.sectionId) return { sectionId: assignment.sectionId };
      if (assignment.classId) return { classId: assignment.classId };
      if (assignment.branchId) return { branchId: assignment.branchId };
      if (assignment.programId) return { programId: assignment.programId };
      if (assignment.campusId) return { campusId: assignment.campusId };
      return { id: "__none__" };
    })];
  }

  private announcementTeacherTargetOr(assignments: Awaited<ReturnType<PortalsController["getActiveTeacher"]>>["assignments"]): Prisma.AnnouncementWhereInput[] {
    const campusIds = [...new Set(assignments.map((a) => a.campusId).filter(Boolean))] as string[];
    const programIds = [...new Set(assignments.map((a) => a.programId).filter(Boolean))] as string[];
    const branchIds = [...new Set(assignments.map((a) => a.branchId).filter(Boolean))] as string[];
    const aud = { in: [AnnouncementAudience.ALL, AnnouncementAudience.TEACHERS, AnnouncementAudience.BOTH] };
    const parts: Prisma.AnnouncementWhereInput[] = [{ teacherScope: AnnouncementTeacherScope.INSTITUTION, audience: aud }];
    if (campusIds.length) parts.push({ teacherScope: AnnouncementTeacherScope.CAMPUS, teacherCampusId: { in: campusIds }, audience: aud });
    if (programIds.length) parts.push({ teacherScope: AnnouncementTeacherScope.DEPARTMENT, teacherProgramId: { in: programIds }, audience: aud });
    if (branchIds.length) parts.push({ teacherScope: AnnouncementTeacherScope.BRANCH, teacherBranchId: { in: branchIds }, audience: aud });
    return parts;
  }

  private announcementWhereForAssignments(assignments: Awaited<ReturnType<PortalsController["getActiveTeacher"]>>["assignments"]): Prisma.AnnouncementWhereInput[] {
    return [
      { campusId: null, programId: null, branchId: null, batchId: null, classId: null, sectionId: null },
      ...assignments.map((assignment) => ({
        campusId: assignment.campusId ?? undefined,
        programId: assignment.programId ?? undefined,
        branchId: assignment.branchId ?? undefined,
        batchId: assignment.batchId ?? undefined,
        classId: assignment.classId ?? undefined,
        sectionId: assignment.sectionId ?? undefined
      }))
    ];
  }

  private quickActionsForAssignments(assignments: { role: string }[]) {
    const roles = new Set(assignments.map((assignment) => assignment.role));
    const actions = ["timetable", "students", "announcements"];
    if (roles.has("STPO") || roles.has("CTPO") || roles.has("HTPO")) actions.push("attendance", "results", "reports");
    if (roles.has("CTPO") || roles.has("HTPO")) actions.push("teams", "applications", "finance");
    return [...new Set(actions)];
  }

  private toTimetableObject(slot: Awaited<ReturnType<PrismaService["timetableSlot"]["findMany"]>>[number] & {
    campus: { code: string };
    branch: { code: string; name: string };
    class: { label: string; semesterNumber: number };
    section: { name: string };
    subject: { code: string; name: string } | null;
    teacherProfile: { user: { fullName: string } } | null;
  }) {
    return {
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      time: `${slot.startTime}-${slot.endTime}`,
      room: slot.room,
      teacher: slot.teacherProfile?.user.fullName ?? "Unassigned",
      structure: {
        campus: slot.campus.code,
        branch: slot.branch.name,
        semester: slot.class.semesterNumber,
        section: slot.section.name,
        subject: slot.subject ? `${slot.subject.code} - ${slot.subject.name}` : "General"
      }
    };
  }

  private todayDayOfWeek() {
    const day = new Date().getDay();
    return day === 0 ? 7 : day;
  }
}
