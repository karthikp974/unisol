import { ArrowLeft, Bell, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { ErpLoader } from "../shared/ErpLoader";
import { FormSelect, type FormSelectOption } from "../shared/FormSelect";
import { useToast } from "../shared/toast-context";
import { WfBtn } from "../shared/WfBtn";

type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

type Campus = { id: string; code: string; name: string };
type Program = { id: string; code: string; name: string };
type Branch = { id: string; code: string; name: string };
type Batch = { id: string; batchCode: string };
type AcademicClass = { id: string; label: string; semesterNumber: number };
type Section = { id: string; name: string };

const FORM_TYPES: [string, string][] = [
  ["GUEST_LECTURE", "Guest Lecture Feedback"],
  ["SEMESTER_EXAM", "Semester Exam Feedback"],
  ["WORKSHOP", "Workshop Feedback"],
  ["SEMINAR", "Seminar Feedback"],
  ["ACADEMIC_EVENT", "Academic Event Feedback"],
  ["OTHER", "Other"]
];

const Q_TYPES: [string, string][] = [
  ["RATING_SCALE", "Rating scale (1–5)"],
  ["YES_NO", "Yes / No"],
  ["MULTIPLE_CHOICE", "Multiple choice"],
  ["PARAGRAPH", "Paragraph answer"]
];

type StudentScope = { campusId: string; programId: string; branchId: string; batchId: string; classId: string; sectionId: string };

function deepestScope(s: StudentScope): Record<string, string> {
  if (s.sectionId) return { sectionId: s.sectionId };
  if (s.classId) return { classId: s.classId };
  if (s.batchId) return { batchId: s.batchId };
  if (s.branchId) return { branchId: s.branchId };
  if (s.programId) return { programId: s.programId };
  if (s.campusId) return { campusId: s.campusId };
  return {};
}

async function responseError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
  return new Error(message || "Request failed.");
}

