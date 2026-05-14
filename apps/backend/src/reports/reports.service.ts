import { ForbiddenException, Injectable } from "@nestjs/common";
import { AttendanceEntryStatus, FeePaymentStatus, PermissionAction, Prisma, ResultEntryStatus, StudentApplicationStatus, UserStatus, UserType } from "@prisma/client";
import { AuthUser, ScopeRef } from "../auth/auth.types";
import { toPagination } from "../common/pagination.dto";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsQueryDto } from "./reports.dto";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService
  ) {}

  async summary(user: AuthUser, query: ReportsQueryDto) {
    const scope = this.resolveScope(user, query);
    this.assertAllowed(user, PermissionAction.VIEW_REPORTS, scope);
    const [students, attendance, finance, results, applications] = await Promise.all([
      this.studentSummary(scope),
      this.attendanceSummary(user, query, scope),
      this.financeSummary(user, scope),
      this.resultsSummary(user, scope),
      this.applicationSummary(user, scope)
    ]);
    return { scope, students, attendance, finance, results, applications };
  }

  async attendance(user: AuthUser, query: ReportsQueryDto) {
    const scope = this.resolveScope(user, query);
    this.assertAllowed(user, PermissionAction.VIEW_ATTENDANCE, scope);
    const pagination = toPagination(query);
    const where = this.attendanceWhere(query, scope);
    const [sessions, total] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        include: { section: true, subject: true, entries: true },
        orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take
      }),
      this.prisma.attendanceSession.count({ where })
    ]);
    const items = sessions.map((session) => {
      const present = session.entries.filter((entry) => entry.status === AttendanceEntryStatus.PRESENT).length;
      const totalEntries = session.entries.length;
      return {
        id: session.id,
        date: session.attendanceDate,
        section: session.section.name,
        subject: session.subject?.name ?? "General",
        total: totalEntries,
        present,
        absent: totalEntries - present,
        percentage: totalEntries ? Math.round((present / totalEntries) * 10000) / 100 : 0
      };
    });
    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async finance(user: AuthUser, query: ReportsQueryDto) {
    const scope = this.resolveScope(user, query);
    this.assertAllowed(user, PermissionAction.VIEW_FEES, scope);
    const payments = await this.prisma.feePayment.findMany({
      where: { status: FeePaymentStatus.ACTIVE, studentProfile: this.studentProfileRelationWhere(scope) },
      include: { feeHead: true, studentFeeAssignment: { include: { feeStructure: true } }, studentProfile: { include: { user: true } } },
      orderBy: { paidAt: "desc" },
      take: 100
    });
    const byHead = payments.reduce<Record<string, { feeHead: string; amount: number; count: number }>>((acc, payment) => {
      const feeName = payment.studentFeeAssignment?.feeStructure.feeName ?? payment.feeHead.name;
      acc[payment.feeHeadId] = acc[payment.feeHeadId] ?? { feeHead: feeName, amount: 0, count: 0 };
      acc[payment.feeHeadId].amount += Number(payment.amount);
      acc[payment.feeHeadId].count += 1;
      return acc;
    }, {});
    return {
      summary: { collected: payments.reduce((sum, payment) => sum + Number(payment.amount), 0), payments: payments.length },
      byHead: Object.values(byHead),
      recent: payments.slice(0, 25).map((payment) => ({ id: payment.id, receiptNo: payment.receiptNo, student: payment.studentProfile.user.fullName, feeHead: payment.studentFeeAssignment?.feeStructure.feeName ?? payment.feeHead.name, amount: Number(payment.amount), paidAt: payment.paidAt }))
    };
  }

  async results(user: AuthUser, query: ReportsQueryDto) {
    const scope = this.resolveScope(user, query);
    this.assertAllowed(user, PermissionAction.VIEW_RESULTS, scope);
    const entries = await this.prisma.resultEntry.findMany({
      where: { studentProfile: this.studentProfileRelationWhere(scope) },
      include: { subject: true, studentProfile: { include: { user: true } } },
      orderBy: [{ semesterNumber: "asc" }, { updatedAt: "desc" }],
      take: 100
    });
    const byStatus = entries.reduce<Record<ResultEntryStatus, number>>(
      (acc, entry) => ({ ...acc, [entry.status]: acc[entry.status] + 1 }),
      { PASS: 0, FAIL: 0, ABSENT: 0, WITHHELD: 0 }
    );
    return {
      summary: { totalEntries: entries.length, ...byStatus },
      recentFailures: entries
        .filter((entry) => entry.status === ResultEntryStatus.FAIL || entry.status === ResultEntryStatus.ABSENT)
        .slice(0, 25)
        .map((entry) => ({ id: entry.id, rollNumber: entry.studentProfile.rollNumber, student: entry.studentProfile.user.fullName, subject: entry.subject.name, grade: entry.grade, status: entry.status }))
    };
  }

  async exportAttendance(user: AuthUser, query: ReportsQueryDto) {
    const report = await this.attendance(user, { ...query, page: 1, pageSize: 100 });
    const rows = [
      ["Date", "Section", "Subject", "Total", "Present", "Absent", "Percentage"],
      ...report.items.map((item) => [new Date(item.date).toISOString().slice(0, 10), item.section, item.subject, item.total, item.present, item.absent, item.percentage])
    ];
    return { filename: "attendance-report.csv", csv: this.toCsv(rows) };
  }

  private async studentSummary(scope: ScopeRef) {
    const where: Prisma.StudentProfileWhereInput = { currentStatus: UserStatus.ACTIVE, ...this.studentWhere(scope) };
    const total = await this.prisma.studentProfile.count({ where });
    return { active: total };
  }

  private async attendanceSummary(user: AuthUser, query: ReportsQueryDto, scope: ScopeRef) {
    if (!this.permissions.can(user, { action: PermissionAction.VIEW_ATTENDANCE, scope }).allowed) return { sessions: 0, present: 0, absent: 0, percentage: 0 };
    const sessions = await this.prisma.attendanceSession.findMany({ where: this.attendanceWhere(query, scope), include: { entries: true }, take: 100 });
    const present = sessions.reduce((sum, session) => sum + session.entries.filter((entry) => entry.status === AttendanceEntryStatus.PRESENT).length, 0);
    const total = sessions.reduce((sum, session) => sum + session.entries.length, 0);
    return { sessions: sessions.length, present, absent: total - present, percentage: total ? Math.round((present / total) * 10000) / 100 : 0 };
  }

  private async financeSummary(user: AuthUser, scope: ScopeRef) {
    if (!this.permissions.can(user, { action: PermissionAction.VIEW_FEES, scope }).allowed) return { collected: 0, payments: 0 };
    const aggregate = await this.prisma.feePayment.aggregate({
      where: { status: FeePaymentStatus.ACTIVE, studentProfile: this.studentProfileRelationWhere(scope) },
      _sum: { amount: true },
      _count: true
    });
    return { collected: Number(aggregate._sum.amount ?? 0), payments: aggregate._count };
  }

  private async resultsSummary(user: AuthUser, scope: ScopeRef) {
    if (!this.permissions.can(user, { action: PermissionAction.VIEW_RESULTS, scope }).allowed) return { totalEntries: 0, failedOrAbsent: 0 };
    const [totalEntries, failedOrAbsent] = await Promise.all([
      this.prisma.resultEntry.count({ where: { studentProfile: this.studentProfileRelationWhere(scope) } }),
      this.prisma.resultEntry.count({ where: { status: { in: [ResultEntryStatus.FAIL, ResultEntryStatus.ABSENT] }, studentProfile: this.studentProfileRelationWhere(scope) } })
    ]);
    return { totalEntries, failedOrAbsent };
  }

  private async applicationSummary(user: AuthUser, scope: ScopeRef) {
    if (!this.permissions.can(user, { action: PermissionAction.VIEW_APPLICATIONS, scope }).allowed) return { pending: 0 };
    return { pending: await this.prisma.studentApplication.count({ where: { status: StudentApplicationStatus.PENDING, studentProfile: this.studentProfileRelationWhere(scope) } }) };
  }

  private resolveScope(user: AuthUser, query: ReportsQueryDto): ScopeRef {
    const queryScope = this.queryToScope(query);
    if (Object.values(queryScope).some(Boolean)) return queryScope;
    if (user.type === UserType.ADMIN) return {};
    const firstScope = user.assignments[0];
    if (!firstScope) throw new ForbiddenException("Reports require an assigned teacher scope.");
    return firstScope;
  }

  private queryToScope(query: ReportsQueryDto): ScopeRef {
    return { campusId: query.campusId, programId: query.programId, branchId: query.branchId, batchId: query.batchId, classId: query.classId, sectionId: query.sectionId };
  }

  private attendanceWhere(query: ReportsQueryDto, scope: ScopeRef): Prisma.AttendanceSessionWhereInput {
    return {
      campusId: scope.campusId,
      programId: scope.programId,
      branchId: scope.branchId,
      batchId: scope.batchId,
      classId: scope.classId,
      sectionId: scope.sectionId,
      attendanceDate: query.from || query.to ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined } : undefined
    };
  }

  private studentWhere(scope: ScopeRef): Prisma.StudentProfileWhereInput {
    if (scope.sectionId) return { sectionId: scope.sectionId };
    if (scope.classId) return { section: { classId: scope.classId } };
    if (scope.batchId) return { section: { class: { batchId: scope.batchId } } };
    if (scope.branchId) return { section: { class: { batch: { branchId: scope.branchId } } } };
    if (scope.programId) return { section: { class: { batch: { branch: { programId: scope.programId } } } } };
    if (scope.campusId) return { section: { class: { batch: { branch: { program: { campusId: scope.campusId } } } } } };
    return {};
  }

  private studentProfileRelationWhere(scope: ScopeRef): Prisma.StudentProfileWhereInput {
    return this.studentWhere(scope);
  }

  private assertAllowed(user: AuthUser, action: PermissionAction, scope?: ScopeRef) {
    const decision = this.permissions.can(user, { action, scope });
    if (!decision.allowed) throw new ForbiddenException(decision.reason);
  }

  private toCsv(rows: (string | number | Date | null)[][]) {
    return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  }
}
