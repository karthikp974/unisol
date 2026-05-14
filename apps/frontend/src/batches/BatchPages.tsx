import { ArrowLeft, Bell, Copy, Download, Mail, Phone, Search, Trash2 } from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { AdminWorkflowMenuButton, OptionActionButton } from "../shared/OptionPage";
import { SearchableSelect } from "../shared/SearchableSelect";
import { useToast } from "../shared/toast-context";

type Department = { id: string; name: string; code: string; durationYears: number };
type Branch = { id: string; departmentId: string; name: string; code: string };
type ClassItem = { id: string; name: string; code: string };
type SectionItem = { id: string; classId: string; name: string; code: string };
type StudentRow = { id: string; name: string; rollNumber: string; phone?: string | null; email: string; classSection: string; semester: number; fees: { amount: number; status: "Paid" | "Unpaid" } };
type TeacherRow = { name: string; employeeCode: string };
type BatchItem = {
  id: string;
  departmentId: string;
  branchId: string;
  startYear: number;
  endYear: number;
  batch: string;
  batchCode: string;
  department: Department;
  branch: { id: string; name: string; code: string };
  classes: ClassItem[];
  sections: SectionItem[];
  teachers?: { htpo: TeacherRow[]; ctpo: TeacherRow[]; stpo: TeacherRow[] };
  students?: StudentRow[];
};
type PageResponse<T> = { items: T[]; total: number };

export function BatchesHomePage() {
  const navigate = useNavigate();
  const data = useBatchData();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BatchItem | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelected(null);
    if (!query.trim()) {
      setHasSearched(false);
      return;
    }
    setHasSearched(true);
    await data.searchBatches(query);
  }

  async function selectBatch(batch: BatchItem) {
    setSelected(await data.batchDetails(batch.id));
  }

  return (
    <BatchShell title="Batches" variant="main">
      <form className="db-search-bar" onSubmit={(event) => void search(event)}>
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by Batch ID" />
        <button>Search</button>
      </form>
      {hasSearched && data.batches.length ? (
        <BatchListSection title="Search Results" items={data.batches} onSelect={selectBatch} />
      ) : null}
      {selected ? <BatchDetails batch={selected} onExport={data.downloadExport} /> : null}
      <ActionGroup title="Create Records">
        <GlassButton onClick={() => navigate("/batches/add-batch")}>Add Batch</GlassButton>
      </ActionGroup>
      <ActionGroup title="Batch Records">
        <GlassButton onClick={() => navigate("/batches/modify-batch")}>Modify Batch</GlassButton>
        <GlassButton tone="danger" onClick={() => navigate("/batches/delete-batch")}>Delete Batch</GlassButton>
      </ActionGroup>
      <ActionGroup title="Activity">
        <GlassButton onClick={() => navigate("/batches/history")}>History</GlassButton>
      </ActionGroup>
    </BatchShell>
  );
}

export function AddBatchPage() {
  const data = useBatchData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ departmentId: "", branchId: "", classId: "", sectionId: "", startYear: new Date().getFullYear(), batchCode: "" });
  const selectedDepartment = data.departments.find((item) => item.id === form.departmentId);
  const endYear = form.startYear + (selectedDepartment?.durationYears ?? 0);
  useBatchCascade(data, form, (patch) => setForm((current) => ({ ...current, ...patch })));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await data.sendJson("/api/batches", form);
      showToast("Batch created successfully");
      navigate("/batches");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to create batch", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BatchShell title="Add Batch">
      <form className="db-card db-form" onSubmit={(event) => void submit(event)}>
        <BatchHierarchy data={data} form={form} onChange={(patch) => setForm({ ...form, ...patch })} />
        <Field label="Start Year"><Input type="number" value={String(form.startYear)} onChange={(value) => setForm({ ...form, startYear: Number(value) })} required /></Field>
        <Field label="End Year"><Input value={String(endYear || "")} onChange={() => undefined} readOnly /></Field>
        <Field label="Batch ID / Batch Code"><Input value={form.batchCode} onChange={(batchCode) => setForm({ ...form, batchCode })} required /></Field>
        <Submit saving={saving}>Create Batch</Submit>
      </form>
    </BatchShell>
  );
}