function FeedbackShell({
  children,
  title,
  variant = "subpage",
  backHref
}: {
  children: ReactNode;
  title: string;
  variant?: "main" | "subpage";
  /** When set, back control navigates here instead of browser history. */
  backHref?: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initials =
    user?.fullName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "AD";
  return (
    <main className="db-workflow min-h-screen">
      <header className="db-workflow-header">
        <div className="db-header-left">
          {variant === "main" ? (
            <Link to="/admin" className="db-icon-button" aria-label="Dashboard">
              <ArrowLeft size={20} />
            </Link>
          ) : backHref ? (
            <Link to={backHref} className="db-icon-button" aria-label="Back">
              <ArrowLeft size={20} />
            </Link>
          ) : (
            <button type="button" className="db-icon-button" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1>{title}</h1>
        </div>
        <div className="db-header-actions">
          {variant === "main" ? (
            <button type="button" className="db-icon-button" aria-label="Notifications">
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

function useFeedbackApi() {
  const { authFetch } = useAuth();
  const fetchJson = useCallback(
    async <T,>(path: string) => {
      const r = await authFetch(path);
      if (!r.ok) throw await responseError(r);
      return (await r.json()) as T;
    },
    [authFetch]
  );
  const sendJson = useCallback(
    async <T,>(path: string, body: unknown, method: "POST" | "PATCH" = "POST") => {
      const r = await authFetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw await responseError(r);
      return (await r.json().catch(() => ({}))) as T;
    },
    [authFetch]
  );
  return { fetchJson, sendJson, authFetch };
}

function useStructureLists() {
  const { fetchJson } = useFeedbackApi();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const loadCampuses = useCallback(async () => {
    const p = await fetchJson<Page<Campus>>("/api/campuses?pageSize=200");
    setCampuses(p.items);
  }, [fetchJson]);
  const loadPrograms = useCallback(
    async (campusId: string) => {
      const p = await fetchJson<Page<Program>>(`/api/core/programs?pageSize=200&campusId=${encodeURIComponent(campusId)}`);
      setPrograms(p.items);
    },
    [fetchJson]
  );
  const loadBranches = useCallback(
    async (programId: string, campusId: string) => {
      const qs = new URLSearchParams({ pageSize: "200", programId, campusId });
      const p = await fetchJson<Page<Branch>>(`/api/core/branches?${qs}`);
      setBranches(p.items);
    },
    [fetchJson]
  );
  const loadBatches = useCallback(
    async (branchId: string, programId: string, campusId: string) => {
      const qs = new URLSearchParams({ pageSize: "200", branchId, programId, campusId });
      const p = await fetchJson<Page<Batch>>(`/api/core/batches?${qs}`);
      setBatches(p.items);
    },
    [fetchJson]
  );
  const loadClasses = useCallback(
    async (batchId: string) => {
      const p = await fetchJson<Page<AcademicClass>>(`/api/core/classes?pageSize=200&batchId=${encodeURIComponent(batchId)}`);
      setClasses(p.items);
    },
    [fetchJson]
  );
  const loadSections = useCallback(
    async (classId: string) => {
      const p = await fetchJson<Page<Section>>(`/api/core/sections?pageSize=200&classId=${encodeURIComponent(classId)}`);
      setSections(p.items);
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

export function FeedbackHubPage() {
  const navigate = useNavigate();
  return (
    <FeedbackShell title="Feedback" variant="main">
      <section className="db-section">
        <h2>Institutional quality feedback</h2>
        <div className="db-module-grid">
          <button type="button" className="db-hub-tile" onClick={() => navigate("/feedback/create-feedback-form")}>
            Create Feedback Form
          </button>
          <button type="button" className="db-hub-tile" onClick={() => navigate("/feedback/active-forms")}>
            Active Feedback Forms
          </button>
          <button type="button" className="db-hub-tile" onClick={() => navigate("/feedback/feedback-reports")}>
            Feedback Reports
          </button>
          <button type="button" className="db-hub-tile" onClick={() => navigate("/feedback/archived-feedbacks")}>
            Archived Feedbacks
          </button>
        </div>
      </section>
    </FeedbackShell>
  );
}

type QDraft = { localKey: string; order: number; type: string; prompt: string; required: boolean; choicesText: string };

export function FeedbackCreateFormPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { sendJson } = useFeedbackApi();
  const st = useStructureLists();
  const [step, setStep] = useState(1);
  const [formType, setFormType] = useState("GUEST_LECTURE");
  const [customType, setCustomType] = useState("");
  const [scope, setScope] = useState<StudentScope>({ campusId: "", programId: "", branchId: "", batchId: "", classId: "", sectionId: "" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [questions, setQuestions] = useState<QDraft[]>([
    { localKey: "q1", order: 0, type: "RATING_SCALE", prompt: "", required: true, choicesText: "Option A\nOption B" }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void st.loadCampuses();
  }, [st.loadCampuses]);

  const campusOpts = useMemo(() => st.campuses.map((c) => [c.id, `${c.code} — ${c.name}`] as [string, string]), [st.campuses]);
  const campusSelectOptions = useMemo((): readonly FormSelectOption[] => [["", "Entire institution"], ...campusOpts], [campusOpts]);
  const programSelectOptions = useMemo(
    (): readonly FormSelectOption[] => [["", "All departments"], ...st.programs.map((p) => [p.id, `${p.code} — ${p.name}`] as const)],
    [st.programs]
  );
  const branchSelectOptions = useMemo(
    (): readonly FormSelectOption[] => [["", "All branches"], ...st.branches.map((b) => [b.id, `${b.code} — ${b.name}`] as const)],
    [st.branches]
  );
  const batchSelectOptions = useMemo(
    (): readonly FormSelectOption[] => [["", "All batches"], ...st.batches.map((b) => [b.id, b.batchCode] as const)],
    [st.batches]
  );
  const classSelectOptions = useMemo(
    (): readonly FormSelectOption[] => [["", "All classes"], ...st.classes.map((c) => [c.id, `Sem ${c.semesterNumber} — ${c.label}`] as const)],
    [st.classes]
  );
  const sectionSelectOptions = useMemo(
    (): readonly FormSelectOption[] => [["", "All sections"], ...st.sections.map((s) => [s.id, s.name] as const)],
    [st.sections]
  );

  async function publish() {
    setSaving(true);
    try {
      if (formType === "OTHER" && !customType.trim()) {
        showToast("Specify feedback type.", "error");
        return;
      }
      const qs = questions
        .map((q, i) => ({
          order: i,
          type: q.type,
          prompt: q.prompt.trim(),
          required: q.required,
          options:
            q.type === "MULTIPLE_CHOICE"
              ? { choices: q.choicesText.split("\n").map((s) => s.trim()).filter(Boolean) }
              : q.type === "RATING_SCALE"
                ? { minLabel: "Poor", maxLabel: "Excellent" }
                : undefined
        }))
        .filter((q) => q.prompt.length >= 2);
      if (!qs.length) {
        showToast("Add at least one question with a prompt.", "error");
        return;
      }
      await sendJson("/api/feedback/forms", {
        formType,
        customType: formType === "OTHER" ? customType.trim() : undefined,
        ...deepestScope(scope),
        title: title.trim(),
        description: description.trim(),
        startsAt: `${startsAt}T00:00:00.000Z`,
        endsAt: `${endsAt}T23:59:59.000Z`,
        anonymous,
        allowMultiple,
        status: "ACTIVE",
        questions: qs
      });
      showToast("Feedback form created");
      navigate("/feedback/active-forms");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeedbackShell title="Create Feedback Form">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="feedback-step-row flex flex-wrap gap-2">
          {["Feedback type", "Audience", "Details", "Questions"].map((label, i) => (
            <span key={label} className={`feedback-step-pill${step === i + 1 ? " is-active" : ""}`}>
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {step === 1 ? (
          <div className="db-card db-form grid gap-4">
            <label className="db-field">
              <span>Feedback type</span>
              <FormSelect value={formType} options={FORM_TYPES} onChange={setFormType} required />
            </label>
            {formType === "OTHER" ? (
              <label className="db-field">
                <span>Specify Feedback Type</span>
                <input className="db-input" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Describe the feedback category" />
              </label>
            ) : null}
            <div className="db-wf-actions">
              <WfBtn type="button" onClick={() => navigate("/feedback")}>
                Cancel
              </WfBtn>
              <WfBtn type="button" variant="primary" onClick={() => setStep(2)}>
                Next
              </WfBtn>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="db-card db-form grid gap-3">
            <p className="text-sm font-semibold text-slate-800">Target audience (stop at any level)</p>
            <label className="db-field">
              <span>Campus</span>
              <FormSelect
                value={scope.campusId}
                options={campusSelectOptions}
                onChange={async (id) => {
                  setScope({ campusId: id, programId: "", branchId: "", batchId: "", classId: "", sectionId: "" });
                  st.setPrograms([]);
                  if (id) await st.loadPrograms(id);
                }}
              />
            </label>
            <label className="db-field">
              <span>Department</span>
              <FormSelect
                value={scope.programId}
                options={programSelectOptions}
                disabled={!scope.campusId}
                onChange={async (id) => {
                  setScope((p) => ({ ...p, programId: id, branchId: "", batchId: "", classId: "", sectionId: "" }));
                  st.setBranches([]);
                  if (id && scope.campusId) await st.loadBranches(id, scope.campusId);
                }}
              />
            </label>
            <label className="db-field">
              <span>Branch</span>
              <FormSelect
                value={scope.branchId}
                options={branchSelectOptions}
                disabled={!scope.programId}
                onChange={async (id) => {
                  setScope((p) => ({ ...p, branchId: id, batchId: "", classId: "", sectionId: "" }));
                  st.setBatches([]);
                  if (id && scope.programId && scope.campusId) await st.loadBatches(id, scope.programId, scope.campusId);
                }}
              />
            </label>
            <label className="db-field">
              <span>Batch</span>
              <FormSelect
                value={scope.batchId}
                options={batchSelectOptions}
                disabled={!scope.branchId}
                onChange={async (id) => {
                  setScope((p) => ({ ...p, batchId: id, classId: "", sectionId: "" }));
                  st.setClasses([]);
                  if (id) await st.loadClasses(id);
                }}
              />
            </label>
            <label className="db-field">
              <span>Class</span>
              <FormSelect
                value={scope.classId}
                options={classSelectOptions}
                disabled={!scope.batchId}
                onChange={async (id) => {
                  setScope((p) => ({ ...p, classId: id, sectionId: "" }));
                  st.setSections([]);
                  if (id) await st.loadSections(id);
                }}
              />
            </label>
            <label className="db-field">
              <span>Section</span>
              <FormSelect
                value={scope.sectionId}
                options={sectionSelectOptions}
                disabled={!scope.classId}
                onChange={(id) => setScope((p) => ({ ...p, sectionId: id }))}
              />
            </label>
            <div className="db-wf-actions">
              <WfBtn type="button" onClick={() => setStep(1)}>
                Back
              </WfBtn>
              <WfBtn type="button" variant="primary" onClick={() => setStep(3)}>
                Next
              </WfBtn>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="db-card db-form grid gap-4">
            <label className="db-field">
              <span>Feedback Title</span>
              <input className="db-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="db-field">
              <span>Description / Instructions</span>
              <textarea className="db-input min-h-[120px]" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </label>
            <label className="db-field">
              <span>Start date</span>
              <input className="db-input" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            </label>
            <label className="db-field">
              <span>End date</span>
              <input className="db-input" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Anonymous responses (identity hidden in reports)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allowMultiple} onChange={(e) => setAllowMultiple(e.target.checked)} /> Allow multiple submissions per student
            </label>
            <div className="db-wf-actions">
              <WfBtn type="button" onClick={() => setStep(2)}>
                Back
              </WfBtn>
              <WfBtn type="button" variant="primary" onClick={() => setStep(4)}>
                Next
              </WfBtn>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="db-card db-form grid gap-4">
            <p className="text-sm font-semibold">Question builder</p>
            {questions.map((q, idx) => (
              <div key={q.localKey} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="min-w-[200px] flex-1">
                    <FormSelect
                      value={q.type}
                      options={Q_TYPES}
                      onChange={(t) => setQuestions((list) => list.map((x) => (x.localKey === q.localKey ? { ...x, type: t } : x)))}
                      aria-label="Question type"
                    />
                  </div>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={q.required} onChange={(e) => setQuestions((list) => list.map((x) => (x.localKey === q.localKey ? { ...x, required: e.target.checked } : x)))} /> Required
                  </label>
                  <button type="button" className="db-icon-button" aria-label="Move up" disabled={idx === 0} onClick={() => setQuestions((list) => {
                    const n = [...list];
                    [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
                    return n;
                  })}>
                    <ChevronUp size={18} />
                  </button>
                  <button type="button" className="db-icon-button" aria-label="Move down" disabled={idx === questions.length - 1} onClick={() => setQuestions((list) => {
                    const n = [...list];
                    [n[idx + 1], n[idx]] = [n[idx], n[idx + 1]];
                    return n;
                  })}>
                    <ChevronDown size={18} />
                  </button>
                  <button type="button" className="db-icon-button text-red-600" aria-label="Remove" onClick={() => setQuestions((list) => list.filter((x) => x.localKey !== q.localKey))}>
                    <Trash2 size={18} />
                  </button>
                </div>
                <input className="db-input mb-2" placeholder="Question text" value={q.prompt} onChange={(e) => setQuestions((list) => list.map((x) => (x.localKey === q.localKey ? { ...x, prompt: e.target.value } : x)))} />
                {q.type === "MULTIPLE_CHOICE" ? (
                  <textarea className="db-input min-h-[72px]" placeholder="One choice per line" value={q.choicesText} onChange={(e) => setQuestions((list) => list.map((x) => (x.localKey === q.localKey ? { ...x, choicesText: e.target.value } : x)))} />
                ) : null}
              </div>
            ))}
            <WfBtn
              type="button"
              variant="primary"
              onClick={() =>
                setQuestions((list) => [
                  ...list,
                  { localKey: `q${Date.now()}`, order: list.length, type: "RATING_SCALE", prompt: "", required: true, choicesText: "" }
                ])
              }
            >
              Add question
            </WfBtn>
            <div className="db-wf-actions">
              <WfBtn type="button" onClick={() => setStep(3)}>
                Back
              </WfBtn>
              <button type="button" className="db-submit" disabled={saving} onClick={() => void publish()}>
                {saving ? "Publishing…" : "Publish form"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </FeedbackShell>
  );
}

export function FeedbackActiveFormsPage() {
  const navigate = useNavigate();
  const { fetchJson, sendJson } = useFeedbackApi();
  const { showToast } = useToast();
  const [items, setItems] = useState<{ id: string; title: string; formType: string; startsAt: string; endsAt: string; totalResponses: number }[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetchJson<{ items: typeof items }>("/api/feedback/forms/active?pageSize=50");
      setItems(res.items);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Load failed", "error");
    }
  }, [fetchJson, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <FeedbackShell title="Active Feedback Forms">
      <div className="mb-4 db-wf-actions">
        <WfBtn onClick={() => void load()}>Refresh</WfBtn>
        <WfBtn variant="primary" onClick={() => navigate("/feedback/feedback-reports")}>
          Open reports hub
        </WfBtn>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((row) => (
          <article key={row.id} className="db-card motion-safe:transition hover:shadow-md">
            <h3 className="text-lg font-semibold">{row.title}</h3>
            <p className="text-xs text-slate-500">{row.formType.replace(/_/g, " ")}</p>
            <p className="mt-2 text-sm text-slate-600">
              {new Date(row.startsAt).toLocaleDateString()} → {new Date(row.endsAt).toLocaleDateString()}
            </p>
            <p className="mt-1 text-sm font-medium">Responses: {row.totalResponses}</p>
            <div className="mt-3 db-wf-actions">
              <WfBtn variant="primary" onClick={() => navigate(`/feedback/feedback-reports/${row.id}`)}>
                Analytics
              </WfBtn>
              <WfBtn
                variant="danger"
                onClick={async () => {
                  if (!window.confirm("Archive this form? It moves to archive and stays recoverable.")) return;
                  try {
                    await sendJson(`/api/feedback/forms/${row.id}/archive`, {}, "POST");
                    showToast("Form archived");
                    void load();
                  } catch (e) {
                    showToast(e instanceof Error ? e.message : "Archive failed", "error");
                  }
                }}
              >
                Archive
              </WfBtn>
            </div>
          </article>
        ))}
      </div>
    </FeedbackShell>
  );
}

export function FeedbackArchivedPage() {
  const { fetchJson } = useFeedbackApi();
  const { showToast } = useToast();
  const [items, setItems] = useState<{ id: string; title: string; formType: string; totalResponses: number }[]>([]);
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchJson<{ items: typeof items }>("/api/feedback/forms/archived?pageSize=50");
        setItems(res.items);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Load failed", "error");
      }
    })();
  }, [fetchJson, showToast]);
  return (
    <FeedbackShell title="Archived Feedbacks">
      <div className="grid gap-3">
        {items.map((row) => (
          <div key={row.id} className="db-card">
            <strong>{row.title}</strong>
            <span className="ml-2 text-xs text-slate-500">{row.formType}</span>
            <p className="text-sm text-slate-600">Responses: {row.totalResponses}</p>
          </div>
        ))}
      </div>
    </FeedbackShell>
  );
}

export function FeedbackReportsHubPage() {
  const navigate = useNavigate();
  const { fetchJson } = useFeedbackApi();
  const { showToast } = useToast();
  const [items, setItems] = useState<{ id: string; title: string; totalResponses: number }[]>([]);
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchJson<{ items: typeof items }>("/api/feedback/forms/active?pageSize=100");
        setItems(res.items.map((i) => ({ id: i.id, title: i.title, totalResponses: i.totalResponses })));
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Load failed", "error");
      }
    })();
  }, [fetchJson, showToast]);
  return (
    <FeedbackShell title="Feedback Reports">
      <p className="mb-4 text-sm text-slate-600">Select a form to view backend-driven analytics and exports.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((row) => (
          <button key={row.id} type="button" className="fb-report-hub-card" onClick={() => navigate(`/feedback/feedback-reports/${row.id}`)}>
            <h3>{row.title}</h3>
            <p>{row.totalResponses} submissions</p>
          </button>
        ))}
      </div>
    </FeedbackShell>
  );
}

type ReportSummary = {
  totalSubmissions: number;
  questionStats: { questionId: string; prompt: string; type: string; average?: number; distribution?: Record<string, number>; yes?: number; no?: number; choiceCounts?: Record<string, number>; responseCount?: number }[];
  insights: string[];
};

export function FeedbackReportDetailPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { authFetch, fetchJson } = useFeedbackApi();
  const { showToast } = useToast();
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!formId) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchJson<{ formId: string } & ReportSummary>(`/api/feedback/forms/${formId}/report/summary`);
        setData(res);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Report failed", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [formId, fetchJson, showToast]);

  async function exportCsv() {
    if (!formId) return;
    setExporting(true);
    try {
      const r = await authFetch(`/api/feedback/forms/${formId}/export`);
      if (!r.ok) throw await responseError(r);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-${formId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("CSV export ready");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Export failed", "error");
    } finally {
      setExporting(false);
    }
  }

  if (loading || !data) {
    return (
      <FeedbackShell title="Feedback report">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <ErpLoader label="Generating analytics…" size={96} />
        </div>
      </FeedbackShell>
    );
  }

  return (
    <FeedbackShell title="Feedback analytics">
      <div className="fb-report mx-auto max-w-3xl">
        {exporting ? (
          <div className="mb-4 flex justify-center">
            <ErpLoader label="Processing feedback report…" size={88} />
          </div>
        ) : null}
        <div className="fb-report-hero">
          <h2>Report summary</h2>
          <p className="m-0 text-sm text-slate-600">Institutional feedback analytics (aggregated on the server).</p>
          <p className="fb-report-metric mt-2">{data.totalSubmissions}</p>
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Total submissions</p>
        </div>
        <div className="db-wf-actions">
          <WfBtn variant="primary" onClick={() => void exportCsv()}>
            Export CSV
          </WfBtn>
        </div>
        <ul className="fb-report-insights">
          {data.insights.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="grid gap-5">
          {data.questionStats.map((q) => (
            <div key={q.questionId} className="fb-report-q">
              <h3>{q.prompt}</h3>
              <p className="fb-report-q-type">{q.type.replace(/_/g, " ")}</p>
              {q.type === "RATING_SCALE" && q.distribution ? (
                <div className="fb-report-bars">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const c = q.distribution![String(star)] ?? 0;
                    const max = Math.max(1, ...Object.values(q.distribution!).map(Number));
                    const h = `${Math.round((c / max) * 100)}%`;
                    return (
                      <div key={star} className="fb-report-bar-track">
                        <div className="fb-report-bar-inner">
                          <div className="fb-report-bar-fill" style={{ height: h }} title={`${star}: ${c}`} />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{star}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {q.type === "RATING_SCALE" && q.average != null ? (
                <p className="m-0 mt-2 text-sm font-medium text-slate-700">
                  Average: <span className="text-[var(--erp-blue)]">{q.average}</span> / 5
                </p>
              ) : null}
              {q.type === "YES_NO" ? (
                <p className="m-0 mt-2 text-sm text-slate-700">
                  Yes: {q.yes ?? 0} · No: {q.no ?? 0}
                </p>
              ) : null}
              {q.type === "MULTIPLE_CHOICE" && q.choiceCounts ? (
                <ul className="m-0 mt-2 list-none space-y-1 p-0 text-sm text-slate-700">
                  {Object.entries(q.choiceCounts).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2 border-b border-slate-100 py-1 last:border-0">
                      <span>{k}</span>
                      <strong className="text-[var(--erp-blue)]">{v}</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
              {q.type === "PARAGRAPH" ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="m-0 text-sm text-slate-600">Paragraph responses: {q.responseCount ?? 0}</p>
                  {(q.responseCount ?? 0) > 0 ? (
                    <WfBtn variant="primary" onClick={() => navigate(`/feedback/feedback-reports/${formId}/questions/${q.questionId}/paragraphs`)}>
                      Review text
                    </WfBtn>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </FeedbackShell>
  );
}

type ParagraphRow = { id: string; text: string; submittedAt: string; student: { fullName: string; email: string; section: string } | null };

export function FeedbackParagraphAnswersPage() {
  const { formId, questionId } = useParams<{ formId: string; questionId: string }>();
  const { fetchJson } = useFeedbackApi();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ParagraphRow[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const load = useCallback(async () => {
    if (!formId || !questionId) return;
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (appliedSearch.trim()) qs.set("answerSearch", appliedSearch.trim());
      const res = await fetchJson<{ items: ParagraphRow[]; total: number }>(
        `/api/feedback/forms/${formId}/questions/${questionId}/paragraphs?${qs}`
      );
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Load failed", "error");
    }
  }, [formId, questionId, page, appliedSearch, fetchJson, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <FeedbackShell title="Paragraph responses" backHref={formId ? `/feedback/feedback-reports/${formId}` : "/feedback/feedback-reports"}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <form
          className="db-card db-form flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setAppliedSearch(search);
          }}
        >
          <input className="db-input min-w-[200px] flex-1" placeholder="Search answers…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="db-submit">
            Search
          </button>
        </form>
        <p className="text-sm text-slate-600">
          Showing {rows.length} of {total}
        </p>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          {rows.map((r) => (
            <article key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
              <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-100">{r.text}</p>
              <p className="mt-2 text-xs text-slate-500">
                {new Date(r.submittedAt).toLocaleString()}
                {r.student ? ` · ${r.student.fullName} · ${r.student.section}` : " · Anonymous aggregate"}
              </p>
            </article>
          ))}
        </div>
        <div className="db-wf-actions">
          <WfBtn onClick={() => setPage((p) => (p > 1 ? p - 1 : p))}>Previous</WfBtn>
          <WfBtn onClick={() => setPage((p) => (p * pageSize < total ? p + 1 : p))}>Next</WfBtn>
        </div>
      </div>
    </FeedbackShell>
  );
}

type StudentFormRow = {
  id: string;
  title: string;
  formType: string;
  endsAt: string;
  alreadySubmitted: boolean;
  allowMultiple: boolean;
  questionCount: number;
};

type StudentQuestion = { id: string; type: string; prompt: string; required: boolean; options: unknown };

export function StudentFeedbackListPage() {
  const navigate = useNavigate();
  const { fetchJson } = useFeedbackApi();
  const { showToast } = useToast();
  const [items, setItems] = useState<StudentFormRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchJson<{ items: StudentFormRow[] }>("/api/feedback/student/available?pageSize=50");
        setItems(res.items);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Load failed", "error");
      }
    })();
  }, [fetchJson, showToast]);

  return (
    <FeedbackShell title="Feedback forms" backHref="/student">
      <p className="mb-4 text-sm text-slate-600">Only forms targeted to your campus, branch, batch, class, and section appear here.</p>
      <div className="grid gap-3">
        {items.map((row) => (
          <div key={row.id} className="db-card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">{row.title}</h3>
              <p className="text-xs text-slate-500">
                {row.formType.replace(/_/g, " ")} · Due {new Date(row.endsAt).toLocaleDateString()} · {row.questionCount} questions
              </p>
              {row.alreadySubmitted && !row.allowMultiple ? <span className="mt-1 inline-block text-xs font-bold text-amber-700">Submitted</span> : null}
            </div>
            <WfBtn
              variant="primary"
              onClick={() => {
                if (row.alreadySubmitted && !row.allowMultiple) {
                  showToast("You have already submitted this form.", "error");
                  return;
                }
                navigate(`/student/feedback/${row.id}`);
              }}
            >
              {row.alreadySubmitted && row.allowMultiple ? "Submit again" : "Open"}
            </WfBtn>
          </div>
        ))}
      </div>
    </FeedbackShell>
  );
}

export function StudentFeedbackFillPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { fetchJson, sendJson } = useFeedbackApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!formId) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchJson<{ form: { title: string; description: string; questions: StudentQuestion[] } }>(`/api/feedback/forms/${formId}`);
        setTitle(res.form.title);
        setDescription(res.form.description);
        setQuestions(res.form.questions);
        const init: Record<string, unknown> = {};
        for (const q of res.form.questions) {
          if (q.type === "YES_NO") init[q.id] = false;
          else if (q.type === "RATING_SCALE") init[q.id] = 3;
          else init[q.id] = "";
        }
        setAnswers(init);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Unable to load form", "error");
        navigate("/student/feedback");
      } finally {
        setLoading(false);
      }
    })();
  }, [formId, fetchJson, navigate, showToast]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formId) return;
    setSubmitting(true);
    try {
      const payloadAnswers: { questionId: string; value: unknown }[] = [];
      for (const q of questions) {
        const v = answers[q.id];
        if (q.type === "PARAGRAPH" || q.type === "MULTIPLE_CHOICE") {
          const s = String(v ?? "").trim();
          if (!q.required && !s.length) continue;
          payloadAnswers.push({ questionId: q.id, value: s });
        } else {
          payloadAnswers.push({ questionId: q.id, value: v });
        }
      }
      await sendJson(`/api/feedback/student/forms/${formId}/submit`, { answers: payloadAnswers }, "POST");
      showToast("Response submitted");
      navigate("/student/feedback");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Submit failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <FeedbackShell title="Feedback" backHref="/student/feedback">
        <div className="flex min-h-[40vh] items-center justify-center">
          <ErpLoader label="Loading form…" size={88} />
        </div>
      </FeedbackShell>
    );
  }

  return (
    <FeedbackShell title={title || "Feedback"} backHref="/student/feedback">
      <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="db-card whitespace-pre-wrap text-sm text-slate-700">{description}</div>
        {questions.map((q) => {
          const opts = (q.options ?? {}) as { choices?: string[]; minLabel?: string; maxLabel?: string };
          return (
            <div key={q.id} className="db-card db-form grid gap-3">
              <p className="font-semibold text-slate-900">
                {q.prompt}
                {q.required ? <span className="text-red-600"> *</span> : null}
              </p>
              {q.type === "RATING_SCALE" ? (
                <label className="db-field">
                  <span>
                    {opts.minLabel ?? "Poor"} → {opts.maxLabel ?? "Excellent"}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={Number(answers[q.id] ?? 3)}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: Number(e.target.value) }))}
                  />
                  <p className="text-sm font-bold">{Number(answers[q.id] ?? 3)}</p>
                </label>
              ) : null}
              {q.type === "YES_NO" ? (
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name={q.id} checked={answers[q.id] === true} onChange={() => setAnswers((a) => ({ ...a, [q.id]: true }))} /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name={q.id} checked={answers[q.id] === false} onChange={() => setAnswers((a) => ({ ...a, [q.id]: false }))} /> No
                  </label>
                </div>
              ) : null}
              {q.type === "MULTIPLE_CHOICE" && opts.choices?.length ? (
                <div className="grid gap-2">
                  {opts.choices.map((c) => (
                    <label key={c} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                      <input type="radio" name={q.id} checked={answers[q.id] === c} onChange={() => setAnswers((a) => ({ ...a, [q.id]: c }))} />
                      {c}
                    </label>
                  ))}
                </div>
              ) : null}
              {q.type === "PARAGRAPH" ? (
                <textarea
                  className="db-input min-h-[120px]"
                  value={String(answers[q.id] ?? "")}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  placeholder="Your answer"
                />
              ) : null}
            </div>
          );
        })}
        <button type="submit" className="db-submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit feedback"}
        </button>
        {submitting ? (
          <div className="flex justify-center py-4">
            <ErpLoader label="Submitting response…" size={80} />
          </div>
        ) : null}
      </form>
    </FeedbackShell>
  );
}
