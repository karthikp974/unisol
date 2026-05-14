import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PermissionAction, Prisma, ResultEntryStatus, UserStatus, UserType } from "@prisma/client";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { AuthUser, ScopeRef } from "../auth/auth.types";
import { toPagination } from "../common/pagination.dto";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queues/queues.module";
import { RESULT_PDF_IMPORT_JOB } from "../queues/queue.constants";
import { ResultPdfImportDto, ResultsQueryDto, UpsertResultEntryDto } from "./results.dto";

type UploadedResultFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly queues: QueueService
  ) {}

  async list(user: AuthUser, query: ResultsQueryDto) {
    if (user.type === UserType.STUDENT) return this.myResults(user);
    const pagination = toPagination(query);
    const scope = await this.scopeForQuery(query);
    if (user.type === UserType.TEACHER && !scope) {
      throw new ForbiddenException("Teacher result lists must be filtered by assigned scope.");
    }
    if (user.type === UserType.TEACHER && !query.studentProfileId && !query.sectionId) {
      throw new ForbiddenException("Teacher result lists must include a student or section filter.");
    }
    this.assertAllowed(user, PermissionAction.VIEW_RESULTS, scope);

    const where: Prisma.ResultEntryWhereInput = {
      studentProfileId: query.studentProfileId,
      subjectId: query.subjectId,
      semesterNumber: query.semesterNumber,
      examType: query.examType?.trim().toUpperCase(),
      status: query.status,
      studentProfile: {
        sectionId: query.sectionId,
        ...(query.campusId ? { section: { class: { batch: { branch: { program: { campusId: query.campusId } } } } } } : {}),
        ...(query.search
          ? {
              OR: [
                { rollNumber: { contains: query.search, mode: "insensitive" } },
                { user: { fullName: { contains: query.search, mode: "insensitive" } } }
              ]
            }
          : {})
      }
    };

    const [items, total] = await Promise.all([
      this.prisma.resultEntry.findMany({
        where,
        include: this.include,
        orderBy: [{ semesterNumber: "asc" }, { subject: { code: "asc" } }],
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.resultEntry.count({ where })
    ]);

    const visibleItems = user.type === UserType.TEACHER ? items.filter((entry) => this.canViewEntry(user, entry)) : items;
    return { items: visibleItems.map((entry) => this.toResultObject(entry)), total: user.type === UserType.TEACHER ? visibleItems.length : total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async upsert(user: AuthUser, dto: UpsertResultEntryDto) {
    const student = await this.getStudent(dto.studentProfileId);
    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    if (!subject || subject.status !== "ACTIVE") throw new BadRequestException("Subject does not exist or is archived.");
    const scope = this.studentToScope(student, subject.id);
    this.assertAllowed(user, PermissionAction.UPLOAD_RESULTS, scope);

    if (subject.branchId !== student.section.class.batch.branchId || subject.semesterNumber !== dto.semesterNumber) {
      throw new BadRequestException("Subject does not match the student's branch and semester.");
    }
    if (student.user.status !== UserStatus.ACTIVE) throw new BadRequestException("Inactive student results cannot be changed.");

    const examType = dto.examType?.trim().toUpperCase() || "SEMESTER";
    const marks = this.normalizeMarks(dto);
    const entry = await this.prisma.resultEntry.upsert({
      where: { studentProfileId_subjectId_examType: { studentProfileId: dto.studentProfileId, subjectId: dto.subjectId, examType } },
      create: {
        studentProfileId: dto.studentProfileId,
        subjectId: dto.subjectId,
        semesterNumber: dto.semesterNumber,
        examType,
        internals: marks.internals,
        externals: marks.externals,
        totalMarks: marks.totalMarks,
        grade: marks.grade,
        credits: marks.credits,
        status: dto.status,
        createdById: user.id
      },
      update: {
        semesterNumber: dto.semesterNumber,
        internals: marks.internals,
        externals: marks.externals,
        totalMarks: marks.totalMarks,
        grade: marks.grade,
        credits: marks.credits,
        status: dto.status
      },
      include: this.include
    });
    await this.audit(user, "UPSERT_RESULT_ENTRY", "ResultEntry", entry.id, { examType });
    return { result: this.toResultObject(entry) };
  }

  async importPdf(user: AuthUser, file: UploadedResultFile | undefined, dto: ResultPdfImportDto) {
    if (!file) throw new BadRequestException("PDF file is required.");
    if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
      throw new BadRequestException("Only PDF result files are allowed.");
    }
    if (!this.canUploadSomeResults(user)) {
      throw new ForbiddenException("No active teacher assignment allows result upload.");
    }

    const importDir = join(process.cwd(), "uploads", "result-imports");
    await mkdir(importDir, { recursive: true });
    const storedFilename = `${Date.now()}-${randomUUID()}.pdf`;
    const storedPath = join(importDir, storedFilename);
    await writeFile(storedPath, file.buffer);

    const job = await this.queues.enqueueSystemJob(RESULT_PDF_IMPORT_JOB, {
      filePath: storedPath,
      originalName: file.originalname,
      examType: dto.examType?.trim().toUpperCase() || "SEMESTER_PDF",
      user
    });
    await this.audit(user, "QUEUE_RESULT_PDF_IMPORT", "BackgroundJobRecord", job.id, { originalName: file.originalname, size: file.size });
    return { job };
  }

  async importJobs(user: AuthUser, query: ResultsQueryDto) {
    if (user.type !== UserType.ADMIN && !this.canUploadSomeResults(user)) {
      throw new ForbiddenException("No active assignment allows result import jobs.");
    }
    const pagination = toPagination(query);
    const [items, total] = await Promise.all([
      this.prisma.backgroundJobRecord.findMany({
        where: { jobName: RESULT_PDF_IMPORT_JOB },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.backgroundJobRecord.count({ where: { jobName: RESULT_PDF_IMPORT_JOB } })
    ]);
    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async options(user: AuthUser) {
    if (user.type === UserType.STUDENT) throw new ForbiddenException("Students do not need result entry options.");
    if (user.type === UserType.ADMIN) {
      const [students, subjects] = await Promise.all([
        this.prisma.studentProfile.findMany({
          where: { currentStatus: UserStatus.ACTIVE },
          include: this.studentInclude,
          orderBy: { rollNumber: "asc" },
          take: 100
        }),
        this.prisma.subject.findMany({ where: { status: "ACTIVE" }, orderBy: [{ code: "asc" }], take: 100 })
      ]);
      return { students: students.map((student) => this.toStudentOption(student)), subjects };
    }

    const allowedScopes = user.assignments.filter((assignment) => this.permissions.can(user, { action: PermissionAction.VIEW_RESULTS, scope: assignment }).allowed);
    if (allowedScopes.length === 0) return { students: [], subjects: [] };

    const students = await this.prisma.studentProfile.findMany({
      where: { currentStatus: UserStatus.ACTIVE, OR: allowedScopes.map((scope) => this.scopeToStudentWhere(scope)) },
      include: this.studentInclude,
      orderBy: { rollNumber: "asc" },
      take: 100
    });
    const subjectPairs = students.map((student) => ({
      branchId: student.section.class.batch.branchId,
      semesterNumber: student.section.class.semesterNumber
    }));
    const explicitSubjectIds = allowedScopes.map((scope) => scope.subjectId).filter((id): id is string => Boolean(id));
    const subjects = await this.prisma.subject.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          ...explicitSubjectIds.map((id) => ({ id })),
          ...subjectPairs.map((pair) => ({ branchId: pair.branchId, semesterNumber: pair.semesterNumber }))
        ]
      },
      orderBy: [{ code: "asc" }],
      take: 100
    });
    return { students: students.map((student) => this.toStudentOption(student)), subjects };
  }

  async myResults(user: AuthUser) {
    if (user.type !== UserType.STUDENT) throw new ForbiddenException("Only students can use personal result endpoint.");
    const student = await this.prisma.studentProfile.findUnique({ where: { userId: user.id }, include: this.studentInclude });
    if (!student) throw new NotFoundException("Student profile not found.");
    const entries = await this.prisma.resultEntry.findMany({
      where: { studentProfileId: student.id },
      include: this.include,
      orderBy: [{ semesterNumber: "asc" }, { subject: { code: "asc" } }]
    });
    return this.buildStudentSummary(entries.map((entry) => this.toResultObject(entry)));
  }

  async studentResults(user: AuthUser, studentProfileId: string) {
    const student = await this.getStudent(studentProfileId);
    this.assertAllowed(user, PermissionAction.VIEW_RESULTS, this.studentToScope(student));
    const entries = await this.prisma.resultEntry.findMany({
      where: { studentProfileId },
      include: this.include,
      orderBy: [{ semesterNumber: "asc" }, { subject: { code: "asc" } }]
    });
    const visibleEntries = user.type === UserType.TEACHER ? entries.filter((entry) => this.canViewEntry(user, entry)) : entries;
    return this.buildStudentSummary(visibleEntries.map((entry) => this.toResultObject(entry)));
  }

  async export(user: AuthUser, query: ResultsQueryDto) {
    const page = await this.list(user, { ...query, page: 1, pageSize: 100 });
    const items = "items" in page ? page.items : page.results;
    const rows = [
      ["Roll", "Student", "Semester", "Exam", "Subject Code", "Subject", "Internals", "Externals", "Total", "Grade", "Credits", "Status"],
      ...items.map((item) => [
        item.student.rollNumber,
        item.student.fullName,
        String(item.semesterNumber),
        item.examType,
        item.subject.code,
        item.subject.name,
        item.internals ?? "",
        item.externals ?? "",
        item.totalMarks ?? "",
        item.grade ?? "",
        item.credits ?? "",
        item.status
      ])
    ];
    return { filename: "results-export.csv", csv: rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n") };
  }

  private normalizeMarks(dto: UpsertResultEntryDto) {
    if (dto.status === ResultEntryStatus.ABSENT || dto.status === ResultEntryStatus.WITHHELD) {
      return { internals: null, externals: null, totalMarks: null, grade: null, credits: null };
    }
    const internals = dto.internals ?? null;
    const externals = dto.externals ?? null;
    const totalMarks = dto.totalMarks ?? (internals === null && externals === null ? null : (internals ?? 0) + (externals ?? 0));
    return {
      internals,
      externals,
      totalMarks,
      grade: dto.grade?.trim().toUpperCase() || null,
      credits: dto.credits ?? null
    };
  }

  private buildStudentSummary(results: ReturnType<ResultsService["toResultObject"]>[]) {
    const failed = results.filter((result) => result.status === ResultEntryStatus.FAIL || result.status === ResultEntryStatus.ABSENT);
    const creditsEarned = results.filter((result) => result.status === ResultEntryStatus.PASS).reduce((sum, result) => sum + Number(result.credits ?? 0), 0);
    return {
      summary: { totalSubjects: results.length, passed: results.length - failed.length, failed: failed.length, creditsEarned },
      failedSubjects: failed,
      results
    };
  }

  private async scopeForQuery(query: ResultsQueryDto): Promise<ScopeRef | undefined> {
    if (query.studentProfileId) return this.studentToScope(await this.getStudent(query.studentProfileId), query.subjectId);
    if (query.campusId || query.sectionId || query.subjectId) return { campusId: query.campusId, sectionId: query.sectionId, subjectId: query.subjectId };
    return undefined;
  }

  private async getStudent(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({ where: { id: studentProfileId }, include: this.studentInclude });
    if (!student) throw new NotFoundException("Student not found.");
    return student;
  }

  private scopeToStudentWhere(scope: ScopeRef): Prisma.StudentProfileWhereInput {
    if (scope.sectionId) return { sectionId: scope.sectionId };
    if (scope.classId) return { section: { classId: scope.classId } };
    if (scope.batchId) return { section: { class: { batchId: scope.batchId } } };
    if (scope.branchId) return { section: { class: { batch: { branchId: scope.branchId } } } };
    if (scope.programId) return { section: { class: { batch: { branch: { programId: scope.programId } } } } };
    if (scope.campusId) return { section: { class: { batch: { branch: { program: { campusId: scope.campusId } } } } } };
    if (scope.campusGroupId) return { section: { class: { batch: { branch: { program: { campus: { groupId: scope.campusGroupId } } } } } } };
    return { id: "__no_scope__" };
  }

  private toStudentOption(student: Awaited<ReturnType<ResultsService["getStudent"]>>) {
    return {
      id: student.id,
      identity: { rollNumber: student.rollNumber, fullName: student.user.fullName },
      structure: {
        campusId: student.section.class.batch.branch.program.campusId,
        branchId: student.section.class.batch.branchId,
        semesterNumber: student.section.class.semesterNumber,
        sectionId: student.sectionId,
        section: student.section.name
      }
    };
  }

  private canViewEntry(user: AuthUser, entry: Prisma.ResultEntryGetPayload<{ include: ResultsService["include"] }>) {
    return this.permissions.can(user, { action: PermissionAction.VIEW_RESULTS, scope: this.studentToScope(entry.studentProfile, entry.subjectId) }).allowed;
  }

  private studentToScope(student: Awaited<ReturnType<ResultsService["getStudent"]>>, subjectId?: string): ScopeRef {
    return {
      campusId: student.section.class.batch.branch.program.campusId,
      programId: student.section.class.batch.branch.programId,
      branchId: student.section.class.batch.branchId,
      batchId: student.section.class.batchId,
      classId: student.section.classId,
      sectionId: student.sectionId,
      subjectId
    };
  }

  private toResultObject(entry: Prisma.ResultEntryGetPayload<{ include: ResultsService["include"] }>) {
    return {
      id: entry.id,
      semesterNumber: entry.semesterNumber,
      examType: entry.examType,
      internals: entry.internals === null ? null : Number(entry.internals),
      externals: entry.externals === null ? null : Number(entry.externals),
      totalMarks: entry.totalMarks === null ? null : Number(entry.totalMarks),
      grade: entry.grade,
      credits: entry.credits === null ? null : Number(entry.credits),
      status: entry.status,
      student: { id: entry.studentProfile.id, rollNumber: entry.studentProfile.rollNumber, fullName: entry.studentProfile.user.fullName },
      subject: { id: entry.subject.id, code: entry.subject.code, name: entry.subject.name },
      structure: {
        campus: entry.studentProfile.section.class.batch.branch.program.campusId,
        section: entry.studentProfile.section.name,
        semester: entry.studentProfile.section.class.semesterNumber
      },
      createdBy: entry.createdBy.fullName,
      updatedAt: entry.updatedAt
    };
  }

  private assertAllowed(user: AuthUser, action: PermissionAction, scope?: ScopeRef) {
    const decision = this.permissions.can(user, { action, scope });
    if (!decision.allowed) throw new ForbiddenException(decision.reason);
  }

  private canUploadSomeResults(user: AuthUser) {
    if (user.type === UserType.ADMIN) return true;
    if (user.type !== UserType.TEACHER) return false;
    return user.assignments.some((assignment) => this.permissions.can(user, { action: PermissionAction.UPLOAD_RESULTS, scope: assignment }).allowed);
  }

  private audit(user: AuthUser, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonObject) {
    return this.prisma.auditLog.create({ data: { userId: user.id, action, entity: entityType, entityId, metadata } });
  }

  private readonly studentInclude = {
    user: true,
    section: { include: { class: { include: { batch: { include: { branch: { include: { program: true } } } } } } } }
  } satisfies Prisma.StudentProfileInclude;

  private readonly include = {
    studentProfile: {
      include: {
        user: true,
        section: { include: { class: { include: { batch: { include: { branch: { include: { program: true } } } } } } } }
      }
    },
    subject: true,
    createdBy: { select: { fullName: true } }
  } satisfies Prisma.ResultEntryInclude;
}