export function ModifyBatchPage() {
  const data = useBatchData();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BatchItem | null>(null);
  const [batchCode, setBatchCode] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (query.trim()) void data.searchBatches(query); }, [query, data]);
  useEffect(() => { if (selected) setBatchCode(selected.batchCode); }, [selected]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      setSelected(await data.sendJson(`/api/batches/${selected.id}`, { batchCode }, "PATCH"));
      showToast("Batch updated successfully");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update batch", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BatchShell title="Modify Batch">
      <SearchInput query={query} setQuery={setQuery} />
      <SuggestionList items={data.batches} onSelect={setSelected} />
      {selected ? (
        <form className="db-card db-form" onSubmit={(event) => void submit(event)}>
          <Field label="Batch Code"><Input value={batchCode} onChange={setBatchCode} required /></Field>
          <Submit saving={saving}>Update Batch</Submit>
        </form>
      ) : null}
    </BatchShell>
  );
}

export function DeleteBatchPage() {
  const data = useBatchData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BatchItem | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  useEffect(() => { if (query.trim()) void data.searchBatches(query); }, [query, data]);

  async function archive() {
    if (!selected) return;
    try {
      await data.sendJson(`/api/batches/${selected.id}`, {}, "DELETE");
      setIsConfirmOpen(false);
      showToast("Batch archived successfully", "danger");
      navigate("/batches");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to archive batch", "error");
    }
  }

  return (
    <BatchShell title="Delete Batch">
      <SearchInput query={query} setQuery={setQuery} />
      <SuggestionList items={data.batches} onSelect={setSelected} />
      {selected ? <div className="db-archive-summary"><div><p>{selected.batch}</p><span>{selected.batchCode}</span></div><button type="button" onClick={() => setIsConfirmOpen(true)}><Trash2 size={18} /> Archive</button></div> : null}
      <ConfirmArchiveDialog
        isOpen={isConfirmOpen}
        title="Archive batch?"
        message="This batch will be hidden from future selections. Existing linked records stay safe."
        itemName={selected ? `${selected.batchCode} - ${selected.batch}` : undefined}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={archive}
      />
    </BatchShell>
  );
}

function BatchDetails({ batch, onExport }: { batch: BatchItem; onExport: (id: string, format: string) => void }) {
  const firstClass = batch.classes[0];
  const firstSection = batch.sections[0];
  return (
    <section className="db-card db-form">
      <div className="db-result-head">
        <div>
          <h2>{batch.batch}</h2>
          <p>{batch.batchCode}</p>
        </div>
        <div className="db-export-actions">
          {["excel", "google-sheets", "csv", "pdf", "docx"].map((format) => <button type="button" key={format} onClick={() => onExport(batch.id, format)}><Download size={14} /> {format}</button>)}
        </div>
      </div>
      <div className="db-detail-grid">
        <Info label="Class Name" value={firstClass?.name ?? "-"} />
        <Info label="Class ID" value={firstClass?.code ?? "-"} />
        <Info label="Section Name" value={firstSection?.name ?? "-"} />
        <Info label="Section ID" value={firstSection?.code ?? "-"} />
        <Info label="Batch" value={batch.batch} />
        <Info label="Batch ID" value={batch.batchCode} />
        <Info label="HTPO names + IDs" value={formatTeachers(batch.teachers?.htpo)} />
        <Info label="CTPO names + IDs" value={formatTeachers(batch.teachers?.ctpo)} />
        <Info label="STPO names + IDs" value={formatTeachers(batch.teachers?.stpo)} />
      </div>
      <div className="admin-table-wrap">
        <table className="db-table">
          <thead><tr><th>Name</th><th>Roll Number</th><th>Phone Number</th><th>Gmail</th><th>Class/Section</th><th>Batch</th><th>Semester (current)</th><th>Fees</th><th>Action</th></tr></thead>
          <tbody>{(batch.students ?? []).map((student) => <StudentRowView key={student.id} student={student} batch={batch.batch} />)}</tbody>
        </table>
      </div>
    </section>
  );
}

function StudentRowView({ batch, student }: { batch: string; student: StudentRow }) {
  const { showToast } = useToast();
  async function copy(value: string, message: string) {
    await navigator.clipboard.writeText(value);
    showToast(message, "info");
  }
  return (
    <tr>
      <td>{student.name}</td><td>{student.rollNumber}</td>
      <td><div className="db-inline-actions"><span>{student.phone ?? "-"}</span>{student.phone ? <><button onClick={() => void copy(student.phone ?? "", "Phone copied")}><Copy size={13} /></button><a href={`tel:${student.phone}`}><Phone size={13} /></a></> : null}</div></td>
      <td><div className="db-inline-actions"><span>{student.email}</span><button onClick={() => void copy(student.email, "Gmail copied")}><Copy size={13} /></button><a href={`mailto:${student.email}`}><Mail size={13} /></a></div></td>
      <td>{student.classSection}</td><td>{batch}</td><td>{student.semester}</td><td>{student.fees.amount}</td><td>{student.fees.status}</td>
    </tr>
  );
}

