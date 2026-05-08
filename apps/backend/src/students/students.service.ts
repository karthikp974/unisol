import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserStatus, UserType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { toPagination } from "../common/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStudentDto, StudentListQueryDto, UpdateStudentDto } from "./students.dto";
import { assertSectionMatchesCampus, buildStudentFallbackEmail, normalizeAdmissionNo, normalizeRollNumber } from "./student.util";

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: StudentListQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.StudentProfileWhereInput = {
      currentStatus: UserStatus.ACTIVE,
      sectionId: query.sectionId,
      ...(query.classId ? { section: { classId: query.classId } } : {}),
      ...(query.campusId ? { section: { class: { batch: { branch: { program: { campusId: query.campusId } } } } } } : {}),
      ...(query.search
        ? {
            OR: [
              { rollNumber: { contains: query.search, mode: "insensitive" } },
              { admissionNo: { contains: query.search, mode: "insensitive" } },
              { user: { fullName: { contains: query.search, mode: "insensitive" } } }
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
        orderBy: { rollNumber: "asc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.studentProfile.count({ where })
    ]);

    return { items: items.map((student) => this.toStudentObject(student)), total, page: pagination.page, pageSize: pagination.pageSize };
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
    assertSectionMatchesCampus(section.class.batch.branch.program.campusId, dto.campusId);
    const rollNumber = normalizeRollNumber(dto.rollNumber);
    const admissionNo = normalizeAdmissionNo(dto.admissionNo);
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
            admissionNo,
            currentStatus: UserStatus.ACTIVE
          },
          include: {
            user: true,
            section: { include: { class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } } } }
          }
        });
      });

      return { student: this.toStudentObject(student) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Student email, roll number, or admission number already exists.");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateStudentDto) {
    const existing = await this.prisma.studentProfile.findUnique({ where: { id }, include: { user: true } });
    if (!existing) throw new NotFoundException("Student not found.");

    let campusId = existing.user.campusId;
    if (dto.sectionId) {
      const section = await this.getSectionWithCampus(dto.sectionId);
      campusId = section.class.batch.branch.program.campusId;
    }

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
          sectionId: dto.sectionId,
          currentStatus: dto.status
        },
        include: {
          user: true,
          section: { include: { class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } } } }
        }
      });
    });

    return { student: this.toStudentObject(student) };
  }

  async deactivate(id: string) {
    await this.update(id, { status: UserStatus.INACTIVE });
    return { ok: true };
  }

  private async getSectionWithCampus(sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { class: { include: { batch: { include: { branch: { include: { program: true } } } } } } }
    });

    if (!section) throw new BadRequestException("Section does not exist.");
    return section;
  }

  private toStudentObject(student: {
    id: string;
    rollNumber: string;
    admissionNo: string | null;
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
      identity: {
        fullName: student.user.fullName,
        email: student.user.email.endsWith("@students.local") ? null : student.user.email,
        phone: student.user.phone,
        rollNumber: student.rollNumber,
        admissionNo: student.admissionNo,
        status: student.currentStatus
      },
      structure: {
        campus: student.section.class.batch.branch.program.campus,
        program: student.section.class.batch.branch.program,
        branch: student.section.class.batch.branch,
        batch: student.section.class.batch,
        class: student.section.class,
        section: student.section
      }
    };
  }
}
