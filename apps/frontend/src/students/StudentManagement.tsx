import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../auth/auth-context";
import { SafeActionButton } from "../shared/SafeActionButton";
import { useToast } from "../shared/toast-context";
import { AcademicClass, Batch, Branch, Campus, PaginatedResponse, Program, Section } from "../structure/structure-types";

type StudentListItem = {
  id: string;
  identity: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    rollNumber: string;
    admissionNo?: string | null;
    status: string;
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
  const [form, setForm] = useState({
    rollNumber: "",
    admissionNo: "",
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
    const [studentPage, campusPage, programPage, branchPage, batchPage, classPage, sectionPage] = await Promise.all([
      fetchJson<PaginatedResponse<StudentListItem>>("/api/students?pageSize=50"),
      fetchJson<PaginatedResponse<Campus>>("/api/core/campuses?pageSize=100"),
      fetchJson<PaginatedResponse<Program>>("/api/core/programs?pageSize=100"),
      fetchJson<PaginatedResponse<Branch>>("/api/core/branches?pageSize=100"),
      fetchJson<PaginatedResponse<Batch>>("/api/core/batches?pageSize=100"),
      fetchJson<PaginatedResponse<AcademicClass>>("/api/core/classes?pageSize=100"),
      fetchJson<PaginatedResponse<Section>>("/api/core/sections?pageSize=100")
    ]);
    setStudents(studentPage.items);
    setCampuses(campusPage.items);
    setPrograms(programPage.items);
    setBranches(branchPage.items);
    setBatches(batchPage.items);
    setClasses(classPage.items);
    setSections(sectionPage.items);
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
  }, []);

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendJson("/api/students", "POST", {
      ...form,
      email: form.email || undefined,
      admissionNo: form.admissionNo || undefined,
      phone: form.phone || undefined
    });
    setForm({ ...form, rollNumber: "", admissionNo: "", fullName: "", email: "", phone: "", password: "Student@123" });
    await loadData();
    showToast("Student created");
  }

  async function deactivateStudent(id: string) {
    await sendJson(`/api/students/${id}/deactivate`, "POST");
    await loadData();
    showToast("Student deactivated");
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Student Management</h2>
          <p className="mt-1 text-sm text-slate-500">Create students with roll number login and assign them to a valid section.</p>
        </div>
        <SafeActionButton run={() => loadData().then(() => showToast("Students refreshed"))}>Refresh</SafeActionButton>
      </div>

      <form className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-4" onSubmit={(event) => void createStudent(event)}>
        <input className={inputClass} placeholder="Roll number" value={form.rollNumber} onChange={(event) => setForm({ ...form, rollNumber: event.target.value })} required />
        <input className={inputClass} placeholder="Admission number" value={form.admissionNo} onChange={(event) => setForm({ ...form, admissionNo: event.target.value })} />
        <input className={inputClass} placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
        <input className={inputClass} placeholder="Email optional" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <input className={inputClass} placeholder="Temporary password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        <select className={inputClass} value={form.campusId} onChange={(event) => setForm({ ...form, campusId: event.target.value })} required>
          {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.code}</option>)}
        </select>
        <select className={inputClass} value={form.sectionId} onChange={(event) => setForm({ ...form, sectionId: event.target.value })} required>
          {sections.map((section) => {
            const cls = classes.find((item) => item.id === section.classId);
            const batch = batches.find((item) => item.id === cls?.batchId);
            const branch = branches.find((item) => item.id === batch?.branchId);
            const program = programs.find((item) => item.id === branch?.programId);
            return <option key={section.id} value={section.id}>{program?.code} / {branch?.code} / Sem {cls?.semesterNumber} / {section.name}</option>;
          })}
        </select>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white md:col-span-4">Add Student</button>
      </form>

      <div className="mt-5 overflow-hidden rounded-xl border">
        <div className="border-b bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Students</div>
        {students.length ? students.map((student) => (
          <div key={student.id} className="grid gap-2 border-b px-4 py-3 text-sm text-slate-700 md:grid-cols-6">
            <span>{student.identity.rollNumber}</span>
            <span>{student.identity.fullName}</span>
            <span>{student.structure.campus.code}</span>
            <span>{student.structure.branch.code}</span>
            <span>Sem {student.structure.class.semesterNumber} / {student.structure.section.name}</span>
            <button type="button" className="text-left font-semibold text-red-600" onClick={() => void deactivateStudent(student.id)}>Deactivate</button>
          </div>
        )) : <p className="px-4 py-6 text-sm text-slate-500">No students yet.</p>}
      </div>
    </section>
  );
}
