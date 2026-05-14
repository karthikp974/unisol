import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AuthSessionStatus, Prisma, StructureStatus, TeacherRoleKind, UserStatus, UserType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { toPagination } from "../common/pagination.dto";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { assertNoDuplicateAssignments, validateAssignmentShape } from "./teacher-assignment.util";
import {
  BulkCreateTeachersDto,
  CreateTeacherDto,
  ResetTeacherPasswordDto,
  TeacherAssignmentDto,
  TeacherListQueryDto,
  UpdateTeacherAssignmentsDto,
  UpdateTeacherDto
} from "./teachers.dto";

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}

  async list(query: TeacherListQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.TeacherProfileWhereInput = {
      isArchived: false,
      user: {
        status: query.status ?? UserStatus.ACTIVE
      },
      ...(query.search
        ? {
            OR: [
              { employeeCode: { contains: query.search, mode: "insensitive" } },
              { user: { fullName: { contains: query.search, mode: "insensitive" } } },
              { user: { email: { contains: query.search, mode: "insensitive" } } }
            ]
          }
        : {}),
      ...(query.campusId || query.role
        ? {
            assignments: {
              some: {
                isActive: true,
                campusId: query.campusId,
                role: query.role as TeacherRoleKind | undefined
              }
            }
          }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        where,
        include: {
          user: true,
          assignments: {
            where: { isActive: true },
            include: { campus: true, program: true, branch: true, class: true, section: true, subject: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.teacherProfile.count({ where })
    ]);

    return {
      items: items.map((teacher) => ({
        id: teacher.id,
        identity: {
          fullName: teacher.user.fullName,
          employeeCode: teacher.employeeCode,
          email: teacher.user.email,
          phone: teacher.user.phone,
          designation: teacher.designation,
          joinedOn: teacher.joinedOn?.toISOString().slice(0, 10),
          status: teacher.user.status
        },
        summary: {
          assignments: teacher.assignments.length,
          roles: teacher.assignments.reduce<Record<string, number>>((acc, assignment) => {
            acc[assignment.role] = (acc[assignment.role] ?? 0) + 1;
            return acc;
          }, {}),
          campuses: [...new Set(teacher.assignments.map((assignment) => assignment.campus?.code).filter(Boolean))]
        }
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  async search(query: TeacherListQueryDto) {
    const results = await this.list({ ...query, page: query.page ?? 1, pageSize: query.pageSize ?? 10, status: query.status ?? UserStatus.ACTIVE });
    return results;
  }

  async get(id: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id },
      include: {
        user: true,
        assignments: {
          where: { isActive: true },
          include: { campus: true, program: true, branch: true, batch: true, class: true, section: true, subject: true }
        }
      }
    });

    if (!teacher) {
      throw new NotFoundException("Teacher not found.");
    }

    return { teacher: this.toTeacherObject(teacher) };
  }

  async validate(dto: CreateTeacherDto) {
    await this.validateTeacherPayload(dto);
    return { ok: true };
  }

  async create(dto: CreateTeacherDto) {
    await this.validateTeacherPayload(dto);
    const employeeCode = dto.identity.employeeCode.trim().toUpperCase();
    const phone = this.normalizePhone(dto.identity.phone);
    const passwordHash = await bcrypt.hash(employeeCode, 12);

    try {
      const teacher = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.identity.email.trim().toLowerCase(),
            passwordHash,
            fullName: dto.identity.fullName.trim(),
            phone,
            type: UserType.TEACHER
          }
        });

        const profile = await tx.teacherProfile.create({
          data: {
            userId: user.id,
            employeeCode,
            designation: undefined,
            joinedOn: dto.identity.joinedOn ? new Date(dto.identity.joinedOn) : undefined
          }
        });

        await tx.teacherRoleAssignment.createMany({
          data: dto.assignments.map((assignment) => ({
            teacherProfileId: profile.id,
            userId: user.id,
            role: assignment.role,
            campusId: assignment.campusId,
            programId: assignment.programId,
            branchId: assignment.branchId,
            batchId: assignment.batchId,
            classId: assignment.classId,
            sectionId: assignment.sectionId,
            subjectId: assignment.subjectId
          }))
        });

        return tx.teacherProfile.findUniqueOrThrow({
          where: { id: profile.id },
          include: {
            user: true,
            assignments: {
              where: { isActive: true },
              include: { campus: true, program: true, branch: true, batch: true, class: true, section: true, subject: true }
            }
          }
        });
      });

      await this.logAudit("CREATE_TEACHER", "TeacherProfile", teacher.id, { employeeCode: teacher.employeeCode });
      await this.email
        .sendTeacherWelcome({
          email: teacher.user.email,
          fullName: teacher.user.fullName,
          employeeCode: teacher.employeeCode,
          temporaryPassword: employeeCode,
          assignments: teacher.assignments.map((assignment) => this.assignmentEmailLine(assignment))
        })
        .catch((error: unknown) => {
          this.logger.error(error instanceof Error ? error.message : "Unable to send teacher welcome email.");
        });
      return { teacher: this.toTeacherObject(teacher) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Teacher email or employee code already exists.");
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!teacher) throw new NotFoundException("Teacher not found.");

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: teacher.userId }, data: { status: UserStatus.INACTIVE } }),
      this.prisma.teacherRoleAssignment.updateMany({ where: { teacherProfileId: id }, data: { isActive: false } }),
      this.prisma.authSession.updateMany({
        where: { userId: teacher.userId, status: AuthSessionStatus.ACTIVE },
        data: { status: AuthSessionStatus.REVOKED, revokedAt: new Date() }
      })
    ]);

    await this.logAudit("DEACTIVATE_TEACHER", "TeacherProfile", id);
    return { ok: true };
  }

  async archive(id: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id },
      select: { userId: true, employeeCode: true, isArchived: true, user: { select: { email: true } } }
    });
    if (!teacher || teacher.isArchived) throw new NotFoundException("Teacher not found.");

    const archivedAt = new Date();
    const archiveMarker = `archived-${id}-${archivedAt.getTime()}`;
    await this.prisma.$transaction([
      this.prisma.teacherProfile.update({
        where: { id },
        data: { employeeCode: `${teacher.employeeCode}__${archiveMarker}`, isArchived: true, archivedAt, version: { increment: 1 } }
      }),
      this.prisma.user.update({ where: { id: teacher.userId }, data: { email: `${archiveMarker}@teachers.local`, status: UserStatus.INACTIVE } }),
      this.prisma.teacherRoleAssignment.updateMany({ where: { teacherProfileId: id }, data: { isActive: false, endsAt: archivedAt } }),
      this.prisma.authSession.updateMany({
        where: { userId: teacher.userId, status: AuthSessionStatus.ACTIVE },
        data: { status: AuthSessionStatus.REVOKED, revokedAt: archivedAt }
      })
    ]);

    await this.logAudit("ARCHIVE_TEACHER", "TeacherProfile", id, { email: teacher.user.email, employeeCode: teacher.employeeCode });
    return { ok: true };
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const existing = await this.prisma.teacherProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!existing) throw new NotFoundException("Teacher not found.");
    const phone = this.normalizePhone(dto.phone);
    if (dto.phone && !phone) throw new BadRequestException("Phone must be exactly 10 digits.");

    try {
      const teacher = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            fullName: dto.fullName?.trim(),
            email: dto.email?.trim().toLowerCase(),
            phone
          }
        });

        return tx.teacherProfile.update({
          where: { id },
          data: {
            designation: dto.designation?.trim(),
            joinedOn: dto.joinedOn ? new Date(dto.joinedOn) : undefined,
            version: { increment: 1 }
          },
          include: {
            user: true,
            assignments: {
              where: { isActive: true },
              include: { campus: true, program: true, branch: true, batch: true, class: true, section: true, subject: true }
            }
          }
        });
      });

      await this.logAudit("UPDATE_TEACHER", "TeacherProfile", id, { fields: Object.keys(dto) });
      return { teacher: this.toTeacherObject(teacher) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Teacher email already exists.");
      }
      throw error;
    }
  }

  async updateAssignments(id: string, dto: UpdateTeacherAssignmentsDto) {
    const teacher = await this.prisma.teacherProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!teacher) throw new NotFoundException("Teacher not found.");
    await this.validateAssignments(dto.assignments);

    await this.prisma.$transaction(async (tx) => {
      await tx.teacherRoleAssignment.updateMany({ where: { teacherProfileId: id, isActive: true }, data: { isActive: false } });
      await tx.teacherRoleAssignment.createMany({
        data: dto.assignments.map((assignment) => ({
          teacherProfileId: id,
          userId: teacher.userId,
          role: assignment.role,
          campusId: assignment.campusId,
          programId: assignment.programId,
          branchId: assignment.branchId,
          batchId: assignment.batchId,
          classId: assignment.classId,
          sectionId: assignment.sectionId,
          subjectId: assignment.subjectId
        }))
      });
      await tx.teacherProfile.update({ where: { id }, data: { version: { increment: 1 } } });
    });

    await this.logAudit("UPDATE_TEACHER_ASSIGNMENTS", "TeacherProfile", id, { assignments: dto.assignments.length });
    return this.get(id);
  }

  async reactivate(id: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!teacher) throw new NotFoundException("Teacher not found.");
    await this.prisma.user.update({ where: { id: teacher.userId }, data: { status: UserStatus.ACTIVE } });
    await this.logAudit("REACTIVATE_TEACHER", "TeacherProfile", id);
    return { ok: true };
  }

  async resetPassword(id: string, dto: ResetTeacherPasswordDto) {
    const teacher = await this.prisma.teacherProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!teacher) throw new NotFoundException("Teacher not found.");

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: teacher.userId }, data: { passwordHash } }),
      this.prisma.authSession.updateMany({
        where: { userId: teacher.userId, status: AuthSessionStatus.ACTIVE },
        data: { status: AuthSessionStatus.REVOKED, revokedAt: new Date() }
      })
    ]);

    await this.logAudit("RESET_TEACHER_PASSWORD", "TeacherProfile", id);
    return { ok: true };
  }

  async bulkCreate(dto: BulkCreateTeachersDto) {
    const created: string[] = [];
    const errors: { employeeCode: string; message: string }[] = [];

    for (const teacher of dto.teachers) {
      try {
        const result = await this.create(teacher);
        created.push(result.teacher.id);
      } catch (error) {
        errors.push({
          employeeCode: teacher.identity.employeeCode,
          message: error instanceof Error ? error.message : "Teacher import failed."
        });
      }
    }

    await this.logAudit("BULK_CREATE_TEACHERS", "TeacherProfile", undefined, { created: created.length, errors: errors.length });
    return { created: created.length, errors };
  }

  private async validateTeacherPayload(dto: CreateTeacherDto) {
    const phone = this.normalizePhone(dto.identity.phone);
    if (dto.identity.phone && !phone) throw new BadRequestException("Phone must be exactly 10 digits.");
    dto.identity.phone = phone;
    dto.identity.password = dto.identity.employeeCode.trim().toUpperCase();
    await this.validateAssignments(dto.assignments);
  }

  private normalizePhone(value?: string) {
    if (!value) return undefined;
    const digits = value.replace(/\D/g, "");
    const withoutCountryCode = digits.startsWith("91") && digits.length > 10 ? digits.slice(2) : digits;
    const withoutLeadingZero = withoutCountryCode.startsWith("0") && withoutCountryCode.length > 10 ? withoutCountryCode.slice(1) : withoutCountryCode;
    return withoutLeadingZero.length === 10 ? withoutLeadingZero : undefined;
  }

  private async validateAssignments(assignments: TeacherAssignmentDto[]) {
    assertNoDuplicateAssignments(assignments);
    for (const assignment of assignments) {
      validateAssignmentShape(assignment);
      await this.validateAssignmentCatalog(assignment);
    }
  }

  private async validateAssignmentCatalog(assignment: TeacherAssignmentDto) {
    const campus = await this.prisma.campus.findUnique({ where: { id: assignment.campusId }, include: { group: true } });
    if (!campus || campus.status !== StructureStatus.ACTIVE) throw new BadRequestException("Campus does not exist or is archived.");

    const program = await this.prisma.program.findUnique({ where: { id: assignment.programId } });
    if (!program || program.status !== StructureStatus.ACTIVE || program.campusId !== assignment.campusId) {
      throw new BadRequestException("Program does not belong to selected campus or is archived.");
    }

    const branch = await this.prisma.branch.findUnique({ where: { id: assignment.branchId } });
    if (!branch || branch.status !== StructureStatus.ACTIVE || branch.programId !== assignment.programId) {
      throw new BadRequestException("Branch does not belong to selected program or is archived.");
    }

    if (assignment.role === TeacherRoleKind.HTPO) return;

    if (!assignment.batchId || !assignment.classId) {
      throw new BadRequestException(`${assignment.role} assignment requires batch and class.`);
    }

    const batch = await this.prisma.batch.findUnique({ where: { id: assignment.batchId } });
    if (!batch || batch.status !== StructureStatus.ACTIVE || batch.branchId !== assignment.branchId) {
      throw new BadRequestException("Batch does not belong to selected branch or is archived.");
    }

    const academicClass = await this.prisma.academicClass.findUnique({ where: { id: assignment.classId } });
    if (!academicClass || academicClass.status !== StructureStatus.ACTIVE || academicClass.batchId !== assignment.batchId) {
      throw new BadRequestException("Class does not belong to selected batch or is archived.");
    }

    if (assignment.sectionId) {
      const section = await this.prisma.section.findUnique({ where: { id: assignment.sectionId } });
      if (!section || section.status !== StructureStatus.ACTIVE || section.classId !== assignment.classId) {
        throw new BadRequestException("Section does not belong to selected class or is archived.");
      }
    }

    if (assignment.subjectId) {
      const subject = await this.prisma.subject.findUnique({ where: { id: assignment.subjectId } });
      if (
        !subject ||
        subject.status !== StructureStatus.ACTIVE ||
        subject.branchId !== assignment.branchId ||
        subject.semesterNumber !== academicClass.semesterNumber
      ) {
        throw new BadRequestException("Subject does not match selected branch and semester or is archived.");
      }
    }
  }

  private toTeacherObject(teacher: {
    id: string;
    employeeCode: string;
    designation: string | null;
    joinedOn: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; fullName: string; email: string; phone: string | null; status: UserStatus };
    assignments: {
      id: string;
      campusId: string | null;
      programId: string | null;
      branchId: string | null;
      batchId: string | null;
      classId: string | null;
      sectionId: string | null;
      subjectId: string | null;
      role: TeacherRoleKind;
      campus?: { code: string } | null;
    }[];
  }) {
    const roles = teacher.assignments.reduce<Record<string, number>>((acc, assignment) => {
      acc[assignment.role] = (acc[assignment.role] ?? 0) + 1;
      return acc;
    }, {});

    return {
      id: teacher.id,
      identity: {
        fullName: teacher.user.fullName,
        employeeCode: teacher.employeeCode,
        email: teacher.user.email,
        phone: teacher.user.phone,
        designation: teacher.designation,
        joinedOn: teacher.joinedOn?.toISOString().slice(0, 10),
        status: teacher.user.status
      },
      summary: {
        assignments: teacher.assignments.length,
        roles,
        campuses: [...new Set(teacher.assignments.map((assignment) => assignment.campus?.code).filter(Boolean))]
      },
      assignments: teacher.assignments.map((assignment) => ({
        id: assignment.id,
        campusId: assignment.campusId,
        programId: assignment.programId,
        branchId: assignment.branchId,
        batchId: assignment.batchId,
        classId: assignment.classId,
        sectionId: assignment.sectionId,
        subjectId: assignment.subjectId,
        role: assignment.role
      })),
      meta: {
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
        version: teacher.version
      }
    };
  }

  private assignmentEmailLine(assignment: {
    role: TeacherRoleKind;
    campus: { code: string } | null;
    program: { code: string } | null;
    branch: { code: string; name: string } | null;
    batch: { startYear: number; endYear: number } | null;
    class: { label: string; semesterNumber: number } | null;
    section: { name: string } | null;
    subject: { code: string; name: string } | null;
  }) {
    const scope = [
      assignment.campus?.code,
      assignment.program?.code,
      assignment.branch ? `${assignment.branch.code} - ${assignment.branch.name}` : undefined,
      assignment.batch ? `${assignment.batch.startYear}-${assignment.batch.endYear}` : undefined,
      assignment.class ? `${assignment.class.label} / Semester ${assignment.class.semesterNumber}` : undefined,
      assignment.section?.name,
      assignment.subject ? `${assignment.subject.code} - ${assignment.subject.name}` : undefined
    ].filter(Boolean);
    return `${assignment.role}: ${scope.join(" / ")}`;
  }

  private async logAudit(action: string, entity: string, entityId?: string, metadata?: Prisma.InputJsonObject) {
    await this.prisma.auditLog.create({ data: { action, entity, entityId, metadata } });
  }
}
