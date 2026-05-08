import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, StructureStatus } from "@prisma/client";
import { PaginationQueryDto, toPagination } from "../common/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateBatchDto,
  CreateBranchDto,
  CreateCampusDto,
  CreateClassDto,
  CreateProgramDto,
  CreateSectionDto,
  CreateSubjectDto,
  GenerateBatchClassesDto,
  ScopedStructureQueryDto,
  UpdateBatchDto,
  UpdateBranchDto,
  UpdateCampusDto,
  UpdateClassDto,
  UpdateProgramDto,
  UpdateSectionDto,
  UpdateSubjectDto
} from "./structure.dto";
import {
  assertValidBatchYears,
  assertValidClassPlacement,
  assertValidSubjectSemester,
  classLabelForSemester,
  normalizeCode,
  normalizeName
} from "./structure.util";

@Injectable()
export class CoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getFoundationSummary() {
    const [campuses, programs, branches, batches, classes, sections, subjects, users, roleAssignments] = await Promise.all([
      this.prisma.campus.count(),
      this.prisma.program.count(),
      this.prisma.branch.count(),
      this.prisma.batch.count(),
      this.prisma.academicClass.count(),
      this.prisma.section.count(),
      this.prisma.subject.count(),
      this.prisma.user.count(),
      this.prisma.teacherRoleAssignment.count({ where: { isActive: true } })
    ]);

