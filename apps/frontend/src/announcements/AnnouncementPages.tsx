import { ArrowLeft, Bell, Trash2 } from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { AdminWorkflowMenuButton } from "../shared/OptionPage";
import { FormSelect } from "../shared/FormSelect";
import { useToast } from "../shared/toast-context";
import { WfBtn } from "../shared/WfBtn";

type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

type Campus = { id: string; code: string; name: string };
type Program = { id: string; code: string; name: string; campusId: string };
type Branch = { id: string; code: string; name: string; programId: string };
type Batch = { id: string; batchCode: string; startYear: number; endYear: number };
type AcademicClass = { id: string; label: string; semesterNumber: number };
type Section = { id: string; name: string; code: string };

type Audience = "STUDENTS" | "TEACHERS" | "BOTH";
type Priority = "NORMAL" | "IMPORTANT" | "URGENT";
type TeacherTarget = "INSTITUTION" | "CAMPUS" | "DEPARTMENT" | "BRANCH";

type AnnouncementListItem = {
  id: string;
  title: string;
  body: string;
  audience: string;
  status: string;
  priority: string;
  pinned?: boolean;
  scope: {
    campusId?: string | null;
    programId?: string | null;
    branchId?: string | null;
    batchId?: string | null;
    classId?: string | null;
    sectionId?: string | null;
  };
  teacherScope: string;
  teacherCampusId?: string | null;
  teacherProgramId?: string | null;
  teacherBranchId?: string | null;
  createdBy: string;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  attachments: { id: string; originalName: string; mimeType: string; sizeBytes: number }[];
  readAt?: string | null;
};

type AnnouncementDetail = AnnouncementListItem & { body: string };

async function responseError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
  return new Error(message || "Request failed.");
}

function GlassButton({ children, onClick, tone = "default" }: { children: ReactNode; onClick: () => void; tone?: "default" | "danger" }) {
  return (
    <WfBtn variant={tone === "danger" ? "danger" : "secondary"} onClick={onClick}>
      {children}
    </WfBtn>
  );
}

