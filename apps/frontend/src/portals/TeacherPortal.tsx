import { ReactNode, useEffect, useState } from "react";
import { TeacherAnnouncementsPanel } from "../announcements/AnnouncementsPanels";
import { TeacherApplicationsPanel } from "../applications/ApplicationsPanels";
import { TeacherAttendancePanel } from "../attendance/AttendancePanels";
import { useAuth } from "../auth/auth-context";
import { TeacherFinancePanel } from "../finance/FinancePanels";
import { TeacherReportsPanel } from "../reports/ReportsPanels";
import { TeacherResultsPanel } from "../results/ResultsPanels";
import { PageHeader } from "../shared/PageHeader";
import { PortalCard } from "../shared/PortalCard";
import { SafeActionButton } from "../shared/SafeActionButton";
import { useToast } from "../shared/toast-context";
import { PaginatedResponse } from "../structure/structure-types";
import { TeacherTeamsPanel } from "../teams/TeamsPanels";
import { TeacherTimetablePanel } from "../timetable/TimetablePanels";

type TeacherAssignment = {
  id: string;
  role: "STPO" | "CTPO" | "HTPO";
  scopeLabel: string;
  campus?: { code: string; name: string } | null;
  department?: { code: string; name: string } | null;
  branch?: { code: string; name: string } | null;
  batch?: { startYear: number; endYear: number } | null;
  class?: { label: string; semesterNumber: number } | null;
  section?: { name: string } | null;
  subject?: { code: string; name: string } | null;
  actions: string[];
};
type TeacherDashboard = {
  teacher: { id: string; fullName: string; employeeCode: string; email: string };
  assignments: TeacherAssignment[];
  counts: { students: number; pendingApplications: number; teams: number; resultIssues: number; todayClasses: number; announcements: number };
  todayTimetable: { id: string; time: string; room?: string | null; structure: { branch: string; semester: number; section: string; subject: string } }[];
  announcements: { id: string; title: string; audience: string; publishedAt?: string | null }[];
  quickActions: string[];
};
type TeacherStudent = {
  id: string;
  rollNumber: string;
  fullName: string;
  email?: string | null;
  section: string;
  class: string;
  semester: number;
  branch: string;
  campus: string;
  attendance: { total: number; present: number; percentage: number };
  fees: { assigned: number; due: number };
  results: { entries: number; issues: number };
};

const moduleCards = [
  { key: "dashboard", title: "Dashboard", description: "Today overview, roles, scope, and pending actions." },
  { key: "students", title: "My Students", description: "Search students inside your assigned scope." },
  { key: "attendance", title: "Attendance", description: "Mark and review attendance for assigned sections." },
  { key: "timetable", title: "Timetable", description: "Daily and weekly teaching schedule." },
  { key: "results", title: "Results", description: "Scoped result entry and review." },
  { key: "teams", title: "Teams", description: "Create and manage section teams." },
  { key: "applications", title: "Applications", description: "Review student applications inside scope." },
  { key: "announcements", title: "Announcements", description: "Publish and view scoped notices." },
  { key: "finance", title: "Finance", description: "Fee marking where allowed by role." },
  { key: "reports", title: "Reports", description: "Teacher-scoped summaries and exports." }
] as const;

type ModuleKey = typeof moduleCards[number]["key"];