function useBatchData() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const fetchJson = useCallback(async <T,>(path: string) => {
    const response = await authFetch(path);
    if (!response.ok) throw await responseError(response);
    return (await response.json()) as T;
  }, [authFetch]);
  const sendJson = useCallback(async <T,>(path: string, body: unknown, method = "POST") => {
    const response = await authFetch(path, { method, headers: { "Content-Type": "application/json" }, body: method === "DELETE" ? undefined : JSON.stringify(body) });
    if (!response.ok) throw await responseError(response);
    return (await response.json()) as T;
  }, [authFetch]);
  const loadDepartments = useCallback(async () => setDepartments((await fetchJson<PageResponse<Department>>("/api/departments?pageSize=100")).items), [fetchJson]);
  const loadBranches = useCallback(async (departmentId?: string) => {
    const params = new URLSearchParams({ pageSize: "100" });
    if (departmentId) params.set("departmentId", departmentId);
    setBranches((await fetchJson<PageResponse<Branch>>(`/api/branches?${params}`)).items);
  }, [fetchJson]);
  const loadClasses = useCallback(async (branchId?: string) => {
    const params = new URLSearchParams({ pageSize: "100" });
    if (branchId) params.set("branchId", branchId);
    setClasses((await fetchJson<PageResponse<ClassItem>>(`/api/classes?${params}`)).items);
  }, [fetchJson]);
  const loadSections = useCallback(async (classId?: string) => {
    const params = new URLSearchParams({ pageSize: "100" });
    if (classId) params.set("classId", classId);
    setSections((await fetchJson<PageResponse<SectionItem>>(`/api/sections?${params}`)).items);
  }, [fetchJson]);
  const searchBatches = useCallback(async (search: string) => {
    const params = new URLSearchParams({ pageSize: "20", search });
    setBatches((await fetchJson<PageResponse<BatchItem>>(`/api/batches/search?${params}`)).items);
  }, [fetchJson]);
  const batchDetails = useCallback((id: string) => fetchJson<BatchItem>(`/api/batches/${id}`), [fetchJson]);
  const downloadExport = useCallback((id: string, format: string) => window.open(`/api/batches/${id}/export?format=${format}`, "_blank", "noopener,noreferrer"), []);
  useEffect(() => { void loadDepartments().catch((error) => showToast(error instanceof Error ? error.message : "Unable to load departments", "error")); }, [loadDepartments, showToast]);
  return { departments, branches, classes, sections, batches, sendJson, loadBranches, loadClasses, loadSections, searchBatches, batchDetails, downloadExport };
}

function useBatchCascade(data: ReturnType<typeof useBatchData>, form: { departmentId: string; branchId: string; classId: string; sectionId: string }, patch: (patch: Partial<typeof form>) => void) {
  useEffect(() => {
    if (form.departmentId) {
      void data.loadBranches(form.departmentId);
    } else {
      patch({ branchId: "", classId: "", sectionId: "" });
    }
  }, [form.departmentId, data.loadBranches]);
  useEffect(() => {
    if (form.branchId) {
      void data.loadClasses(form.branchId);
    } else {
      patch({ classId: "", sectionId: "" });
    }
  }, [form.branchId, data.loadClasses]);
  useEffect(() => {
    if (form.classId) {
      void data.loadSections(form.classId);
    } else {
      patch({ sectionId: "" });
    }
  }, [form.classId, data.loadSections]);
}