function AnnouncementShell({ children, title, variant = "subpage" }: { children: ReactNode; title: string; variant?: "main" | "subpage" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initials = user?.fullName
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";

  return (
    <main className="db-workflow min-h-screen">
      <header className="db-workflow-header">
        <div className="db-header-left">
          {variant === "main" ? (
            <AdminWorkflowMenuButton />
          ) : (
            <button className="db-icon-button" type="button" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1>{title}</h1>
        </div>
        <div className="db-header-actions">
          {variant === "main" ? (
            <button className="db-icon-button" type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
          ) : null}
          <div className="db-avatar">{initials}</div>
        </div>
      </header>
      <section className="db-workflow-body">{children}</section>
    </main>
  );
}

function WorkflowSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="db-section">
      <h2>{title}</h2>
      <div className="db-module-grid">{children}</div>
    </section>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="db-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function formatAudience(a: string) {
  if (a === "STUDENTS") return "Students";
  if (a === "TEACHERS") return "Teachers";
  if (a === "BOTH") return "Students & teachers";
  if (a === "ALL") return "Everyone";
  return a;
}

function formatPriority(p: string) {
  if (p === "IMPORTANT") return "Important";
  if (p === "URGENT") return "Urgent";
  return "Normal";
}

function scopeSummary(row: AnnouncementListItem) {
  const s = row.scope;
  const parts: string[] = [];
  if (s.sectionId) parts.push("Section");
  else if (s.classId) parts.push("Class");
  else if (s.batchId) parts.push("Batch");
  else if (s.branchId) parts.push("Branch");
  else if (s.programId) parts.push("Department");
  else if (s.campusId) parts.push("Campus");
  else parts.push("Institution");
  if (row.audience === "TEACHERS" || row.audience === "BOTH") {
    const ts = row.teacherScope;
    if (ts === "INSTITUTION") parts.push("Teachers: all");
    else if (ts === "CAMPUS") parts.push("Teachers: campus");
    else if (ts === "DEPARTMENT") parts.push("Teachers: department");
    else if (ts === "BRANCH") parts.push("Teachers: branch");
  }
  return parts.join(" · ");
}

function ConfirmArchiveDialog({
  isOpen,
  itemName,
  message,
  onCancel,
  onConfirm,
  title
}: {
  isOpen: boolean;
  itemName?: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  title: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="erp-confirm-overlay" role="presentation">
      <section className="erp-confirm-card" aria-modal="true" role="dialog" aria-labelledby="ann-archive-title">
        <div className="erp-confirm-icon">
          <Trash2 size={24} />
        </div>
        <h2 id="ann-archive-title">{title}</h2>
        <p>{message}</p>
        {itemName ? <strong>{itemName}</strong> : null}
        <div className="erp-confirm-actions">
          <button className="erp-confirm-cancel" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="erp-confirm-danger" type="button" onClick={() => void onConfirm()}>
            <Trash2 size={16} /> Archive only
          </button>
        </div>
      </section>
    </div>
  );
}

function useAnnouncementsApi() {
  const { authFetch } = useAuth();

  const fetchJson = useCallback(
    async <T,>(path: string) => {
      const response = await authFetch(path);
      if (!response.ok) throw await responseError(response);
      return (await response.json()) as T;
    },
    [authFetch]
  );

  const sendJson = useCallback(
    async <T,>(path: string, body: unknown, method: "POST" | "PATCH" | "DELETE" = "POST") => {
      const response = await authFetch(path, {
        method,
        headers: method === "DELETE" ? undefined : { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(body)
      });
      if (!response.ok) throw await responseError(response);
      return (await response.json().catch(() => ({}))) as T;
    },
    [authFetch]
  );

  const uploadFile = useCallback(
    async (announcementId: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      const response = await authFetch(`/api/announcements/${announcementId}/attachments`, { method: "POST", body: form });
      if (!response.ok) throw await responseError(response);
      return (await response.json()) as { attachment: { id: string; originalName: string } };
    },
    [authFetch]
  );

  return { fetchJson, sendJson, uploadFile };
}

function useStructureLists() {
  const { fetchJson } = useAnnouncementsApi();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const loadCampuses = useCallback(async () => {
    const page = await fetchJson<Page<Campus>>("/api/campuses?pageSize=200");
    setCampuses(page.items);
  }, [fetchJson]);

  const loadPrograms = useCallback(
    async (campusId: string) => {
      const page = await fetchJson<Page<Program>>(`/api/core/programs?pageSize=200&campusId=${encodeURIComponent(campusId)}`);
      setPrograms(page.items);
    },
    [fetchJson]
  );

  const loadBranches = useCallback(
    async (programId: string, campusId: string) => {
      const qs = new URLSearchParams({ pageSize: "200", programId, campusId });
      const page = await fetchJson<Page<Branch>>(`/api/core/branches?${qs.toString()}`);
      setBranches(page.items);
    },
    [fetchJson]
  );

  const loadBatches = useCallback(
    async (branchId: string, programId: string, campusId: string) => {
      const qs = new URLSearchParams({ pageSize: "200", branchId, programId, campusId });
      const page = await fetchJson<Page<Batch>>(`/api/core/batches?${qs.toString()}`);
      setBatches(page.items);
    },
    [fetchJson]
  );

  const loadClasses = useCallback(
    async (batchId: string) => {
      const page = await fetchJson<Page<AcademicClass>>(`/api/core/classes?pageSize=200&batchId=${encodeURIComponent(batchId)}`);
      setClasses(page.items);
    },
    [fetchJson]
  );

  const loadSections = useCallback(
    async (classId: string) => {
      const page = await fetchJson<Page<Section>>(`/api/core/sections?pageSize=200&classId=${encodeURIComponent(classId)}`);
      setSections(page.items);
    },
    [fetchJson]
  );

  return {
    campuses,
    programs,
    branches,
    batches,
    classes,
    sections,
    setPrograms,
    setBranches,
    setBatches,
    setClasses,
    setSections,
    loadCampuses,
    loadPrograms,
    loadBranches,
    loadBatches,
    loadClasses,
    loadSections
  };
}

export function AnnouncementsHubPage() {
  const navigate = useNavigate();
  return (
    <AnnouncementShell title="Announcements" variant="main">
      <WorkflowSection title="Publish & manage">
        <GlassButton onClick={() => navigate("/announcements/create")}>Create announcement</GlassButton>
        <GlassButton onClick={() => navigate("/announcements/modify")}>Modify announcement</GlassButton>
        <GlassButton tone="danger" onClick={() => navigate("/announcements/archive")}>
          Archive announcement
        </GlassButton>
      </WorkflowSection>
      <WorkflowSection title="History">
        <GlassButton onClick={() => navigate("/announcements/history")}>Announcement history</GlassButton>
      </WorkflowSection>
    </AnnouncementShell>
  );
}

type StudentScope = {
  campusId: string;
  programId: string;
  branchId: string;
  batchId: string;
  classId: string;
  sectionId: string;
};

function deepestStudentPayload(s: StudentScope): Record<string, string> {
  if (s.sectionId) return { sectionId: s.sectionId };
  if (s.classId) return { classId: s.classId };
  if (s.batchId) return { batchId: s.batchId };
  if (s.branchId) return { branchId: s.branchId };
  if (s.programId) return { programId: s.programId };
  if (s.campusId) return { campusId: s.campusId };
  return {};
}

function AnnouncementFormFields({
  audience,
  setAudience,
  studentScope,
  setStudentScope,
  teacherTarget,
  setTeacherTarget,
  teacherCampusId,
  setTeacherCampusId,
  teacherProgramId,
  setTeacherProgramId,
  teacherBranchId,
  setTeacherBranchId,
  structure
}: {
  audience: Audience;
  setAudience: (a: Audience) => void;
  studentScope: StudentScope;
  setStudentScope: (next: StudentScope | ((prev: StudentScope) => StudentScope)) => void;
  teacherTarget: TeacherTarget;
  setTeacherTarget: (t: TeacherTarget) => void;
  teacherCampusId: string;
  setTeacherCampusId: (v: string) => void;
  teacherProgramId: string;
  setTeacherProgramId: (v: string) => void;
  teacherBranchId: string;
  setTeacherBranchId: (v: string) => void;
  structure: ReturnType<typeof useStructureLists>;
}) {
  const {
    campuses,
    programs,
    branches,
    batches,
    classes,
    sections,
    loadPrograms,
    loadBranches,
    loadBatches,
    loadClasses,
    loadSections,
    setPrograms,
    setBranches,
    setBatches,
    setClasses,
    setSections
  } = structure;

  const showStudent = audience === "STUDENTS" || audience === "BOTH";
  const showTeacher = audience === "TEACHERS" || audience === "BOTH";

  const campusOptions = useMemo(() => campuses.map((c) => [c.id, `${c.code} — ${c.name}`] as [string, string]), [campuses]);
  const programOptions = useMemo(() => programs.map((p) => [p.id, `${p.code} — ${p.name}`] as [string, string]), [programs]);
  const branchOptions = useMemo(() => branches.map((b) => [b.id, `${b.code} — ${b.name}`] as [string, string]), [branches]);
  const batchOptions = useMemo(() => batches.map((b) => [b.id, `${b.batchCode} (${b.startYear}–${b.endYear})`] as [string, string]), [batches]);
  const classOptions = useMemo(() => classes.map((c) => [c.id, `Sem ${c.semesterNumber} — ${c.label}`] as [string, string]), [classes]);
  const sectionOptions = useMemo(() => sections.map((s) => [s.id, `${s.name} (${s.code})`] as [string, string]), [sections]);

  const campusSelectOptions = useMemo(() => [["", "Entire institution"], ...campusOptions] as [string, string][], [campusOptions]);
  const programSelectOptions = useMemo(() => [["", "All departments on campus"], ...programOptions] as [string, string][], [programOptions]);
  const branchSelectOptions = useMemo(() => [["", "All branches in department"], ...branchOptions] as [string, string][], [branchOptions]);
  const batchSelectOptions = useMemo(() => [["", "All batches in branch"], ...batchOptions] as [string, string][], [batchOptions]);
  const classSelectOptions = useMemo(() => [["", "All classes in batch"], ...classOptions] as [string, string][], [classOptions]);
  const sectionSelectOptions = useMemo(() => [["", "All sections in class"], ...sectionOptions] as [string, string][], [sectionOptions]);
  const teacherCampusPickOptions = useMemo(() => [["", "Select campus"], ...campusOptions] as [string, string][], [campusOptions]);
  const teacherProgramPickOptions = useMemo(() => [["", "Select department"], ...programOptions] as [string, string][], [programOptions]);
  const teacherBranchPickOptions = useMemo(() => [["", "Select branch"], ...branchOptions] as [string, string][], [branchOptions]);

  return (
    <div className="db-card db-form grid gap-4">
      <Field label="Target audience">
        <FormSelect
          value={audience}
          options={[
            ["STUDENTS", "Students"],
            ["TEACHERS", "Teachers"],
            ["BOTH", "Students & teachers"]
          ]}
          onChange={(v) => {
            const next = v as Audience;
            setAudience(next);
            if (next === "TEACHERS") {
              setTeacherTarget("INSTITUTION");
              setStudentScope({ campusId: "", programId: "", branchId: "", batchId: "", classId: "", sectionId: "" });
            }
          }}
          required
        />
      </Field>

      {showStudent ? (
        <div className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Student reach (optional levels — stop at any depth)</p>
          <Field label="Campus">
            <FormSelect
              value={studentScope.campusId}
              options={campusSelectOptions}
              onChange={async (campusId) => {
                setStudentScope({ campusId, programId: "", branchId: "", batchId: "", classId: "", sectionId: "" });
                setPrograms([]);
                setBranches([]);
                setBatches([]);
                setClasses([]);
                setSections([]);
                if (campusId) await loadPrograms(campusId);
              }}
            />
          </Field>
          <Field label="Department (program)">
            <FormSelect
              value={studentScope.programId}
              options={programSelectOptions}
              disabled={!studentScope.campusId}
              onChange={async (programId) => {
                setStudentScope((prev) => ({ ...prev, programId, branchId: "", batchId: "", classId: "", sectionId: "" }));
                setBranches([]);
                setBatches([]);
                setClasses([]);
                setSections([]);
                if (programId && studentScope.campusId) await loadBranches(programId, studentScope.campusId);
              }}
            />
          </Field>
          <Field label="Branch">
            <FormSelect
              value={studentScope.branchId}
              options={branchSelectOptions}
              disabled={!studentScope.programId}
              onChange={async (branchId) => {
                setStudentScope((prev) => ({ ...prev, branchId, batchId: "", classId: "", sectionId: "" }));
                setBatches([]);
                setClasses([]);
                setSections([]);
                if (branchId && studentScope.programId && studentScope.campusId) {
                  await loadBatches(branchId, studentScope.programId, studentScope.campusId);
                }
              }}
            />
          </Field>
          <Field label="Batch">
            <FormSelect
              value={studentScope.batchId}
              options={batchSelectOptions}
              disabled={!studentScope.branchId}
              onChange={async (batchId) => {
                setStudentScope((prev) => ({ ...prev, batchId, classId: "", sectionId: "" }));
                setClasses([]);
                setSections([]);
                if (batchId) await loadClasses(batchId);
              }}
            />
          </Field>
          <Field label="Class">
            <FormSelect
              value={studentScope.classId}
              options={classSelectOptions}
              disabled={!studentScope.batchId}
              onChange={async (classId) => {
                setStudentScope((prev) => ({ ...prev, classId, sectionId: "" }));
                setSections([]);
                if (classId) await loadSections(classId);
              }}
            />
          </Field>
          <Field label="Section">
            <FormSelect
              value={studentScope.sectionId}
              options={sectionSelectOptions}
              disabled={!studentScope.classId}
              onChange={(sectionId) => setStudentScope((prev) => ({ ...prev, sectionId }))}
            />
          </Field>
        </div>
      ) : null}

      {showTeacher ? (
        <div className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Teacher reach</p>
          <Field label="Teacher scope">
            <FormSelect
              value={teacherTarget}
              options={[
                ["INSTITUTION", "All teachers"],
                ["CAMPUS", "Teachers in a campus"],
                ["DEPARTMENT", "Teachers in a department"],
                ["BRANCH", "Teachers in a branch"]
              ]}
              onChange={(v) => {
                const t = v as TeacherTarget;
                setTeacherTarget(t);
                setTeacherCampusId("");
                setTeacherProgramId("");
                setTeacherBranchId("");
              }}
              required
            />
          </Field>
          {teacherTarget === "CAMPUS" ? (
            <Field label="Campus">
              <FormSelect value={teacherCampusId} options={teacherCampusPickOptions} onChange={(id) => setTeacherCampusId(id)} required />
            </Field>
          ) : null}
          {teacherTarget === "DEPARTMENT" ? (
            <>
              <Field label="Campus (filter)">
                <FormSelect
                  value={studentScope.campusId}
                  options={teacherCampusPickOptions}
                  onChange={async (campusId) => {
                    setStudentScope((prev) => ({ ...prev, campusId, programId: "", branchId: "", batchId: "", classId: "", sectionId: "" }));
                    setPrograms([]);
                    setTeacherProgramId("");
                    if (campusId) await loadPrograms(campusId);
                  }}
                  required
                />
              </Field>
              <Field label="Department">
                <FormSelect
                  value={teacherProgramId}
                  options={teacherProgramPickOptions}
                  disabled={!studentScope.campusId}
                  onChange={(id) => setTeacherProgramId(id)}
                  required
                />
              </Field>
            </>
          ) : null}
          {teacherTarget === "BRANCH" ? (
            <>
              <Field label="Campus">
                <FormSelect
                  value={studentScope.campusId}
                  options={teacherCampusPickOptions}
                  onChange={async (campusId) => {
                    setStudentScope((prev) => ({ ...prev, campusId, programId: "", branchId: "", batchId: "", classId: "", sectionId: "" }));
                    setPrograms([]);
                    setBranches([]);
                    setTeacherBranchId("");
                    if (campusId) await loadPrograms(campusId);
                  }}
                  required
                />
              </Field>
              <Field label="Department">
                <FormSelect
                  value={studentScope.programId}
                  options={teacherProgramPickOptions}
                  disabled={!studentScope.campusId}
                  onChange={async (programId) => {
                    setStudentScope((prev) => ({ ...prev, programId, branchId: "", batchId: "", classId: "", sectionId: "" }));
                    setBranches([]);
                    setTeacherBranchId("");
                    if (programId && studentScope.campusId) await loadBranches(programId, studentScope.campusId);
                  }}
                  required
                />
              </Field>
              <Field label="Branch">
                <FormSelect
                  value={teacherBranchId}
                  options={teacherBranchPickOptions}
                  disabled={!studentScope.programId}
                  onChange={(id) => setTeacherBranchId(id)}
                  required
                />
              </Field>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AnnouncementCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { sendJson, uploadFile } = useAnnouncementsApi();
  const structure = useStructureLists();
  const [isSaving, setIsSaving] = useState(false);
  const [audience, setAudience] = useState<Audience>("STUDENTS");
  const [studentScope, setStudentScope] = useState<StudentScope>({
    campusId: "",
    programId: "",
    branchId: "",
    batchId: "",
    classId: "",
    sectionId: ""
  });
  const [teacherTarget, setTeacherTarget] = useState<TeacherTarget>("INSTITUTION");
  const [teacherCampusId, setTeacherCampusId] = useState("");
  const [teacherProgramId, setTeacherProgramId] = useState("");
  const [teacherBranchId, setTeacherBranchId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    void structure.loadCampuses();
  }, [structure.loadCampuses]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const studentPayload = audience === "TEACHERS" ? {} : deepestStudentPayload(studentScope);
      let teacherScope = "NONE";
      let tc: string | undefined;
      let tp: string | undefined;
      let tb: string | undefined;
      if (audience === "TEACHERS" || audience === "BOTH") {
        teacherScope = teacherTarget;
        if (teacherTarget === "CAMPUS") tc = teacherCampusId;
        if (teacherTarget === "DEPARTMENT") tp = teacherProgramId;
        if (teacherTarget === "BRANCH") tb = teacherBranchId;
      }
      const payload = {
        title: title.trim(),
        body: body.trim(),
        audience,
        status: "PUBLISHED",
        priority,
        pinned,
        expiresAt: expiresAt ? `${expiresAt}T23:59:59.000Z` : undefined,
        ...studentPayload,
        teacherScope,
        teacherCampusId: tc,
        teacherProgramId: tp,
        teacherBranchId: tb
      };
      const created = await sendJson<{ announcement: { id: string } }>("/api/announcements", payload);
      if (file) {
        try {
          await uploadFile(created.announcement.id, file);
          showToast("Attachment uploaded");
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Attachment failed", "error");
        }
      }
      showToast("Announcement created");
      navigate("/announcements/history");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Create failed", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AnnouncementShell title="Create announcement">
      <form className="mx-auto flex max-w-3xl flex-col gap-6" onSubmit={(e) => void submit(e)}>
        <AnnouncementFormFields
          audience={audience}
          setAudience={setAudience}
          studentScope={studentScope}
          setStudentScope={setStudentScope}
          teacherTarget={teacherTarget}
          setTeacherTarget={setTeacherTarget}
          teacherCampusId={teacherCampusId}
          setTeacherCampusId={setTeacherCampusId}
          teacherProgramId={teacherProgramId}
          setTeacherProgramId={setTeacherProgramId}
          teacherBranchId={teacherBranchId}
          setTeacherBranchId={setTeacherBranchId}
          structure={structure}
        />

        <div className="db-card db-form grid gap-4">
          <Field label="Title">
            <input className="db-input" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} />
          </Field>
          <Field label="Description">
            <textarea className="db-input min-h-[140px]" value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={8000} />
          </Field>
          <Field label="Priority">
            <FormSelect
              value={priority}
              options={[
                ["NORMAL", "Normal"],
                ["IMPORTANT", "Important"],
                ["URGENT", "Urgent"]
              ]}
              onChange={(v) => setPriority(v as Priority)}
            />
          </Field>
          <Field label="Pin on lists">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pinned
            </label>
          </Field>
          <Field label="Expiry (optional)">
            <input className="db-input" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </Field>
          <Field label="Attachment (PDF, DOCX, images — max 10MB)">
            <input
              className="db-input"
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="db-submit" type="submit" disabled={isSaving}>
            {isSaving ? "Publishing…" : "Publish announcement"}
          </button>
          <GlassButton onClick={() => navigate("/announcements")}>Cancel</GlassButton>
        </div>
      </form>
    </AnnouncementShell>
  );
}

export function AnnouncementHistoryPage() {
  const { fetchJson } = useAnnouncementsApi();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AnnouncementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [status, setStatus] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), includeReadStatus: "true" });
      if (status) params.set("status", status);
      const res = await fetchJson<Page<AnnouncementListItem>>(`/api/announcements?${params.toString()}`);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Load failed", "error");
    }
  }, [fetchJson, page, showToast, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AnnouncementShell title="Announcement history">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Status">
          <FormSelect
            value={status}
            options={[
              ["", "All"],
              ["PUBLISHED", "Published"],
              ["DRAFT", "Draft"],
              ["ARCHIVED", "Archived"]
            ]}
            onChange={setStatus}
          />
        </Field>
        <GlassButton onClick={() => void load()}>Refresh</GlassButton>
      </div>
      <div className="grid gap-3">
        {items.map((row) => (
          <article
            key={row.id}
            className="db-card motion-safe:transition motion-safe:duration-200 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-slate-900/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{row.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {formatAudience(row.audience)} · {scopeSummary(row)} · {formatPriority(row.priority)}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{row.status}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{row.body}</p>
            <dl className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-600 dark:text-slate-400">Created by</dt>
                <dd>{row.createdBy}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-600 dark:text-slate-400">Created</dt>
                <dd>{new Date(row.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-600 dark:text-slate-400">Expires</dt>
                <dd>{row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-600 dark:text-slate-400">Read</dt>
                <dd>{row.readAt ? "Read" : "Unread"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Page {page} · {total} total
        </p>
        <div className="flex gap-2">
          <GlassButton onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</GlassButton>
          <GlassButton onClick={() => setPage((p) => (p * pageSize < total ? p + 1 : p))}>Next</GlassButton>
        </div>
      </div>
    </AnnouncementShell>
  );
}

export function AnnouncementModifyListPage() {
  const navigate = useNavigate();
  const { fetchJson } = useAnnouncementsApi();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AnnouncementListItem[]>([]);

  async function runSearch() {
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "25" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetchJson<Page<AnnouncementListItem>>(`/api/announcements?${params.toString()}`);
      setItems(res.items);
      showToast("Search updated");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Search failed", "error");
    }
  }

  return (
    <AnnouncementShell title="Modify announcement">
      <div className="db-card db-form mb-6 flex flex-wrap gap-3">
        <Field label="Search title, body, or ID prefix">
          <input className="db-input min-w-[240px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
        </Field>
        <div className="flex items-end">
          <GlassButton onClick={() => void runSearch()}>Search</GlassButton>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((row) => (
          <button
            key={row.id}
            type="button"
            className="db-card text-left motion-safe:transition hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700"
            onClick={() => navigate(`/announcements/modify/${row.id}`)}
          >
            <h3 className="font-semibold text-slate-900 dark:text-slate-50">{row.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{row.id}</p>
            <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{row.body}</p>
            <p className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">Edit →</p>
          </button>
        ))}
      </div>
      {items.length === 0 ? <p className="db-empty">No results yet. Run a search.</p> : null}
    </AnnouncementShell>
  );
}

export function AnnouncementModifyEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { fetchJson, sendJson, uploadFile } = useAnnouncementsApi();
  const structure = useStructureLists();
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState<Audience>("STUDENTS");
  const [studentScope, setStudentScope] = useState<StudentScope>({
    campusId: "",
    programId: "",
    branchId: "",
    batchId: "",
    classId: "",
    sectionId: ""
  });
  const [teacherTarget, setTeacherTarget] = useState<TeacherTarget>("INSTITUTION");
  const [teacherCampusId, setTeacherCampusId] = useState("");
  const [teacherProgramId, setTeacherProgramId] = useState("");
  const [teacherBranchId, setTeacherBranchId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void structure.loadCampuses();
  }, [structure.loadCampuses]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchJson<{ announcement: AnnouncementDetail }>(`/api/announcements/${id}`);
        if (cancelled) return;
        const a = res.announcement;
        setTitle(a.title);
        setBody(a.body);
        setAudience((a.audience === "TEACHERS" || a.audience === "BOTH" || a.audience === "STUDENTS" ? a.audience : "STUDENTS") as Audience);
        setPriority((a.priority as Priority) ?? "NORMAL");
        setPinned(!!a.pinned);
        setExpiresAt(a.expiresAt ? a.expiresAt.slice(0, 10) : "");
        const s = a.scope;
        setStudentScope({
          campusId: s.campusId ?? "",
          programId: s.programId ?? "",
          branchId: s.branchId ?? "",
          batchId: s.batchId ?? "",
          classId: s.classId ?? "",
          sectionId: s.sectionId ?? ""
        });
        const ts = a.teacherScope as string;
        setTeacherTarget(ts === "NONE" || !ts ? "INSTITUTION" : (ts as TeacherTarget));
        setTeacherCampusId(a.teacherCampusId ?? "");
        setTeacherProgramId(a.teacherProgramId ?? "");
        setTeacherBranchId(a.teacherBranchId ?? "");

        const { loadPrograms, loadBranches, loadBatches, loadClasses, loadSections } = structure;
        if (s.campusId) await loadPrograms(s.campusId);
        if (s.programId && s.campusId) await loadBranches(s.programId, s.campusId);
        if (s.branchId && s.programId && s.campusId) await loadBatches(s.branchId, s.programId, s.campusId);
        if (s.batchId) await loadClasses(s.batchId);
        if (s.classId) await loadSections(s.classId);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Load failed", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per id
  }, [id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setIsSaving(true);
    try {
      const d = audience === "TEACHERS" ? {} : deepestStudentPayload(studentScope);
      const scopePatch =
        audience === "TEACHERS"
          ? { campusId: null, programId: null, branchId: null, batchId: null, classId: null, sectionId: null }
          : {
              campusId: d.campusId ?? null,
              programId: d.programId ?? null,
              branchId: d.branchId ?? null,
              batchId: d.batchId ?? null,
              classId: d.classId ?? null,
              sectionId: d.sectionId ?? null
            };
      let teacherScope = "NONE";
      let tc: string | null = null;
      let tp: string | null = null;
      let tb: string | null = null;
      if (audience === "TEACHERS" || audience === "BOTH") {
        teacherScope = teacherTarget;
        if (teacherTarget === "CAMPUS") tc = teacherCampusId || null;
        else if (teacherTarget === "DEPARTMENT") tp = teacherProgramId || null;
        else if (teacherTarget === "BRANCH") tb = teacherBranchId || null;
      }
      const payload = {
        title: title.trim(),
        body: body.trim(),
        audience,
        priority,
        pinned,
        expiresAt: expiresAt ? `${expiresAt}T23:59:59.000Z` : null,
        ...scopePatch,
        teacherScope,
        teacherCampusId: tc,
        teacherProgramId: tp,
        teacherBranchId: tb
      };
      await sendJson(`/api/announcements/${id}`, payload, "PATCH");
      if (file) {
        try {
          await uploadFile(id, file);
          showToast("Attachment uploaded");
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Attachment failed", "error");
        }
      }
      showToast("Announcement updated");
      navigate("/announcements/history");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Update failed", "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (!id) return null;
  if (loading) {
    return (
      <AnnouncementShell title="Modify announcement">
        <p className="db-empty">Loading…</p>
      </AnnouncementShell>
    );
  }

  return (
    <AnnouncementShell title="Edit announcement">
      <form className="mx-auto flex max-w-3xl flex-col gap-6" onSubmit={(e) => void submit(e)}>
        <AnnouncementFormFields
          audience={audience}
          setAudience={setAudience}
          studentScope={studentScope}
          setStudentScope={setStudentScope}
          teacherTarget={teacherTarget}
          setTeacherTarget={setTeacherTarget}
          teacherCampusId={teacherCampusId}
          setTeacherCampusId={setTeacherCampusId}
          teacherProgramId={teacherProgramId}
          setTeacherProgramId={setTeacherProgramId}
          teacherBranchId={teacherBranchId}
          setTeacherBranchId={setTeacherBranchId}
          structure={structure}
        />
        <div className="db-card db-form grid gap-4">
          <Field label="Title">
            <input className="db-input" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} />
          </Field>
          <Field label="Description">
            <textarea className="db-input min-h-[140px]" value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} maxLength={8000} />
          </Field>
          <Field label="Priority">
            <FormSelect
              value={priority}
              options={[
                ["NORMAL", "Normal"],
                ["IMPORTANT", "Important"],
                ["URGENT", "Urgent"]
              ]}
              onChange={(v) => setPriority(v as Priority)}
            />
          </Field>
          <Field label="Pin on lists">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pinned
            </label>
          </Field>
          <Field label="Expiry (optional)">
            <input className="db-input" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </Field>
          <Field label="Add attachment">
            <input
              className="db-input"
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="db-submit" type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </button>
          <GlassButton onClick={() => navigate("/announcements/modify")}>Back to search</GlassButton>
        </div>
      </form>
    </AnnouncementShell>
  );
}

export function AnnouncementArchivePage() {
  const { fetchJson, sendJson } = useAnnouncementsApi();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AnnouncementListItem[]>([]);
  const [pick, setPick] = useState<AnnouncementListItem | null>(null);
  const [open, setOpen] = useState(false);

  async function runSearch() {
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "25" });
      if (search.trim()) params.set("search", search.trim());
      params.set("status", "PUBLISHED");
      const res = await fetchJson<Page<AnnouncementListItem>>(`/api/announcements?${params.toString()}`);
      setItems(res.items);
      showToast("Search updated");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Search failed", "error");
    }
  }

  async function confirmArchive() {
    if (!pick) return;
    try {
      await sendJson(`/api/announcements/${pick.id}/archive`, {});
      showToast("Announcement archived", "danger");
      setOpen(false);
      setPick(null);
      await runSearch();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Archive failed", "error");
    }
  }

  return (
    <AnnouncementShell title="Archive announcement">
      <div className="db-card db-form mb-6 flex flex-wrap gap-3">
        <Field label="Search">
          <input className="db-input min-w-[240px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title or ID…" />
        </Field>
        <div className="flex items-end">
          <GlassButton onClick={() => void runSearch()}>Search</GlassButton>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((row) => (
          <div key={row.id} className="db-card flex flex-col justify-between gap-3">
            <div>
              <h3 className="font-semibold">{row.title}</h3>
              <p className="text-xs text-slate-500">{row.id}</p>
            </div>
            <GlassButton
              tone="danger"
              onClick={() => {
                setPick(row);
                setOpen(true);
              }}
            >
              Archive (soft)
            </GlassButton>
          </div>
        ))}
      </div>
      <ConfirmArchiveDialog
        isOpen={open}
        title="Archive this announcement?"
        message="This only sets status to archived. Nothing is permanently deleted."
        itemName={pick?.title}
        onCancel={() => setOpen(false)}
        onConfirm={confirmArchive}
      />
    </AnnouncementShell>
  );
}
