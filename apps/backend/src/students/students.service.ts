import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthSessionStatus, Prisma, StructureStatus, UserStatus, UserType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { toPagination } from "../common/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import { BulkCreateStudentsDto, CreateStudentDto, ResetStudentPasswordDto, StudentListQueryDto, UpdateStudentDto } from "./students.dto";
import { assertSectionMatchesCampus, buildStudentFallbackEmail, normalizeRollNumber } from "./student.util";

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: StudentListQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.StudentProfileWhereInput = {
      isArchived: false,
      currentStatus: query.status ?? UserStatus.ACTIVE,
      sectionId: query.sectionId,
      ...(query.classId ? { section: { classId: query.classId } } : {}),
      ...(query.campusId ? { section: { class: { batch: { branch: { program: { campusId: query.campusId } } } } } } : {}),
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
          section: { include: { class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } } } }
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.studentProfile.count({ where })
    ]);

    return { items: items.map((student) => this.toStudentObject(student)), total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async search(query: StudentListQueryDto) {
    return this.list({ ...query, page: query.page ?? 1, pageSize: query.pageSize ?? 10, status: query.status ?? UserStatus.ACTIVE });
  }

  async get(id: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: true,
        section: { include: { class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } } } }
      }
    });
    if (!student) throw new NotFoundException("Student not found.");
    return { student: this.toStudentObject(student) };
  }

  async create(dto: CreateStudentDto) {
    const section = await this.getSectionWithCampus(dto.sectionId);
    this.validateRequestedStructure(section, dto);
    const rollNumber = normalizeRollNumber(dto.rollNumber);
    const email = dto.email?.trim().toLowerCase() || buildStudentFallbackEmail(rollNumber);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const student = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            campusId: section.class.batch.branch.program.campusId,
            email,
            passwordHash,
            fullName: dto.fullName.trim(),
            phone: dto.phone?.trim(),
            type: UserType.STUDENT
          }
        });

        return tx.studentProfile.create({
          data: {
            userId: user.id,
            sectionId: dto.sectionId,
            rollNumber,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            currentStatus: UserStatus.ACTIVE
          },
          include: {
            user: true,
            section: { include: { class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } } } }
          }
        });
      });

      await this.logAudit("CREATE_STUDENT", "StudentProfile", student.id, { rollNumber });
      return { student: this.toStudentObject(student) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Student email or roll number already exists.");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateStudentDto) {
    const existing = await this.prisma.studentProfile.findUnique({ where: { id }, include: { user: true } });
    if (!existing || existing.isArchived) throw new NotFoundException("Student not found.");

    let campusId = existing.user.campusId;
    if (dto.sectionId) {
      const section = await this.getSectionWithCampus(dto.sectionId);
      this.validateRequestedStructure(section, dto);
      campusId = section.class.batch.branch.program.campusId;
    }

    try {
      const student = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            campusId,
            fullName: dto.fullName?.trim(),
            email: dto.email?.trim().toLowerCase(),
            phone: dto.phone?.trim(),
            status: dto.status
          }
        });

        return tx.studentProfile.update({
          where: { id },
          data: {
            rollNumber: dto.rollNumber ? normalizeRollNumber(dto.rollNumber) : undefined,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            sectionId: dto.sectionId,
            currentStatus: dto.status
          },
          include: {
            user: true,
            section: { include: { class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } } } }
          }
        });
      });

      await this.logAudit("UPDATE_STUDENT", "StudentProfile", id, { fields: Object.keys(dto) });
      return { student: this.toStudentObject(student) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Student email or roll number already exists.");
      }
      throw error;
    }
  }

  async deactivate(id: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!student) throw new NotFoundException("Student not found.");

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: student.userId }, data: { status: UserStatus.INACTIVE } }),
      this.prisma.studentProfile.update({ where: { id }, data: { currentStatus: UserStatus.INACTIVE } }),
      this.prisma.authSession.updateMany({
        where: { userId: student.userId, status: AuthSessionStatus.ACTIVE },
        data: { status: AuthSessionStatus.REVOKED, revokedAt: new Date() }
      })
    ]);

    await this.logAudit("DEACTIVATE_STUDENT", "StudentProfile", id);
    return { ok: true };
  }

  async archive(id: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { id }, select: { userId: true, isArchived: true } });
    if (!student || student.isArchived) throw new NotFoundException("Student not found.");

    const archivedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: student.userId }, data: { status: UserStatus.INACTIVE } }),
      this.prisma.studentProfile.update({ where: { id }, data: { currentStatus: UserStatus.INACTIVE, isArchived: true, archivedAt } }),
      this.prisma.authSession.updateMany({
        where: { userId: student.userId, status: AuthSessionStatus.ACTIVE },
        data: { status: AuthSessionStatus.REVOKED, revokedAt: archivedAt }
      })
    ]);

    await this.logAudit("ARCHIVE_STUDENT", "StudentProfile", id);
    return { ok: true };
  }

  async reactivate(id: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!student) throw new NotFoundException("Student not found.");

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: student.userId }, data: { status: UserStatus.ACTIVE } }),
      this.prisma.studentProfile.update({ where: { id }, data: { currentStatus: UserStatus.ACTIVE } })
    ]);

    await this.logAudit("REACTIVATE_STUDENT", "StudentProfile", id);
    return { ok: true };
  }

  async resetPassword(id: string, dto: ResetStudentPasswordDto) {
    const student = await this.prisma.studentProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!student) throw new NotFoundException("Student not found.");

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: student.userId }, data: { passwordHash } }),
      this.prisma.authSession.updateMany({
        where: { userId: student.userId, status: AuthSessionStatus.ACTIVE },
        data: { status: AuthSessionStatus.REVOKED, revokedAt: new Date() }
      })
    ]);

    await this.logAudit("RESET_STUDENT_PASSWORD", "StudentProfile", id);
    return { ok: true };
  }

  async bulkCreate(dto: BulkCreateStudentsDto) {
    const created: string[] = [];
    const errors: { rollNumber: string; message: string }[] = [];

    for (const student of dto.students) {
      try {
        const result = await this.create(student);
        created.push(result.student.id);
      } catch (error) {
        errors.push({
          rollNumber: student.rollNumber,
          message: error instanceof Error ? error.message : "Student import failed."
        });
      }
    }

    await this.logAudit("BULK_CREATE_STUDENTS", "StudentProfile", undefined, { created: created.length, errors: errors.length });
    return { created: created.length, errors };
  }

  private async getSectionWithCampus(sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { class: { include: { batch: { include: { branch: { include: { program: true } } } } } } }
    });

    if (
      !section ||
      section.status !== StructureStatus.ACTIVE ||
      section.class.status !== StructureStatus.ACTIVE ||
      section.class.batch.status !== StructureStatus.ACTIVE ||
      section.class.batch.branch.status !== StructureStatus.ACTIVE ||
      section.class.batch.branch.program.status !== StructureStatus.ACTIVE
    ) {
      throw new BadRequestException("Section does not exist or is archived.");
    }
    return section;
  }

  private validateRequestedStructure(
    section: Awaited<ReturnType<StudentsService["getSectionWithCampus"]>>,
    dto: Pick<CreateStudentDto, "batchId" | "branchId" | "campusId" | "classId" | "programId" | "semester">
  ) {
    assertSectionMatchesCampus(section.class.batch.branch.program.campusId, dto.campusId);
    if (dto.programId && dto.programId !== section.class.batch.branch.programId) throw new BadRequestException("Department does not match selected section.");
    if (dto.branchId && dto.branchId !== section.class.batch.branchId) throw new BadRequestException("Branch does not match selected section.");
    if (dto.batchId && dto.batchId !== section.class.batchId) throw new BadRequestException("Batch does not match selected section.");
    if (dto.classId && dto.classId !== section.classId) throw new BadRequestException("Class does not match selected section.");
    if (dto.semester && dto.semester !== section.class.semesterNumber) throw new BadRequestException("Semester does not match selected class.");
  }

  private toStudentObject(student: {
    id: string;
    rollNumber: string;
    dateOfBirth: Date | null;
    currentStatus: UserStatus;
    user: { id: string; fullName: string; email: string; phone: string | null; campusId: string | null; status: UserStatus };
    section: {
      id: string;
      name: string;
      class: {
        id: string;
        label: string;
        semesterNumber: number;
        batch: { id: string; startYear: number; endYear: number; branch: { id: string; code: string; program: { id: string; code: string; campus: { id: string; code: string } } } };
      };
    };
  }) {
    return {
      id: student.id,
      currentSectionId: student.section.id,
      identity: {
        fullName: student.user.fullName,
        email: student.user.email.endsWith("@students.local") ? null : student.user.email,
        phone: student.user.phone,
        dateOfBirth: student.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        rollNumber: student.rollNumber,
        status: student.currentStatus
      },
      structure: {
        currentSectionId: student.section.id,
        campus: student.section.class.batch.branch.program.campus,
        program: student.section.class.batch.branch.program,
        branch: student.section.class.batch.branch,
        batch: student.section.class.batch,
        class: student.section.class,
        section: student.section
      }
    };
  }

  private async logAudit(action: string, entity: string, entityId?: string, metadata?: Prisma.InputJsonObject) {
    await this.prisma.auditLog.create({ data: { action, entity, entityId, metadata } });
  }
}