function BatchHierarchy({ data, form, onChange }: { data: ReturnType<typeof useBatchData>; form: { departmentId: string; branchId: string; classId: string; sectionId: string }; onChange: (patch: Partial<typeof form>) => void }) {
  return (
    <>
      <Field label="Select Department"><SearchableSelect value={form.departmentId} onChange={(departmentId) => onChange({ departmentId, branchId: "", classId: "", sectionId: "" })} options={data.departments.map((item) => [item.id, formatOptionLabel(item.code, item.name)])} placeholder="Select Department" searchable={false} /></Field>
      <Field label="Select Branch"><SearchableSelect value={form.branchId} onChange={(branchId) => onChange({ branchId, classId: "", sectionId: "" })} options={data.branches.map((item) => [item.id, formatOptionLabel(item.code, item.name)])} placeholder="Select Branch" searchable={false} /></Field>
      <Field label="Select Class"><SearchableSelect value={form.classId} onChange={(classId) => onChange({ classId, sectionId: "" })} options={data.classes.map((item) => [item.id, formatOptionLabel(item.code, item.name)])} placeholder="Select Class" searchable={false} /></Field>
      <Field label="Select Section"><SearchableSelect value={form.sectionId} onChange={(sectionId) => onChange({ sectionId })} options={data.sections.map((item) => [item.id, formatOptionLabel(item.code, item.name)])} placeholder="Select Section" searchable={false} /></Field>
    </>
  );
}

function BatchShell({ children, title, variant = "subpage" }: { children: ReactNode; title: string; variant?: "main" | "subpage" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initials = user?.fullName?.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CA";
  return <main className="db-workflow min-h-screen"><header className="db-workflow-header"><div className="db-header-left">{variant === "main" ? <AdminWorkflowMenuButton /> : <button className="db-icon-button" type="button" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>}<h1>{title}</h1></div><div className="db-header-actions">{variant === "main" ? <><button className="db-icon-button" type="button"><Bell size={18} /></button></> : null}<div className="db-avatar">{initials}</div></div></header><section className="db-workflow-body">{children}</section></main>;
}

function SearchInput({ query, setQuery }: { query: string; setQuery: (value: string) => void }) { return <div className="db-search-bar"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by Batch ID" /></div>; }
function SuggestionList({ items, onSelect }: { items: BatchItem[]; onSelect: (item: BatchItem) => void }) { return <div className="db-suggestions">{items.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item)}><strong>{item.batchCode}</strong><span>{item.batch}</span></button>)}</div>; }
function BatchListSection({ items, onSelect, title }: { items: BatchItem[]; onSelect: (item: BatchItem) => void; title: string }) {
  return (
    <section className="db-section">
      <h2>{title}</h2>
      <SuggestionList items={items} onSelect={onSelect} />
    </section>
  );
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
      <section className="erp-confirm-card" aria-modal="true" role="dialog" aria-labelledby="batch-archive-dialog-title">
        <div className="erp-confirm-icon"><Trash2 size={24} /></div>
        <h2 id="batch-archive-dialog-title">{title}</h2>
        <p>{message}</p>
        {itemName ? <strong>{itemName}</strong> : null}
        <div className="erp-confirm-actions">
          <button className="erp-confirm-cancel" type="button" onClick={onCancel}>Cancel</button>
          <button className="erp-confirm-danger" type="button" onClick={() => void onConfirm()}>
            <Trash2 size={16} /> Archive
          </button>
        </div>
      </section>
    </div>
  );
}
function formatOptionLabel(code: string, name: string) {
  return code.replace(/[^A-Z0-9]/gi, "").toUpperCase() === name.replace(/[^A-Z0-9]/gi, "").toUpperCase()
    ? name
    : `${code} - ${name}`;
}
function GlassButton({ children, onClick, tone = "default" }: { children: ReactNode; onClick: () => void; tone?: "default" | "danger" }) {
  return <OptionActionButton tone={tone} onClick={onClick}>{children}</OptionActionButton>;
}
function ActionGroup({ children, title }: { children: ReactNode; title: string }) { return <section className="db-section"><h2>{title}</h2><div className="db-module-grid">{children}</div></section>; }
function Field({ children, label }: { children: ReactNode; label: string }) { return <label className="db-field"><span>{label}</span>{children}</label>; }
function Input({ onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { onChange: (value: string) => void }) { return <input className="db-input" {...props} onChange={(event) => onChange(event.target.value)} />; }
function Submit({ children, saving }: { children: ReactNode; saving: boolean }) { return <button className="db-submit" disabled={saving}>{saving ? "Saving..." : children}</button>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="db-info"><span>{label}</span><strong>{value}</strong></div>; }
function formatTeachers(rows?: TeacherRow[]) { return rows?.map((item) => `${item.name} (${item.employeeCode})`).join(", ") || "-"; }
async function responseError(response: Response) { const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null; const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message; return new Error(message || "Request failed."); }
