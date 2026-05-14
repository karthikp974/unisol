import { Processor, WorkerHost } from "@nestjs/bullmq";
import { PermissionAction, Prisma, UserStatus } from "@prisma/client";
import { Job } from "bullmq";
import { readFile, unlink } from "fs/promises";
import { PDFParse } from "pdf-parse";
import { AuthUser, ScopeRef } from "../auth/auth.types";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { ParsedResultRow, parseResultRows } from "../results/result-pdf-parser";
import { RESULT_PDF_IMPORT_JOB, SYSTEM_QUEUE } from "./queue.constants";

type ResultPdfImportPayload = {
  filePath: string;
  originalName: string;
  examType: string;
  user: AuthUser;
};

@Processor(SYSTEM_QUEUE)
export class SystemProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService
  ) {
    super();
  }

  async process(job: Job) {
    await this.prisma.backgroundJobRecord.updateMany({ where: { externalId: job.id }, data: { status: "running" } });

    try {
      const result = job.name === RESULT_PDF_IMPORT_JOB ? await this.processResultPdf(job.data as ResultPdfImportPayload) : { ok: true, jobName: job.name };
      await this.prisma.backgroundJobRecord.updateMany({
        where: { externalId: job.id },
        data: { status: "completed", result: result as Prisma.InputJsonObject }
      });

      return result;
    } catch (error) {
      await this.prisma.backgroundJobRecord.updateMany({
        where: { externalId: job.id },
        data: { status: "failed", error: error instanceof Error ? error.message : "Background job failed." }
      });
      throw error;
    }
  }

  private async processResultPdf(payload: ResultPdfImportPayload) {
    let parsedRows: ParsedResultRow[] = [];
    try {
      const file = await readFile(payload.filePath);
      const parser = new PDFParse({ data: file });
      try {
        const parsed = await parser.getText();
        parsedRows = parseResultRows(parsed.text);
      } finally {
        await parser.destroy();
      }
    } finally {
      await unlink(payload.filePath).catch(() => undefined);
    }

    const summary = { parsed: parsedRows.length, imported: 0, skipped: 0, errors: [] as string[] };
    for (const row of parsedRows) {
      try {
        const student = await this.prisma.studentProfile.findFirst({
          where: { rollNumber: { equals: row.rollNumber, mode: "insensitive" }, currentStatus: UserStatus.ACTIVE },
          include: this.studentInclude
        });
        if (!student) {
          summary.skipped += 1;
          summary.errors.push(`${row.rollNumber}: student not found or inactive`);
          continue;
        }

        const subjects = await this.prisma.subject.findMany({
          where: { code: { equals: row.subjectCode, mode: "insensitive" }, status: "ACTIVE" },
          orderBy: { semesterNumber: "desc" }
        });
        const subject = subjects.find((item) => item.branchId === student.section.class.batch.branchId);
        if (!subject) {
          summary.skipped += 1;
          summary.errors.push(`${row.rollNumber}/${row.subjectCode}: subject not found for student branch`);
          continue;
        }

        const scope = this.studentToScope(student, subject.id);
        if (!this.permissions.can(payload.user, { action: PermissionAction.UPLOAD_RESULTS, scope }).allowed) {
          summary.skipped += 1;
          summary.errors.push(`${row.rollNumber}/${row.subjectCode}: upload permission denied`);
          continue;
        }

        await this.prisma.resultEntry.upsert({
          where: {
            studentProfileId_subjectId_examType: {
              studentProfileId: student.id,
              subjectId: subject.id,
              examType: payload.examType
            }
          },
          create: {
            studentProfileId: student.id,
            subjectId: subject.id,
            semesterNumber: subject.semesterNumber,
            examType: payload.examType,
            internals: row.internals,
            grade: row.grade,
            credits: row.credits,
            status: row.status,
            createdById: payload.user.id
          },
          update: {
            semesterNumber: subject.semesterNumber,
            internals: row.internals,
            grade: row.grade,
            credits: row.credits,
            status: row.status
          }
        });
        summary.imported += 1;
      } catch (error) {
        summary.skipped += 1;
        summary.errors.push(`${row.rollNumber}/${row.subjectCode}: ${error instanceof Error ? error.message : "import failed"}`);
      }
    }

    return { ok: true, originalName: payload.originalName, ...summary, errors: summary.errors.slice(0, 50) };
  }

  private studentToScope(student: Prisma.StudentProfileGetPayload<{ include: SystemProcessor["studentInclude"] }>, subjectId?: string): ScopeRef {
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

  private readonly studentInclude = {
    user: true,
    section: { include: { class: { include: { batch: { include: { branch: { include: { program: true } } } } } } } }
  } satisfies Prisma.StudentProfileInclude;
}
