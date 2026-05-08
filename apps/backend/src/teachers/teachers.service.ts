import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TeacherRoleKind, UserType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { toPagination } from "../common/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import { assertNoDuplicateAssignments, validateAssignmentShape } from "./teacher-assignment.util";
import { CreateTeacherDto, TeacherAssignmentDto, TeacherListQueryDto } from "./teachers.dto";

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: TeacherListQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.TeacherProfileWhereInput = {
      user: {
        status: "ACTIVE",
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: "insensitive" } },
                { email: { contains: query.search, mode: "insensitive" } }
              ]
            }
          : {})
      },
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
          designation: teacher.designation
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
    const passwordHash = await bcrypt.hash(dto.identity.password, 12);

    try {
      const teacher = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.identity.email.trim().toLowerCase(),
            passwordHash,
            fullName: dto.identity.fullName.trim(),
            phone: dto.identity.phone?.trim(),
            type: UserType.TEACHER
          }
        });

        const profile = await tx.teacherProfile.create({
          data: {
            userId: user.id,
            employeeCode: dto.identity.employeeCode.trim().toUpperCase(),
            designation: dto.identity.designation?.trim(),
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

      return { teacher: this.toTeacherObject(teacher) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Teacher email or employee code already exists.");
      }
      throw error;
    }
  }

  private async validateTeacherPayload(dto: CreateTeacherDto) {
    assertNoDuplicateAssignments(dto.assignments);
    for (const assignment of dto.assignments) {
      validateAssignmentShape(assignment);
      await this.validateAssignmentCatalog(assignment);
    }
  }

  private async validateAssignmentCatalog(assignment: TeacherAssignmentDto) {
    const campus = await this.prisma.campus.findUnique({ where: { id: assignment.campusId }, include: { group: true } });
    if (!campus) throw new BadRequestException("Campus does not exist.");

    const program = await this.prisma.program.findUnique({ where: { id: assignment.programId } });
    if (!program || program.campusId !== assignment.campusId) throw new BadRequestException("Program does not belong to selected campus.");

    const branch = await this.prisma.branch.findUnique({ where: { id: assignment.branchId } });
    if (!branch || branch.programId !== assignment.programId) throw new BadRequestException("Branch does not belong to selected program.");

    const batch = await this.prisma.batch.findUnique({ where: { id: assignment.batchId } });
    if (!batch || batch.branchId !== assignment.branchId) throw new BadRequestException("Batch does not belong to selected branch.");

    const academicClass = await this.prisma.academicClass.findUnique({ where: { id: assignment.classId } });
    if (!academicClass || academicClass.batchId !== assignment.batchId) throw new BadRequestException("Class does not belong to selected batch.");

    if (assignment.sectionId) {
      const section = await this.prisma.section.findUnique({ where: { id: assignment.sectionId } });
      if (!section || section.classId !== assignment.classId) throw new BadRequestException("Section does not belong to selected class.");
    }

    if (assignment.subjectId) {
      const subject = await this.prisma.subject.findUnique({ where: { id: assignment.subjectId } });
      if (!subject || subject.branchId !== assignment.branchId || subject.semesterNumber !== academicClass.semesterNumber) {
        throw new BadRequestException("Subject does not match selected branch and semester.");
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
    user: { id: string; fullName: string; email: string; phone: string | null };
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
    }[];
  }) {
    return {
      id: teacher.id,
      identity: {
        fullName: teacher.user.fullName,
        employeeCode: teacher.employeeCode,
        email: teacher.user.email,
        phone: teacher.user.phone,
        designation: teacher.designation,
        joinedOn: teacher.joinedOn?.toISOString().slice(0, 10)
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
}
