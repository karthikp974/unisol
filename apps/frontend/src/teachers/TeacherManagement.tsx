import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/auth-context";
import { SafeActionButton } from "../shared/SafeActionButton";
import { useToast } from "../shared/toast-context";
import { AcademicClass, Batch, Branch, Campus, PaginatedResponse, Program, Section, Subject } from "../structure/structure-types";

type TeacherRole = "HTPO" | "CTPO" | "STPO";
type AssignmentDraft = {
  campusId: string;
  programId: string;
  branchId: string;
  batchId: string;
  classId: string;
  role: TeacherRole;
  sectionId?: string;
  subjectId?: string;
};
type TeacherListItem = {
  id: string;
  identity: { fullName: string; employeeCode: string; email: string; designation?: string | null };
  summary: { assignments: number; campuses: string[]; roles: Record<string, number> };
};

const inputClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export function TeacherManagement() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [identity, setIdentity] = useState({
    fullName: "",
    employeeCode: "",
    email: "",
    phone: "",
    designation: "",
    joinedOn: "",
    password: "Teacher@123"
  });
  const [assignment, setAssignment] = useState<AssignmentDraft>({
    campusId: "",
    programId: "",
    branchId: "",
    batchId: "",
    classId: "",
    role: "HTPO"
  });
  const [assignments, setAssignments] = useState<AssignmentDraft[]>([]);

  async function fetchJson<T>(path: string) {
    const response = await authFetch(path);
    if (!response.ok) throw new Error(`Request failed: ${path}`);
    return (await response.json()) as T;
  }

  async function postJson<T>(path: string, body: unknown) {
    const response = await authFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "Teacher action failed.");
    }
    return (await response.json()) as T;
  }

  async function loadData() {
    const [teacherPage, campusPage, programPage, branchPage, batchPage, classPage, sectionPage, subjectPage] = await Promise.all([
      fetchJson<PaginatedResponse<TeacherListItem>>("/api/teachers?pageSize=25"),
      fetchJson<PaginatedResponse<Campus>>("/api/core/campuses?pageSize=100"),
      fetchJson<PaginatedResponse<Program>>("/api/core/programs?pageSize=100"),
      fetchJson<PaginatedResponse<Branch>>("/api/core/branches?pageSize=100"),
      fetchJson<PaginatedResponse<Batch>>("/api/core/batches?pageSize=100"),
      fetchJson<PaginatedResponse<AcademicClass>>("/api/core/classes?pageSize=100"),
      fetchJson<PaginatedResponse<Section>>("/api/core/sections?pageSize=100"),
      fetchJson<PaginatedResponse<Subject>>("/api/core/subjects?pageSize=100")
    ]);
    setTeachers(teacherPage.items);
    setCampuses(campusPage.items);
    setPrograms(programPage.items);
    setBranches(branchPage.items);
    setBatches(batchPage.items);
    setClasses(classPage.items);
    setSections(sectionPage.items);
    setSubjects(subjectPage.items);

    setAssignment((current) => ({
      ...current,
      campusId: current.campusId || campusPage.items[0]?.id || "",
      programId: current.programId || programPage.items[0]?.id || "",
      branchId: current.branchId || branchPage.items[0]?.id || "",
      batchId: current.batchId || batchPage.items[0]?.id || "",
      classId: current.classId || classPage.items[0]?.id || ""
    }));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData().catch((error) => showToast(error instanceof Error ? error.message : "Unable to load teachers", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPrograms = programs.filter((program) => program.campusId === assignment.campusId);
  const filteredBranches = branches.filter((branch) => branch.programId === assignment.programId);
  const filteredBatches = batches.filter((batch) => batch.branchId === assignment.branchId);
  const filteredClasses = classes.filter((item) => item.batchId === assignment.batchId);
  const filteredSections = sections.filter((section) => section.classId === assignment.classId);
  const selectedClass = classes.find((item) => item.id === assignment.classId);
  const filteredSubjects = subjects.filter(
    (subject) => subject.branchId === assignment.branchId && subject.semesterNumber === selectedClass?.semesterNumber
  );

  const canAddAssignment = useMemo(() => {
    if (!assignment.campusId || !assignment.programId || !assignment.branchId || !assignment.batchId || !assignment.classId) return false;
    if ((assignment.role === "CTPO" || assignment.role === "STPO") && !assignment.sectionId) return false;
    if (assignment.role === "STPO" && !assignment.subjectId) return false;
    return true;
  }, [assignment]);

  function addAssignment() {
    if (!canAddAssignment) {
      showToast("Complete required assignment fields", "error");
      return;
    }
    const key = JSON.stringify(assignment);
    if (assignments.some((item) => JSON.stringify(item) === key)) {
      showToast("Duplicate assignment", "error");
      return;
    }
    setAssignments([...assignments, assignment]);
    showToast("Assignment added");
  }

  async function saveTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignments.length) {
      showToast("Add at least one assignment", "error");
      return;
    }
    await postJson("/api/teachers/validate", { identity, assignments });
    await postJson("/api/teachers", { identity, assignments });
    setIdentity({ fullName: "", employeeCode: "", email: "", phone: "", designation: "", joinedOn: "", password: "Teacher@123" });
    setAssignments([]);
    setStep(1);
    await loadData();
    showToast("Teacher created");
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Teacher Management</h2>
          <p className="mt-1 text-sm text-slate-500">Create teachers with HTPO, CTPO, and STPO assignments in one review flow.</p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((item) => (
            <button key={item} type="button" onClick={() => setStep(item)} className={`rounded-full px-4 py-2 text-sm font-bold ${step === item ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              Step {item}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={(event) => void saveTeacher(event)} className="space-y-5">
        {step === 1 ? (
          <div className="grid gap-3 md:grid-cols-3">
            <input className={inputClass} placeholder="Full name" value={identity.fullName} onChange={(event) => setIdentity({ ...identity, fullName: event.target.value })} required />
            <input className={inputClass} placeholder="Employee code" value={identity.employeeCode} onChange={(event) => setIdentity({ ...identity, employeeCode: event.target.value })} required />
            <input className={inputClass} placeholder="Email" type="email" value={identity.email} onChange={(event) => setIdentity({ ...identity, email: event.target.value })} required />
            <input className={inputClass} placeholder="Phone" value={identity.phone} onChange={(event) => setIdentity({ ...identity, phone: event.target.value })} />
            <input className={inputClass} placeholder="Designation" value={identity.designation} onChange={(event) => setIdentity({ ...identity, designation: event.target.value })} />
            <input className={inputClass} type="date" value={identity.joinedOn} onChange={(event) => setIdentity({ ...identity, joinedOn: event.target.value })} />
            <input className={inputClass} placeholder="Temporary password" value={identity.password} onChange={(event) => setIdentity({ ...identity, password: event.target.value })} required />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Select value={assignment.campusId} items={campuses.map((x) => [x.id, x.code])} onChange={(campusId) => setAssignment({ ...assignment, campusId })} />
              <Select value={assignment.programId} items={filteredPrograms.map((x) => [x.id, x.code])} onChange={(programId) => setAssignment({ ...assignment, programId })} />
              <Select value={assignment.branchId} items={filteredBranches.map((x) => [x.id, x.code])} onChange={(branchId) => setAssignment({ ...assignment, branchId })} />
              <Select value={assignment.batchId} items={filteredBatches.map((x) => [x.id, `${x.startYear}-${x.endYear}`])} onChange={(batchId) => setAssignment({ ...assignment, batchId })} />
              <Select value={assignment.classId} items={filteredClasses.map((x) => [x.id, `Sem ${x.semesterNumber}`])} onChange={(classId) => setAssignment({ ...assignment, classId })} />
              <Select value={assignment.role} items={[["HTPO", "HTPO"], ["CTPO", "CTPO"], ["STPO", "STPO"]]} onChange={(role) => setAssignment({ ...assignment, role: role as TeacherRole, sectionId: undefined, subjectId: undefined })} />
              {assignment.role !== "HTPO" ? <Select value={assignment.sectionId ?? ""} items={filteredSections.map((x) => [x.id, x.name])} onChange={(sectionId) => setAssignment({ ...assignment, sectionId })} /> : null}
              {assignment.role === "STPO" ? <Select value={assignment.subjectId ?? ""} items={filteredSubjects.map((x) => [x.id, `${x.code} - ${x.name}`])} onChange={(subjectId) => setAssignment({ ...assignment, subjectId })} /> : null}
            </div>
            <SafeActionButton run={addAssignment}>Add Assignment</SafeActionButton>
            <AssignmentList assignments={assignments} remove={(index) => setAssignments(assignments.filter((_, itemIndex) => itemIndex !== index))} />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-700">Review</p>
            <p className="text-sm text-slate-600">{identity.fullName || "Teacher name"} / {identity.employeeCode || "Employee code"} / {assignments.length} assignment(s)</p>
            <AssignmentList assignments={assignments} remove={(index) => setAssignments(assignments.filter((_, itemIndex) => itemIndex !== index))} />
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Save Teacher</button>
          </div>
        ) : null}
      </form>

      <div className="mt-6 rounded-xl border">
        <div className="border-b bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Teachers</div>
        {teachers.length ? teachers.map((teacher) => (
          <div key={teacher.id} className="grid gap-2 border-b px-4 py-3 text-sm text-slate-700 md:grid-cols-4">
            <span>{teacher.identity.employeeCode}</span>
            <span>{teacher.identity.fullName}</span>
            <span>{teacher.identity.email}</span>
            <span>{teacher.summary.assignments} assignments</span>
          </div>
        )) : <p className="px-4 py-6 text-sm text-slate-500">No teachers yet.</p>}
      </div>
    </section>
  );
}

function Select({ value, items, onChange }: { value: string; items: string[][]; onChange: (value: string) => void }) {
  return (
    <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} required>
      <option value="">Select</option>
      {items.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
    </select>
  );
}

function AssignmentList({ assignments, remove }: { assignments: AssignmentDraft[]; remove: (index: number) => void }) {
  return (
    <div className="space-y-2">
      {assignments.map((item, index) => (
        <div key={`${item.role}-${index}`} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
          <span>{item.role} / class {item.classId.slice(-4)} {item.sectionId ? `/ section ${item.sectionId.slice(-4)}` : ""}</span>
          <button type="button" className="text-red-600" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