    return {
      campuses,
      programs,
      branches,
      batches,
      classes,
      sections,
      subjects,
      users,
      activeTeacherRoleAssignments: roleAssignments,
      structure: "Campus -> Program -> Branch -> Batch -> Class -> Section -> Users"
    };
  }

  async listCampuses(query: PaginationQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.CampusWhereInput = {
      status: StructureStatus.ACTIVE,
      ...(query.search
        ? {
          OR: [
            { code: { contains: query.search, mode: "insensitive" as const } },
            { name: { contains: query.search, mode: "insensitive" as const } }
          ]
        }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.campus.findMany({
        where,
        include: { group: true },
        orderBy: { code: "asc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.campus.count({ where })
    ]);

    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async listCampusGroups() {
    return this.prisma.campusGroup.findMany({ orderBy: { name: "asc" } });
  }

  async createCampus(dto: CreateCampusDto) {
    await this.ensureCampusGroup(dto.groupId);
    return this.safeWrite(() =>
      this.prisma.campus.create({
        data: {
          code: normalizeCode(dto.code),
          name: normalizeName(dto.name),
          groupId: dto.groupId
        },
        include: { group: true }
      })
    );
  }

  async updateCampus(id: string, dto: UpdateCampusDto) {
    await this.ensureCampus(id);
    if (dto.groupId) {
      await this.ensureCampusGroup(dto.groupId);
    }

    return this.safeWrite(() =>
      this.prisma.campus.update({
        where: { id },
        data: {
          code: dto.code ? normalizeCode(dto.code) : undefined,
          name: dto.name ? normalizeName(dto.name) : undefined,
          groupId: dto.groupId
        },
        include: { group: true }
      })
    );
  }

  async archiveCampus(id: string) {
    await this.ensureCampus(id);
    return this.prisma.campus.update({ where: { id }, data: { status: StructureStatus.ARCHIVED } });
  }

  async listPrograms(query: ScopedStructureQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.ProgramWhereInput = {
      status: StructureStatus.ACTIVE,
      campusId: query.campusId,
      campus: { status: StructureStatus.ACTIVE },
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: "insensitive" } },
              { name: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.program.findMany({
        where,
        include: { campus: true },
        orderBy: [{ campus: { code: "asc" } }, { code: "asc" }],
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.program.count({ where })
    ]);

    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async createProgram(dto: CreateProgramDto) {
    await this.ensureCampus(dto.campusId);
    return this.safeWrite(() =>
      this.prisma.program.create({
        data: {
          campusId: dto.campusId,
          code: normalizeCode(dto.code),
          name: normalizeName(dto.name),
          durationValue: dto.durationValue,
          durationUnit: dto.durationUnit,
          semesters: dto.semesters
        },
        include: { campus: true }
      })
    );
  }

  async updateProgram(id: string, dto: UpdateProgramDto) {
    await this.ensureProgram(id);
    return this.safeWrite(() =>
      this.prisma.program.update({
        where: { id },
        data: {
          code: dto.code ? normalizeCode(dto.code) : undefined,
          name: dto.name ? normalizeName(dto.name) : undefined,
          durationValue: dto.durationValue,
          durationUnit: dto.durationUnit,
          semesters: dto.semesters
        },
        include: { campus: true }
      })
    );
  }

  async archiveProgram(id: string) {
    await this.ensureProgram(id);
    return this.prisma.program.update({ where: { id }, data: { status: StructureStatus.ARCHIVED } });
  }

  async listBranches(query: ScopedStructureQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.BranchWhereInput = {
      status: StructureStatus.ACTIVE,
      programId: query.programId,
      program: { status: StructureStatus.ACTIVE, ...(query.campusId ? { campusId: query.campusId } : {}) },
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: "insensitive" } },
              { name: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        include: { program: { include: { campus: true } } },
        orderBy: [{ program: { code: "asc" } }, { code: "asc" }],
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.branch.count({ where })
    ]);

    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async createBranch(dto: CreateBranchDto) {
    await this.ensureProgram(dto.programId);
    return this.safeWrite(() =>
      this.prisma.branch.create({
        data: {
          programId: dto.programId,
          code: normalizeCode(dto.code),
          name: normalizeName(dto.name)
        },
        include: { program: { include: { campus: true } } }
      })
    );
  }

  async updateBranch(id: string, dto: UpdateBranchDto) {
    await this.ensureBranch(id);
    return this.safeWrite(() =>
      this.prisma.branch.update({
        where: { id },
        data: {
          code: dto.code ? normalizeCode(dto.code) : undefined,
          name: dto.name ? normalizeName(dto.name) : undefined
        },
        include: { program: { include: { campus: true } } }
      })
    );
  }

  async archiveBranch(id: string) {
    await this.ensureBranch(id);
    return this.prisma.branch.update({ where: { id }, data: { status: StructureStatus.ARCHIVED } });
  }

  async listBatches(query: ScopedStructureQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.BatchWhereInput = {
      status: StructureStatus.ACTIVE,
      branchId: query.branchId,
      branch: {
        status: StructureStatus.ACTIVE,
        ...(query.programId ? { programId: query.programId } : {}),
        ...(query.campusId ? { program: { campusId: query.campusId, status: StructureStatus.ACTIVE } } : {})
      }
    };

    const [items, total] = await Promise.all([
      this.prisma.batch.findMany({
        where,
        include: { branch: { include: { program: { include: { campus: true } } } } },
        orderBy: [{ startYear: "desc" }, { endYear: "desc" }],
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.batch.count({ where })
    ]);

    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async createBatch(dto: CreateBatchDto) {
    assertValidBatchYears(dto.startYear, dto.endYear);
    await this.ensureBranch(dto.branchId);
    return this.safeWrite(() =>
      this.prisma.batch.create({
        data: dto,
        include: { branch: { include: { program: { include: { campus: true } } } } }
      })
    );
  }

  async updateBatch(id: string, dto: UpdateBatchDto) {
    const batch = await this.ensureBatch(id);
    const startYear = dto.startYear ?? batch.startYear;
    const endYear = dto.endYear ?? batch.endYear;
    assertValidBatchYears(startYear, endYear);

    return this.safeWrite(() =>
      this.prisma.batch.update({
        where: { id },
        data: { startYear: dto.startYear, endYear: dto.endYear },
        include: { branch: { include: { program: { include: { campus: true } } } } }
      })
    );
  }

  async archiveBatch(id: string) {
    await this.ensureBatch(id);
    return this.prisma.batch.update({ where: { id }, data: { status: StructureStatus.ARCHIVED } });
  }

  async generateBatchClasses(id: string, dto: GenerateBatchClassesDto) {
    const batch = await this.ensureBatchWithProgram(id);
    const sectionNames = (dto.sectionNames?.length ? dto.sectionNames : ["A"]).map(normalizeCode);
    const programSemesters = batch.branch.program.semesters;

    return this.prisma.$transaction(async (tx) => {
      const classes = [];
      for (let semesterNumber = 1; semesterNumber <= programSemesters; semesterNumber += 1) {
        const yearNumber = Math.ceil(semesterNumber / 2);
        const academicClass = await tx.academicClass.upsert({
          where: { batchId_semesterNumber: { batchId: id, semesterNumber } },
          update: {
            yearNumber,
            label: classLabelForSemester(semesterNumber)
          },
          create: {
            batchId: id,
            yearNumber,
            semesterNumber,
            label: classLabelForSemester(semesterNumber)
          }
        });

        for (const sectionName of sectionNames) {
          await tx.section.upsert({
            where: { classId_name: { classId: academicClass.id, name: sectionName } },
            update: { capacity: dto.sectionCapacity },
            create: {
              classId: academicClass.id,
              name: sectionName,
              capacity: dto.sectionCapacity
            }
          });
        }

        classes.push(academicClass);
      }

      return {
        generatedClasses: classes.length,
        generatedSectionsPerClass: sectionNames.length
      };
    });
  }

  async listClasses(query: ScopedStructureQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.AcademicClassWhereInput = {
      status: StructureStatus.ACTIVE,
      batchId: query.batchId,
      batch: {
        status: StructureStatus.ACTIVE,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.programId || query.campusId
          ? {
              branch: {
                status: StructureStatus.ACTIVE,
                ...(query.programId ? { programId: query.programId } : {}),
                ...(query.campusId ? { program: { campusId: query.campusId, status: StructureStatus.ACTIVE } } : {})
              }
            }
          : {})
      }
    };

    const [items, total] = await Promise.all([
      this.prisma.academicClass.findMany({
        where,
        include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } },
        orderBy: [{ semesterNumber: "asc" }],
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.academicClass.count({ where })
    ]);

    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async createClass(dto: CreateClassDto) {
    const batch = await this.ensureBatchWithProgram(dto.batchId);
    assertValidClassPlacement(dto.yearNumber, dto.semesterNumber, batch.branch.program.semesters);

    return this.safeWrite(() =>
      this.prisma.academicClass.create({
        data: {
          batchId: dto.batchId,
          yearNumber: dto.yearNumber,
          semesterNumber: dto.semesterNumber,
          label: normalizeName(dto.label)
        },
        include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } }
      })
    );
  }

  async updateClass(id: string, dto: UpdateClassDto) {
    const academicClass = await this.ensureClassWithProgram(id);
    const yearNumber = dto.yearNumber ?? academicClass.yearNumber;
    const semesterNumber = dto.semesterNumber ?? academicClass.semesterNumber;
    assertValidClassPlacement(yearNumber, semesterNumber, academicClass.batch.branch.program.semesters);

    return this.safeWrite(() =>
      this.prisma.academicClass.update({
        where: { id },
        data: {
          yearNumber: dto.yearNumber,
          semesterNumber: dto.semesterNumber,
          label: dto.label ? normalizeName(dto.label) : undefined
        },
        include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } }
      })
    );
  }

  async archiveClass(id: string) {
    await this.ensureClass(id);
    return this.prisma.academicClass.update({ where: { id }, data: { status: StructureStatus.ARCHIVED } });
  }

  async listSections(query: ScopedStructureQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.SectionWhereInput = {
      status: StructureStatus.ACTIVE,
      classId: query.classId,
      class: {
        status: StructureStatus.ACTIVE,
        ...(query.batchId ? { batchId: query.batchId } : {}),
        ...(query.branchId || query.programId || query.campusId
          ? {
              batch: {
                status: StructureStatus.ACTIVE,
                ...(query.branchId ? { branchId: query.branchId } : {}),
                ...(query.programId || query.campusId
                  ? {
                      branch: {
                        status: StructureStatus.ACTIVE,
                        ...(query.programId ? { programId: query.programId } : {}),
                        ...(query.campusId ? { program: { campusId: query.campusId, status: StructureStatus.ACTIVE } } : {})
                      }
                    }
                  : {})
              }
            }
          : {})
      },
      ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.section.findMany({
        where,
        include: {
          class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } }
        },
        orderBy: { name: "asc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.section.count({ where })
    ]);

    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async listSubjects(query: ScopedStructureQueryDto) {
    const pagination = toPagination(query);
    const where: Prisma.SubjectWhereInput = {
      status: StructureStatus.ACTIVE,
      branchId: query.branchId,
      branch: { status: StructureStatus.ACTIVE },
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: "insensitive" } },
              { name: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        include: { branch: { include: { program: { include: { campus: true } } } } },
        orderBy: [{ semesterNumber: "asc" }, { code: "asc" }],
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.subject.count({ where })
    ]);

    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async createSubject(dto: CreateSubjectDto) {
    const branch = await this.ensureBranchWithProgram(dto.branchId);
    assertValidSubjectSemester(dto.semesterNumber, branch.program.semesters);

    return this.safeWrite(() =>
      this.prisma.subject.create({
        data: {
          branchId: dto.branchId,
          code: normalizeCode(dto.code),
          name: normalizeName(dto.name),
          semesterNumber: dto.semesterNumber
        },
        include: { branch: { include: { program: { include: { campus: true } } } } }
      })
    );
  }

  async updateSubject(id: string, dto: UpdateSubjectDto) {
    const subject = await this.ensureSubjectWithProgram(id);
    const semesterNumber = dto.semesterNumber ?? subject.semesterNumber;
    assertValidSubjectSemester(semesterNumber, subject.branch.program.semesters);

    return this.safeWrite(() =>
      this.prisma.subject.update({
        where: { id },
        data: {
          code: dto.code ? normalizeCode(dto.code) : undefined,
          name: dto.name ? normalizeName(dto.name) : undefined,
          semesterNumber: dto.semesterNumber
        },
        include: { branch: { include: { program: { include: { campus: true } } } } }
      })
    );
  }

  async archiveSubject(id: string) {
    await this.ensureSubjectWithProgram(id);
    return this.prisma.subject.update({ where: { id }, data: { status: StructureStatus.ARCHIVED } });
  }

  async createSection(dto: CreateSectionDto) {
    await this.ensureClass(dto.classId);
    return this.safeWrite(() =>
      this.prisma.section.create({
        data: {
          classId: dto.classId,
          name: normalizeCode(dto.name),
          capacity: dto.capacity
        },
        include: {
          class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } }
        }
      })
    );
  }

  async updateSection(id: string, dto: UpdateSectionDto) {
    await this.ensureSection(id);
    return this.safeWrite(() =>
      this.prisma.section.update({
        where: { id },
        data: {
          name: dto.name ? normalizeCode(dto.name) : undefined,
          capacity: dto.capacity
        },
        include: {
          class: { include: { batch: { include: { branch: { include: { program: { include: { campus: true } } } } } } } }
        }
      })
    );
  }

  async archiveSection(id: string) {
    await this.ensureSection(id);
    return this.prisma.section.update({ where: { id }, data: { status: StructureStatus.ARCHIVED } });
  }

  private async ensureCampusGroup(id: string) {
    const group = await this.prisma.campusGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException("Campus group not found.");
    return group;
  }

  private async ensureCampus(id: string) {
    const campus = await this.prisma.campus.findUnique({ where: { id } });
    if (!campus) throw new NotFoundException("Campus not found.");
    return campus;
  }

  private async ensureProgram(id: string) {
    const program = await this.prisma.program.findUnique({ where: { id } });
    if (!program) throw new NotFoundException("Program not found.");
    return program;
  }

  private async ensureBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException("Branch not found.");
    return branch;
  }

  private async ensureBranchWithProgram(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { program: true }
    });
    if (!branch) throw new NotFoundException("Branch not found.");
    return branch;
  }

  private async ensureBatch(id: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException("Batch not found.");
    return batch;
  }

  private async ensureBatchWithProgram(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: { branch: { include: { program: true } } }
    });
    if (!batch) throw new NotFoundException("Batch not found.");
    return batch;
  }

  private async ensureClass(id: string) {
    const academicClass = await this.prisma.academicClass.findUnique({ where: { id } });
    if (!academicClass) throw new NotFoundException("Class not found.");
    return academicClass;
  }

  private async ensureClassWithProgram(id: string) {
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id },
      include: { batch: { include: { branch: { include: { program: true } } } } }
    });
    if (!academicClass) throw new NotFoundException("Class not found.");
    return academicClass;
  }

  private async ensureSection(id: string) {
    const section = await this.prisma.section.findUnique({ where: { id } });
    if (!section) throw new NotFoundException("Section not found.");
    return section;
  }

  private async ensureSubjectWithProgram(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: { branch: { include: { program: true } } }
    });
    if (!subject) throw new NotFoundException("Subject not found.");
    return subject;
  }

  private async safeWrite<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("A record with the same unique details already exists.");
      }
      throw error;
    }
  }
}