export function TeacherPortal() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey>("dashboard");

  async function fetchJson<T>(path: string) {
    const response = await authFetch(path);
    if (!response.ok) throw new Error(`Request failed: ${path}`);
    return (await response.json()) as T;
  }

  async function loadDashboard() {
    setDashboard(await fetchJson<TeacherDashboard>("/api/portals/teacher/dashboard"));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard().catch((error) => showToast(error instanceof Error ? error.message : "Unable to load teacher dashboard", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allowedModules = moduleCards.filter((module) => module.key === "dashboard" || module.key === "students" || dashboard?.quickActions.includes(module.key));

  return (
    <>
      <PageHeader
        eyebrow="Teacher portal"
        title={dashboard ? `Welcome, ${dashboard.teacher.fullName}` : "Teacher workspace"}
        description="Your modules and records are filtered by your active STPO, CTPO, and HTPO assignments."
      />
      <section className="mt-6 grid gap-4 lg:grid-cols-5">
        <TeacherStat label="Students" value={dashboard?.counts.students ?? 0} />
        <TeacherStat label="Today Classes" value={dashboard?.counts.todayClasses ?? 0} />
        <TeacherStat label="Applications" value={dashboard?.counts.pendingApplications ?? 0} />
        <TeacherStat label="Teams" value={dashboard?.counts.teams ?? 0} />
        <TeacherStat label="Result Issues" value={dashboard?.counts.resultIssues ?? 0} />
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {allowedModules.map((module) => (
          <button key={module.key} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-blue-300 ${activeModule === module.key ? "border-blue-500 ring-4 ring-blue-100" : ""}`} type="button" onClick={() => setActiveModule(module.key)}>
            <p className="text-sm font-extrabold text-slate-950">{module.title}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{module.description}</p>
          </button>
        ))}
      </section>

      <div className="mt-6">
        <TeacherModule module={activeModule} dashboard={dashboard} reloadDashboard={loadDashboard} />
      </div>
    </>
  );
}

function TeacherModule({ dashboard, module, reloadDashboard }: { dashboard: TeacherDashboard | null; module: ModuleKey; reloadDashboard: () => Promise<void> }) {
  if (module === "dashboard") return <TeacherDashboardHome dashboard={dashboard} reloadDashboard={reloadDashboard} />;
  if (module === "students") return <TeacherStudentsPanel assignments={dashboard?.assignments ?? []} />;
  if (module === "attendance") return <TeacherAttendancePanel />;
  if (module === "timetable") return <TeacherTimetablePanel />;
  if (module === "results") return <TeacherResultsPanel />;
  if (module === "teams") return <TeacherTeamsPanel />;
  if (module === "applications") return <TeacherApplicationsPanel />;
  if (module === "announcements") return <TeacherAnnouncementsPanel />;
  if (module === "finance") return <TeacherFinancePanel />;
  return <TeacherReportsPanel />;
}

function TeacherDashboardHome({ dashboard, reloadDashboard }: { dashboard: TeacherDashboard | null; reloadDashboard: () => Promise<void> }) {
  if (!dashboard) return <EmptyCard>Loading teacher workspace...</EmptyCard>;
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 lg:grid-cols-3">
        {dashboard.assignments.map((assignment) => (
          <PortalCard key={assignment.id} title={`${assignment.role} Assignment`} description={roleDescription(assignment.role)}>
            <div className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">{assignment.scopeLabel}</div>
            <ScopeLines assignment={assignment} />
          </PortalCard>
        ))}
        {!dashboard.assignments.length ? <EmptyCard>No active teacher assignments yet.</EmptyCard> : null}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <TeacherPanel title="Today Timetable" action={<SafeActionButton run={reloadDashboard}>Refresh</SafeActionButton>}>
          {dashboard.todayTimetable.map((slot) => (
            <div key={slot.id} className="border-b py-3 text-sm last:border-b-0">
              <p className="font-extrabold text-slate-950">{slot.time} / {slot.structure.section} / Sem {slot.structure.semester}</p>
              <p className="text-slate-500">{slot.structure.subject} / {slot.structure.branch}{slot.room ? ` / Room ${slot.room}` : ""}</p>
            </div>
          ))}
          {!dashboard.todayTimetable.length ? <p className="text-sm text-slate-500">No classes scheduled today.</p> : null}
        </TeacherPanel>
        <TeacherPanel title="Recent Announcements">
          {dashboard.announcements.map((announcement) => (
            <div key={announcement.id} className="border-b py-3 text-sm last:border-b-0">
              <p className="font-bold text-slate-950">{announcement.title}</p>
              <p className="text-xs text-slate-500">{announcement.audience}{announcement.publishedAt ? ` / ${new Date(announcement.publishedAt).toLocaleDateString()}` : ""}</p>
            </div>
          ))}
          {!dashboard.announcements.length ? <p className="text-sm text-slate-500">No announcements visible in your scope.</p> : null}
        </TeacherPanel>
      </section>
    </div>
  );
}

function TeacherStudentsPanel({ assignments }: { assignments: TeacherAssignment[] }) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<TeacherStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [assignmentId, setAssignmentId] = useState("");

  async function load(nextPage = page) {
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "10" });
    if (search.trim()) params.set("search", search.trim());
    if (assignmentId) params.set("assignmentId", assignmentId);
    const response = await authFetch(`/api/portals/teacher/students?${params.toString()}`);
    if (!response.ok) throw new Error("Unable to load scoped students.");
    const data = (await response.json()) as PaginatedResponse<TeacherStudent>;
    setItems(data.items);
    setTotal(data.total);
    setPage(data.page);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1).catch((error) => showToast(error instanceof Error ? error.message : "Unable to load students", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  return (
    <TeacherPanel title="My Students" action={<SafeActionButton run={() => load(1)}>Search</SafeActionButton>}>
      <div className="mb-4 grid gap-3 md:grid-cols-[220px_1fr]">
        <select className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={assignmentId} onChange={(event) => { setAssignmentId(event.target.value); setPage(1); }}>
          <option value="">All assigned scopes</option>
          {assignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.role} / {assignment.scopeLabel}</option>)}
        </select>
        <input className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Search roll number, name, or email" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="overflow-hidden rounded-xl border">
        {items.map((student) => (
          <div key={student.id} className="grid gap-3 border-b px-4 py-3 text-sm md:grid-cols-[1fr_1fr_1fr_1fr]">
            <div><p className="font-extrabold text-slate-950">{student.rollNumber}</p><p>{student.fullName}</p></div>
            <div><p>{student.class} / {student.section}</p><p className="text-xs text-slate-500">{student.branch} / {student.campus}</p></div>
            <div><p>Attendance {student.attendance.percentage}%</p><p className="text-xs text-slate-500">{student.attendance.present}/{student.attendance.total} present</p></div>
            <div><p>Fees ₹{student.fees.due}</p><p className="text-xs text-slate-500">Result issues {student.results.issues}</p></div>
          </div>
        ))}
        {!items.length ? <p className="px-4 py-6 text-sm text-slate-500">No students found in your assigned scope.</p> : null}
      </div>
      <Pager page={page} pageSize={10} total={total} onPage={(nextPage) => void load(nextPage)} />
    </TeacherPanel>
  );
}

function TeacherStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function TeacherPanel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyCard({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl border bg-white p-5 text-sm text-slate-500 shadow-sm">{children}</section>;
}

function ScopeLines({ assignment }: { assignment: TeacherAssignment }) {
  const rows = [
    ["Campus", assignment.campus ? `${assignment.campus.code} - ${assignment.campus.name}` : null],
    ["Department", assignment.department ? `${assignment.department.code} - ${assignment.department.name}` : null],
    ["Branch", assignment.branch ? `${assignment.branch.code} - ${assignment.branch.name}` : null],
    ["Batch", assignment.batch ? `${assignment.batch.startYear}-${assignment.batch.endYear}` : null],
    ["Class", assignment.class ? `${assignment.class.label} / Sem ${assignment.class.semesterNumber}` : null],
    ["Section", assignment.section?.name ?? null],
    ["Subject", assignment.subject ? `${assignment.subject.code} - ${assignment.subject.name}` : null]
  ].filter((row): row is [string, string] => Boolean(row[1]));
  return (
    <div className="grid gap-2 text-sm">
      {rows.map(([label, value]) => (
        <p key={label} className="flex justify-between gap-3 border-b pb-1 last:border-b-0">
          <span className="font-bold text-slate-500">{label}</span>
          <span className="text-right font-semibold text-slate-800">{value}</span>
        </p>
      ))}
    </div>
  );
}

function Pager({ onPage, page, pageSize, total }: { onPage: (page: number) => void; page: number; pageSize: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm">
      <button className="rounded-lg bg-slate-100 px-3 py-2 font-semibold disabled:opacity-50" disabled={page <= 1} onClick={() => onPage(page - 1)} type="button">Previous</button>
      <span className="font-semibold text-slate-600">Page {page} of {pages}</span>
      <button className="rounded-lg bg-slate-100 px-3 py-2 font-semibold disabled:opacity-50" disabled={page >= pages} onClick={() => onPage(page + 1)} type="button">Next</button>
    </div>
  );
}

function roleDescription(role: TeacherAssignment["role"]) {
  if (role === "STPO") return "Subject teacher access for assigned subject, section, attendance, results, and student visibility.";
  if (role === "CTPO") return "Class teacher access for section operations, attendance, teams, applications, and fees where allowed.";
  return "Head teacher access across the assigned branch or academic scope.";
}
