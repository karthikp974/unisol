import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useAuth } from "../auth/auth-context";
import { SafeActionButton } from "../shared/SafeActionButton";
import { SearchableSelect } from "../shared/SearchableSelect";
import { useToast } from "../shared/toast-context";
import { AcademicClass, Batch, Branch, Campus, PaginatedResponse, Program, Section } from "../structure/structure-types";

type StudentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

type StudentListItem = {
  id: string;
  identity: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    rollNumber: string;
    status: StudentStatus;
  };
  structure: {
    campus: Campus;
    program: Program;
    branch: Branch;
    batch: Batch;
    class: AcademicClass;
    section: Section;
  };
};

type AuditLogItem = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
};

const inputClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function StudentManagement() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [statusFilter, setStatusFilter] = useState<StudentStatus>("ACTIVE");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [form, setForm] = useState({
    rollNumber: "",
    fullName: "",
    email: "",
    phone: "",
    password: "Student@123",
    campusId: "",
    sectionId: ""
  });

  async function fetchJson<T>(path: string) {
    const response = await authFetch(path);
    if (!response.ok) throw new Error(`Request failed: ${path}`);
    return (await response.json()) as T;
  }

  async function sendJson<T>(path: string, method: string, body?: unknown) {
    const response = await authFetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "Student action failed.");
    }
    return (await response.json().catch(() => ({}))) as T;
  }

  async function loadData() {
    const params = new URLSearchParams({ pageSize: "50", page: String(page), status: statusFilter });
    if (search.trim()) params.set("search", search.trim());
    const [studentPage, campusPage, programPage, branchPage, batchPage, classPage, sectionPage, auditPage] = await Promise.all([
      fetchJson<PaginatedResponse<StudentListItem>>(`/api/students?${params.toString()}`),
      fetchJson<PaginatedResponse<Campus>>("/api/campuses?pageSize=100"),
      fetchJson<PaginatedResponse<Program>>("/api/core/programs?pageSize=100"),
      fetchJson<PaginatedResponse<Branch>>("/api/core/branches?pageSize=100"),
      fetchJson<PaginatedResponse<Batch>>("/api/core/batches?pageSize=100"),
      fetchJson<PaginatedResponse<AcademicClass>>("/api/core/classes?pageSize=100"),
      fetchJson<PaginatedResponse<Section>>("/api/core/sections?pageSize=100"),
      fetchJson<PaginatedResponse<AuditLogItem>>("/api/audit-logs?entity=StudentProfile&pageSize=6")
    ]);
    setStudents(studentPage.items);
    setTotal(studentPage.total);
    setCampuses(campusPage.items);
    setPrograms(programPage.items);
    setBranches(branchPage.items);
    setBatches(batchPage.items);
    setClasses(classPage.items);
    setSections(sectionPage.items);
    setAuditLogs(auditPage.items);
    setForm((current) => ({
      ...current,
      campusId: current.campusId || campusPage.items[0]?.id || "",
      sectionId: current.sectionId || sectionPage.items[0]?.id || ""
    }));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData().catch((error) => showToast(error instanceof Error ? error.message : "Unable to load students", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingStudentId) {
      await sendJson(`/api/students/${editingStudentId}`, "PATCH", {
        fullName: form.fullName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        sectionId: form.sectionId
      });
      showToast("Student updated");
    } else {
      await sendJson("/api/students", "POST", {
        ...form,
        email: form.email || undefined,
        phone: form.phone || undefined
      });
      showToast("Student created");
    }
    resetForm();
    await loadData();
  }

  async function deactivateStudent(id: string) {
    const ok = window.confirm("Deactivate this student? Their login sessions will be revoked, but old records stay safe.");
    if (!ok) return;

    await sendJson(`/api/students/${id}/deactivate`, "POST");
    await loadData();
    showToast("Student deactivated");
  }

  async function reactivateStudent(id: string) {
    await sendJson(`/api/students/${id}/reactivate`, "POST");
    await loadData();
    showToast("Student reactivated");
  }

  async function resetPassword(id: string) {
    const password = window.prompt("Enter new temporary password, minimum 8 characters");
    if (!password) return;
    await sendJson(`/api/students/${id}/reset-password`, "POST", { password });
    showToast("Student password reset");
  }

  async function bulkImportStudents() {
    const parsed = JSON.parse(bulkText) as unknown;
    const students = Array.isArray(parsed) ? parsed : (parsed as { students?: unknown }).students;
    if (!Array.isArray(students)) throw new Error("Paste a JSON array of students or { students: [...] }.");
    const result = await sendJson<{ created: number; errors: { rollNumber: string; message: string }[] }>("/api/students/bulk", "POST", { students });
    await loadData();
    showToast(`Imported ${result.created} student(s), ${result.errors.length} failed`, result.errors.length ? "error" : "success");
  }

  function editStudent(student: StudentListItem) {
    setEditingStudentId(student.id);
    setForm({
      rollNumber: student.identity.rollNumber,
      fullName: student.identity.fullName,
      email: student.identity.email ?? "",
      phone: student.identity.phone ?? "",
      password: "",
      campusId: student.structure.campus.id,
      sectionId: student.structure.section.id
    });
  }

  function resetForm() {
    setEditingStudentId(null);
    setForm((current) => ({
      ...current,
      rollNumber: "",
      fullName: "",
      email: "",
      phone: "",
      password: "Student@123"
    }));
  }

  return (
    <section className="student-management-root rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Student Management</h2>
          <p className="mt-1 text-sm text-slate-500">Create and update students with roll number login and safe deactivate handling.</p>
        </div>
        <div className="flex gap-2">
          <input className={inputClass} placeholder="Search students" value={search} onChange={(event) => setSearch(event.target.value)} />
          <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => { setPage(1); void loadData(); }}>Search</button>
          <SearchableSelect value={statusFilter} options={[["ACTIVE", "Active"], ["INACTIVE", "Inactive"], ["SUSPENDED", "Suspended"]]} onChange={(status) => { setPage(1); setStatusFilter(status as StudentStatus); }} />
          <SafeActionButton run={() => loadData().then(() => showToast("Students refreshed"))}>Refresh</SafeActionButton>
        </div>
      </div>

      <form className="student-management-panel grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-4" onSubmit={(event) => void saveStudent(event)}>
        <input className={inputClass} placeholder="Roll number" value={form.rollNumber} onChange={(event) => setForm({ ...form, rollNumber: event.target.value })} required disabled={Boolean(editingStudentId)} />
        <input className={inputClass} placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
        <input className={inputClass} placeholder="Email optional" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        {!editingStudentId ? <input className={inputClass} placeholder="Temporary password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /> : null}
        <SearchableSelect value={form.campusId} options={campuses.map((campus) => [campus.id, campus.code])} onChange={(campusId) => setForm({ ...form, campusId })} required />
        <SearchableSelect
          value={form.sectionId}
          onChange={(sectionId) => setForm({ ...form, sectionId })}
          required
          options={sections.map((section) => {
            const cls = classes.find((item) => item.id === section.classId);
            const batch = batches.find((item) => item.id === cls?.batchId);
            const branch = branches.find((item) => item.id === batch?.branchId);
            const program = programs.find((item) => item.id === branch?.programId);
            return [section.id, `${program?.code} / ${branch?.code} / Sem ${cls?.semesterNumber} / ${section.name}`];
          })}
        />
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">{editingStudentId ? "Update Student" : "Add Student"}</button>
        {editingStudentId ? <button type="button" className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={resetForm}>Cancel Edit</button> : null}
      </form>

      <div className="student-management-panel mt-5 rounded-xl border bg-slate-50 p-4">
        <h3 className="mb-2 text-sm font-bold text-slate-700">Bulk Import Students</h3>
        <textarea className={`${inputClass} min-h-24`} placeholder='Paste JSON array: [{"rollNumber":"24CS001","fullName":"Ravi","password":"Student@123","sectionId":"..."}]' value={bulkText} onChange={(event) => setBulkText(event.target.value)} />
        <SafeActionButton run={bulkImportStudents} busyLabel="Importing...">Import Students</SafeActionButton>
      </div>

      <div className="student-management-table mt-5 overflow-hidden rounded-xl border">
        <div className="border-b bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Students</div>
        {students.length ? students.map((student) => (
          <div key={student.id} className="grid gap-2 border-b px-4 py-3 text-sm text-slate-700 md:grid-cols-9">
            <span>{student.identity.rollNumber}</span>
            <span>{student.identity.fullName}</span>
            <span>{student.structure.campus.code}</span>
            <span>{student.structure.branch.code}</span>
            <span>Sem {student.structure.class.semesterNumber} / {student.structure.section.name}</span>
            <button type="button" className="text-left font-semibold text-slate-700" onClick={() => setSelectedStudent(student)}>Details</button>
            <button type="button" className="text-left font-semibold text-blue-700" onClick={() => editStudent(student)}>Edit</button>
            <button type="button" className="text-left font-semibold text-violet-700" onClick={() => void resetPassword(student.id)}>Password</button>
            {student.identity.status === "ACTIVE" ? (
              <button type="button" className="text-left font-semibold text-red-600" onClick={() => void deactivateStudent(student.id)}>Deactivate</button>
            ) : (
              <button type="button" className="text-left font-semibold text-green-700" onClick={() => void reactivateStudent(student.id)}>Reactivate</button>
            )}
          </div>
        )) : <p className="px-4 py-6 text-sm text-slate-500">No students yet.</p>}
      </div>

      <Pager page={page} pageSize={50} total={total} onPage={setPage} />

      <div className="student-management-table mt-5 rounded-xl border">
        <div className="border-b bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Recent Student Audit</div>
        {auditLogs.length ? auditLogs.map((log) => (
          <div key={log.id} className="grid gap-2 border-b px-4 py-3 text-sm text-slate-600 md:grid-cols-3">
            <span>{log.action}</span>
            <span>{log.entityId ?? "-"}</span>
            <span>{new Date(log.createdAt).toLocaleString()}</span>
          </div>
        )) : <p className="px-4 py-6 text-sm text-slate-500">No audit records yet.</p>}
      </div>

      {selectedStudent ? (
        <DetailModal title="Student Details" onClose={() => setSelectedStudent(null)}>
          <p><strong>Name:</strong> {selectedStudent.identity.fullName}</p>
          <p><strong>Roll:</strong> {selectedStudent.identity.rollNumber}</p>
          <p><strong>Email:</strong> {selectedStudent.identity.email ?? "-"}</p>
          <p><strong>Phone:</strong> {selectedStudent.identity.phone ?? "-"}</p>
          <p><strong>Structure:</strong> {selectedStudent.structure.campus.code} / {selectedStudent.structure.program.code} / {selectedStudent.structure.branch.code} / Sem {selectedStudent.structure.class.semesterNumber} / {selectedStudent.structure.section.name}</p>
        </DetailModal>
      ) : null}
    </section>
  );
}

function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="student-management-panel mt-4 flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm">
      <span>Page {page} of {maxPage} / {total} records</span>
      <div className="flex gap-2">
        <button className="rounded-lg bg-slate-100 px-3 py-2 font-semibold disabled:opacity-50" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button className="rounded-lg bg-slate-100 px-3 py-2 font-semibold disabled:opacity-50" disabled={page >= maxPage} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

function DetailModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold" onClick={onClose}>Close</button>
        </div>
        <div className="space-y-2 text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}
