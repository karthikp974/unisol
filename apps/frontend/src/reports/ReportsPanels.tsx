import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "../auth/auth-context";
import { SafeActionButton } from "../shared/SafeActionButton";
import { useToast } from "../shared/toast-context";
import { PaginatedResponse } from "../structure/structure-types";

type ReportsSummary = {
  students: { active: number };
  attendance: { sessions: number; present: number; absent: number; percentage: number };
  finance: { collected: number; payments: number };
  results: { totalEntries: number; failedOrAbsent: number };
  applications: { pending: number };
};
type AttendanceReportRow = {
  id: string;
  date: string;
  section: string;
  subject: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
};
type FinanceReport = {
  summary: { collected: number; payments: number };
  byHead: { feeHead: string; amount: number; count: number }[];
};
type ResultsReport = {
  summary: { totalEntries: number; PASS: number; FAIL: number; ABSENT: number; WITHHELD: number };
  recentFailures: { id: string; rollNumber: string; student: string; subject: string; grade?: string | null; status: string }[];
};
type TeacherReportAssignment = { id: string; role: string; scopeLabel: string; section?: { id: string; name: string } | null };

const inputClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function useApi() {
  const { authFetch } = useAuth();

  async function fetchJson<T>(path: string) {
    const response = await authFetch(path);
    if (!response.ok) throw new Error(`Request failed: ${path}`);
    return (await response.json()) as T;
  }

  return { fetchJson };
}

export function AdminReportsPanel() {
  return <ReportsPanel title="Reports Dashboard" description="Backend-generated ERP summaries and exports." />;
}

export function TeacherReportsPanel() {
  return <ReportsPanel title="Scoped Reports" description="Reports generated within your assigned teacher scope." />;
}

function ReportsPanel({ title, description }: { title: string; description: string }) {
  const { fetchJson } = useApi();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceReportRow[]>([]);
  const [finance, setFinance] = useState<FinanceReport | null>(null);
  const [results, setResults] = useState<ResultsReport | null>(null);
  const [assignments, setAssignments] = useState<TeacherReportAssignment[]>([]);
  const [filters, setFilters] = useState({ sectionId: "", from: "", to: "" });

  function query() {
    const params = new URLSearchParams({ pageSize: "25" });
    if (filters.sectionId) params.set("sectionId", filters.sectionId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    return params.toString();
  }

  async function load() {
    const q = query();
    const [summaryData, attendancePage, financeData, resultsData] = await Promise.all([
      fetchJson<ReportsSummary>(`/api/reports/summary?${q}`),
      fetchJson<PaginatedResponse<AttendanceReportRow>>(`/api/reports/attendance?${q}`),
      fetchJson<FinanceReport>(`/api/reports/finance?${q}`),
      fetchJson<ResultsReport>(`/api/reports/results?${q}`)
    ]);
    setSummary(summaryData);
    setAttendance(attendancePage.items);
    setFinance(financeData);
    setResults(resultsData);
  }

  async function loadAssignments() {
    const data = await fetchJson<{ assignments: TeacherReportAssignment[] }>("/api/portals/teacher/dashboard");
    setAssignments(data.assignments.filter((assignment) => assignment.section?.id));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void Promise.all([load(), loadAssignments()]).catch((error) => showToast(error instanceof Error ? error.message : "Unable to load reports", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportAttendance() {
    const result = await fetchJson<{ filename: string; csv: string }>(`/api/reports/attendance/export?${query()}`);
    const blob = new Blob([result.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Attendance report exported");
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex gap-2">
          <SafeActionButton run={exportAttendance}>Export Attendance</SafeActionButton>
          <SafeActionButton run={() => load().then(() => showToast("Reports refreshed"))}>Refresh</SafeActionButton>
        </div>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {assignments.length ? (
          <select className={inputClass} value={filters.sectionId} onChange={(event) => setFilters({ ...filters, sectionId: event.target.value })}>
            <option value="">All assigned sections</option>
            {assignments.map((assignment) => <option key={assignment.id} value={assignment.section?.id}>{assignment.role} - {assignment.scopeLabel}</option>)}
          </select>
        ) : (
          <input className={inputClass} placeholder="Section ID filter" value={filters.sectionId} onChange={(event) => setFilters({ ...filters, sectionId: event.target.value })} />
        )}
        <input className={inputClass} type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        <input className={inputClass} type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
        <SafeActionButton run={load}>Apply Filters</SafeActionButton>
      </div>
      {summary ? (
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <Stat label="Active Students" value={summary.students.active} />
          <Stat label="Attendance %" value={summary.attendance.percentage} />
          <Stat label="Fee Collected" value={summary.finance.collected} />
          <Stat label="Result Issues" value={summary.results.failedOrAbsent} />
          <Stat label="Pending Apps" value={summary.applications.pending} />
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-3">
        <ReportCard title="Attendance Sessions">
          {attendance.map((item) => (
            <p key={item.id} className="border-b py-2 text-sm last:border-b-0">
              {new Date(item.date).toLocaleDateString()} - {item.section} - {item.subject}: <strong>{item.percentage}%</strong>
            </p>
          ))}
          {attendance.length === 0 ? <p className="text-sm text-slate-500">No attendance report rows.</p> : null}
        </ReportCard>
        <ReportCard title="Finance By Head">
          {finance?.byHead.map((item) => (
            <p key={item.feeHead} className="border-b py-2 text-sm last:border-b-0">
              {item.feeHead}: <strong>{item.amount}</strong> ({item.count} payments)
            </p>
          ))}
          {!finance?.byHead.length ? <p className="text-sm text-slate-500">No finance rows.</p> : null}
        </ReportCard>
        <ReportCard title="Recent Result Issues">
          {results?.recentFailures.map((item) => (
            <p key={item.id} className="border-b py-2 text-sm last:border-b-0">
              {item.rollNumber} - {item.subject}: <strong>{item.status}</strong>
            </p>
          ))}
          {!results?.recentFailures.length ? <p className="text-sm text-slate-500">No result issues.</p> : null}
        </ReportCard>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function ReportCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <h3 className="mb-2 text-sm font-bold uppercase text-slate-600">{title}</h3>
      {children}
    </div>
  );
}
