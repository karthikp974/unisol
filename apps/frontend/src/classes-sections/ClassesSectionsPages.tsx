import { ArrowLeft, Bell, Download, Plus, Search, Trash2 } from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { AdminWorkflowMenuButton, OptionActionButton } from "../shared/OptionPage";
import { SearchableSelect } from "../shared/SearchableSelect";
import { useToast } from "../shared/toast-context";

type Campus = { id: string; code: string; name: string };
type Department = { id: string; campusId: string; name: string; code: string };
type Branch = { id: string; campusId: string; departmentId: string; name: string; code: string };
type SectionRow = { id?: string; name: string; code: string };
type ClassItem = { id: string; campusId: string; departmentId: string; branchId: string; name: string; code: string; sections: SectionRow[]; teachers?: TeacherSummary; students?: StudentRow[] };
type SectionItem = { id: string; classId: string; campusId: string; departmentId: string; branchId: string; name: string; code: string; class: { id: string; name: string; code: string } };
type TeacherSummary = { htpo: string[]; ctpo: string[]; stpo: string[] };
type StudentRow = { id: string; fullName: string; rollNumber: string };
type PageResponse<T> = { items: T[]; total: number };

const emptySection = (): SectionRow => ({ name: "", code: "" });

export function ClassesSectionsHomePage() {
  const navigate = useNavigate();
  const { classes, searchClasses, classDetails, downloadExport } = useClassesSectionsData();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClassItem | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelected(null);
    if (!search.trim()) {
      setHasSearched(false);
      return;
    }
    setHasSearched(true);
    await searchClasses(search);
  }

  async function selectClass(item: ClassItem) {
    setSelected(await classDetails(item.id));
  }

  return (
    <WorkflowShell title="Classes & Sections" variant="main">
      <form className="db-search-bar" onSubmit={(event) => void submitSearch(event)}>
        <Search size={18} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search class name, class code, section name, or section code" />
        <button>Search</button>
      </form>
      {hasSearched && classes.length ? <SuggestionList items={classes} onSelect={selectClass} /> : null}
      {selected ? <ClassResult item={selected} onExport={downloadExport} /> : null}

      <ActionGroup title="Create Records">
        <GlassButton onClick={() => navigate("/classes-sections/add-class")}>Add Class</GlassButton>
        <GlassButton onClick={() => navigate("/classes-sections/add-section")}>Add Section</GlassButton>
      </ActionGroup>
      <ActionGroup title="Class">
        <GlassButton onClick={() => navigate("/classes-sections/modify-class")}>Modify Class</GlassButton>
        <GlassButton tone="danger" onClick={() => navigate("/classes-sections/delete-class")}>Delete Class</GlassButton>
      </ActionGroup>
      <ActionGroup title="Section">
        <GlassButton onClick={() => navigate("/classes-sections/modify-section")}>Modify Section</GlassButton>
        <GlassButton tone="danger" onClick={() => navigate("/classes-sections/delete-section")}>Delete Section</GlassButton>
      </ActionGroup>
      <ActionGroup title="Activity">
        <GlassButton onClick={() => navigate("/classes-sections/history")}>History</GlassButton>
      </ActionGroup>
    </WorkflowShell>
  );
}

export function AddClassPage() {
  const data = useClassesSectionsData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ campusId: "", departmentId: "", branchId: "", name: "", code: "", sections: [emptySection()] });
  useCascadingLoad(data, form.campusId, form.departmentId, form.branchId, (patch) => setForm((current) => ({ ...current, ...patch })));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await data.sendJson("/api/classes", form);
      showToast("Class created successfully");
      navigate("/classes-sections");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to create class", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WorkflowShell title="Add Class">
      <form className="db-card db-form" onSubmit={(event) => void submit(event)}>
        <HierarchySelects data={data} value={form} onChange={(patch) => setForm({ ...form, ...patch })} />
        <Field label="Class Name"><Input value={form.name} onChange={(name) => setForm({ ...form, name })} required /></Field>
        <Field label="Class Code"><Input value={form.code} onChange={(code) => setForm({ ...form, code })} required /></Field>
        <SectionRows sections={form.sections} onChange={(sections) => setForm({ ...form, sections })} />
        <Submit isSaving={isSaving}>Create Class</Submit>
      </form>
    </WorkflowShell>
  );
}

export function AddSectionPage() {
  const data = useClassesSectionsData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ campusId: "", departmentId: "", branchId: "", classId: "", sections: [emptySection()] });
  useCascadingLoad(data, form.campusId, form.departmentId, form.branchId, (patch) => setForm((current) => ({ ...current, ...patch })), true);

  useEffect(() => {
    setForm((current) => current.classId && !data.classes.some((item) => item.id === current.classId) ? { ...current, classId: "" } : current);
  }, [data.classes]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await data.sendJson("/api/sections", { classId: form.classId, sections: form.sections });
      showToast("Section created successfully");
      navigate("/classes-sections");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to create section", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WorkflowShell title="Add Section">
      <form className="db-card db-form" onSubmit={(event) => void submit(event)}>
        <HierarchySelects data={data} value={form} onChange={(patch) => setForm({ ...form, ...patch })} includeClass classId={form.classId} onClass={(classId) => setForm({ ...form, classId })} />
        <SectionRows sections={form.sections} onChange={(sections) => setForm({ ...form, sections })} />
        <Submit isSaving={isSaving}>Create Sections</Submit>
      </form>
    </WorkflowShell>
  );
}

export function ModifyClassPage() {
  const data = useClassesSectionsData();
  const { showToast } = useToast();
  const [selection, setSelection] = useState({ campusId: "", departmentId: "", branchId: "", classId: "" });
  const [selected, setSelected] = useState<ClassItem | null>(null);
  const [form, setForm] = useState({ name: "", code: "", sections: [] as SectionRow[] });
  const [isSaving, setIsSaving] = useState(false);
  useCascadingLoad(data, selection.campusId, selection.departmentId, selection.branchId, (patch) => setSelection((current) => ({ ...current, ...patch })), true);
  useEffect(() => {
    if (!selection.classId) {
      setSelected(null);
      return;
    }
    void data.classDetails(selection.classId).then(setSelected).catch((error) => showToast(error instanceof Error ? error.message : "Unable to load class", "error"));
  }, [selection.classId, data.classDetails, showToast]);
  useEffect(() => { if (selected) setForm({ name: selected.name, code: selected.code, sections: selected.sections.length ? selected.sections : [emptySection()] }); }, [selected]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setIsSaving(true);
    try {
      setSelected(await data.sendJson(`/api/classes/${selected.id}`, form, "PATCH"));
      showToast("Class updated successfully");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update class", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WorkflowShell title="Modify Class">
      <form className="db-card db-form" onSubmit={(event) => void save(event)}>
        <HierarchySelects
          data={data}
          value={selection}
          onChange={(patch) => setSelection({ ...selection, ...patch })}
          includeClass
          classId={selection.classId}
          onClass={(classId) => setSelection({ ...selection, classId })}
        />
        {selected ? (
          <>
            <Field label="Class Name"><Input value={form.name} onChange={(name) => setForm({ ...form, name })} required /></Field>
            <Field label="Class Code"><Input value={form.code} onChange={(code) => setForm({ ...form, code })} required /></Field>
            <SectionRows sections={form.sections} onChange={(sections) => setForm({ ...form, sections })} />
            <Submit isSaving={isSaving}>Update Class</Submit>
          </>
        ) : <EmptyState>Select a class to modify.</EmptyState>}
      </form>
    </WorkflowShell>
  );
}

export function DeleteClassPage() {
  const data = useClassesSectionsData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selection, setSelection] = useState({ campusId: "", departmentId: "", branchId: "", classId: "" });
  const [selected, setSelected] = useState<ClassItem | null>(null);
  useCascadingLoad(data, selection.campusId, selection.departmentId, selection.branchId, (patch) => setSelection((current) => ({ ...current, ...patch })), true);
  useEffect(() => {
    if (!selection.classId) {
      setSelected(null);
      return;
    }
    void data.classDetails(selection.classId).then(setSelected).catch((error) => showToast(error instanceof Error ? error.message : "Unable to load class", "error"));
  }, [selection.classId, data.classDetails, showToast]);

  async function archive() {
    if (!selected || !window.confirm("Archive this class and all linked sections?")) return;
    try {
      await data.sendJson(`/api/classes/${selected.id}`, {}, "DELETE");
      showToast("Class archived successfully", "warning");
      navigate("/classes-sections");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to archive class", "error");
    }
  }

  return (
    <WorkflowShell title="Delete Class">
      <div className="db-card db-form">
        <HierarchySelects
          data={data}
          value={selection}
          onChange={(patch) => setSelection({ ...selection, ...patch })}
          includeClass
          classId={selection.classId}
          onClass={(classId) => setSelection({ ...selection, classId })}
        />
        {selected ? <ArchiveBox title={selected.name} code={selected.code} details={selected.sections.map((section) => `${section.code} - ${section.name}`)} onArchive={archive} /> : <EmptyState>Select a class to archive.</EmptyState>}
      </div>
    </WorkflowShell>
  );
}

export function ModifySectionPage() {
  return <SectionEditPage mode="modify" />;
}

export function DeleteSectionPage() {
  return <SectionEditPage mode="delete" />;
}

function SectionEditPage({ mode }: { mode: "modify" | "delete" }) {
  const data = useClassesSectionsData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selection, setSelection] = useState({ campusId: "", departmentId: "", branchId: "", classId: "", sectionId: "" });
  const [selected, setSelected] = useState<SectionItem | null>(null);
  const [form, setForm] = useState({ name: "", code: "" });
  const [isSaving, setIsSaving] = useState(false);

  useCascadingLoad(data, selection.campusId, selection.departmentId, selection.branchId, (patch) => setSelection((current) => ({ ...current, ...patch })), true);
  useEffect(() => {
    if (selection.classId) {
      void data.loadSections(selection.classId);
    } else {
      setSelection((current) => ({ ...current, sectionId: "" }));
      setSelected(null);
    }
  }, [selection.classId, data.loadSections]);
  useEffect(() => {
    setSelected(data.sections.find((item) => item.id === selection.sectionId) ?? null);
  }, [data.sections, selection.sectionId]);
  useEffect(() => { if (selected) setForm({ name: selected.name, code: selected.code }); }, [selected]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setIsSaving(true);
    try {
      setSelected(await data.sendJson(`/api/sections/${selected.id}`, form, "PATCH"));
      showToast("Section updated successfully");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update section", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function archive() {
    if (!selected || !window.confirm("Archive this section?")) return;
    try {
      await data.sendJson(`/api/sections/${selected.id}`, {}, "DELETE");
      showToast("Section archived successfully", "warning");
      navigate("/classes-sections");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to archive section", "error");
    }
  }

  return (
    <WorkflowShell title={mode === "modify" ? "Modify Section" : "Delete Section"}>
      <div className="db-card db-form">
        <HierarchySelects
          data={data}
          value={selection}
          onChange={(patch) => setSelection({ ...selection, ...patch, sectionId: "" })}
          includeClass
          classId={selection.classId}
          onClass={(classId) => setSelection({ ...selection, classId, sectionId: "" })}
        />
        <Field label="Select Section">
          <SearchableSelect
            value={selection.sectionId}
            onChange={(sectionId) => setSelection({ ...selection, sectionId })}
            options={data.sections.map((item) => [item.id, formatOptionLabel(item.code, item.name)])}
            placeholder="Select Section"
            searchable={false}
          />
        </Field>
      {selected && mode === "modify" ? (
        <form className="db-form" onSubmit={(event) => void save(event)}>
          <Field label="Section Name"><Input value={form.name} onChange={(name) => setForm({ ...form, name })} required /></Field>
          <Field label="Section Code"><Input value={form.code} onChange={(code) => setForm({ ...form, code })} required /></Field>
          <Submit isSaving={isSaving}>Update Section</Submit>
        </form>
      ) : null}
        {selected && mode === "delete" ? <ArchiveBox title={selected.name} code={selected.code} onArchive={archive} /> : null}
        {!selected ? <EmptyState>Select a section to {mode === "modify" ? "modify" : "archive"}.</EmptyState> : null}
      </div>
    </WorkflowShell>
  );
}

function SearchEditClass({ title, query, setQuery, data, selected, setSelected, form, setForm, onSubmit, isSaving }: {
  title: string; query: string; setQuery: (value: string) => void; data: ReturnType<typeof useClassesSectionsData>; selected: ClassItem | null; setSelected: (item: ClassItem) => void; form: { name: string; code: string; sections: SectionRow[] }; setForm: (value: { name: string; code: string; sections: SectionRow[] }) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; isSaving: boolean;
}) {
  useEffect(() => { if (query.trim()) void data.searchClasses(query); }, [query, data]);
  return (
    <WorkflowShell title={title}>
      <SearchInput query={query} setQuery={setQuery} placeholder="Search class name or code" />
      <SuggestionList items={data.classes} onSelect={setSelected} />
      {selected ? (
        <form className="db-card db-form" onSubmit={(event) => void onSubmit(event)}>
          <Field label="Class Name"><Input value={form.name} onChange={(name) => setForm({ ...form, name })} required /></Field>
          <Field label="Class Code"><Input value={form.code} onChange={(code) => setForm({ ...form, code })} required /></Field>
          <SectionRows sections={form.sections} onChange={(sections) => setForm({ ...form, sections })} />
          <Submit isSaving={isSaving}>Update Class</Submit>
        </form>
      ) : null}
    </WorkflowShell>
  );
}

function useClassesSectionsData() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);

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

  const loadCampuses = useCallback(async () => setCampuses((await fetchJson<PageResponse<Campus>>("/api/campuses?pageSize=100")).items), [fetchJson]);
  const loadDepartments = useCallback(async (campusId?: string) => {
    const params = new URLSearchParams({ pageSize: "100" });
    if (campusId) params.set("campusId", campusId);
    setDepartments((await fetchJson<PageResponse<Department>>(`/api/departments?${params}`)).items);
  }, [fetchJson]);
  const loadBranches = useCallback(async (campusId?: string, departmentId?: string) => {
    const params = new URLSearchParams({ pageSize: "100" });
    if (campusId) params.set("campusId", campusId);
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
  const searchClasses = useCallback(async (search: string) => {
    const params = new URLSearchParams({ pageSize: "20", search });
    setClasses((await fetchJson<PageResponse<ClassItem>>(`/api/classes/search?${params}`)).items);
  }, [fetchJson]);
  const searchSections = useCallback(async (search: string) => {
    const params = new URLSearchParams({ pageSize: "20", search });
    setSections((await fetchJson<PageResponse<SectionItem>>(`/api/sections/search?${params}`)).items);
  }, [fetchJson]);
  const classDetails = useCallback((id: string) => fetchJson<ClassItem>(`/api/classes/${id}`), [fetchJson]);
  const downloadExport = useCallback((id: string, format: string) => {
    window.open(`/api/classes/${id}/export?format=${format}`, "_blank", "noopener,noreferrer");
  }, []);

  useEffect(() => { void loadCampuses().catch((error) => showToast(error instanceof Error ? error.message : "Unable to load campuses", "error")); }, [loadCampuses, showToast]);

  return { campuses, departments, branches, classes, sections, sendJson, loadDepartments, loadBranches, loadClasses, loadSections, searchClasses, searchSections, classDetails, downloadExport };
}

function useCascadingLoad(data: ReturnType<typeof useClassesSectionsData>, campusId: string, departmentId: string, branchId: string, setPatch: (patch: Partial<{ campusId: string; departmentId: string; branchId: string }>) => void, includeClass = false) {
  useEffect(() => {
    if (campusId) {
      void data.loadDepartments(campusId);
    } else {
      setPatch({ departmentId: "", branchId: "" });
    }
  }, [campusId, data.loadDepartments]);
  useEffect(() => {
    if (campusId && departmentId) {
      void data.loadBranches(campusId, departmentId);
    } else {
      setPatch({ branchId: "" });
    }
  }, [campusId, departmentId, data.loadBranches]);
  useEffect(() => {
    if (includeClass && branchId) void data.loadClasses(branchId);
  }, [branchId, includeClass, data.loadClasses]);
}

function WorkflowShell({ children, title, variant = "subpage" }: { children: ReactNode; title: string; variant?: "main" | "subpage" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initials = user?.fullName?.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CA";
  return (
    <main className="db-workflow min-h-screen">
      <header className="db-workflow-header">
        <div className="db-header-left">
          {variant === "main" ? <AdminWorkflowMenuButton /> : <button className="db-icon-button" type="button" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>}
          <h1>{title}</h1>
        </div>
        <div className="db-header-actions">
          {variant === "main" ? <><button className="db-icon-button" type="button"><Bell size={18} /></button></> : null}
          <div className="db-avatar">{initials}</div>
        </div>
      </header>
      <section className="db-workflow-body">{children}</section>
    </main>
  );
}

function HierarchySelects({ data, value, onChange, includeClass, classId, onClass }: { data: ReturnType<typeof useClassesSectionsData>; value: { campusId: string; departmentId: string; branchId: string }; onChange: (patch: Partial<{ campusId: string; departmentId: string; branchId: string }>) => void; includeClass?: boolean; classId?: string; onClass?: (id: string) => void }) {
  return (
    <>
      <Field label="Select Campus"><SearchableSelect value={value.campusId} onChange={(campusId) => { onClass?.(""); onChange({ campusId, departmentId: "", branchId: "" }); }} options={data.campuses.map((item) => [item.id, item.code])} placeholder="Select Campus" searchable={false} /></Field>
      <Field label="Select Department"><SearchableSelect value={value.departmentId} onChange={(departmentId) => { onClass?.(""); onChange({ departmentId, branchId: "" }); }} options={data.departments.map((item) => [item.id, formatOptionLabel(item.code, item.name)])} placeholder="Select Department" searchable={false} /></Field>
      <Field label="Select Branch"><SearchableSelect value={value.branchId} onChange={(branchId) => { onClass?.(""); onChange({ branchId }); }} options={data.branches.map((item) => [item.id, formatOptionLabel(item.code, item.name)])} placeholder="Select Branch" searchable={false} /></Field>
      {includeClass ? <Field label="Select Class"><SearchableSelect value={classId ?? ""} onChange={(id) => onClass?.(id)} options={data.classes.map((item) => [item.id, formatOptionLabel(item.code, item.name)])} placeholder="Select Class" searchable={false} /></Field> : null}
    </>
  );
}

function SectionRows({ sections, onChange }: { sections: SectionRow[]; onChange: (sections: SectionRow[]) => void }) {
  const update = (index: number, key: "name" | "code", value: string) => onChange(sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, [key]: value } : section));
  return (
    <section className="db-branch-rows">
      <div className="db-branch-header"><h2>Dynamic Sections Area</h2><button type="button" onClick={() => onChange([...sections, emptySection()])}><Plus size={16} /> Add Section</button></div>
      {sections.map((section, index) => (
        <div className="db-branch-row" key={section.id ?? index}>
          <Field label="Section Name"><Input value={section.name} onChange={(value) => update(index, "name", value)} /></Field>
          <Field label="Section Code"><Input value={section.code} onChange={(value) => update(index, "code", value)} /></Field>
          {sections.length > 1 ? <button type="button" className="db-row-remove" onClick={() => onChange(sections.filter((_, sectionIndex) => sectionIndex !== index))}>Remove</button> : null}
        </div>
      ))}
    </section>
  );
}

function SearchInput({ query, setQuery, placeholder }: { query: string; setQuery: (value: string) => void; placeholder: string }) {
  return <div className="db-search-bar"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} /></div>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="db-empty">{children}</p>;
}

function SuggestionList<T extends { id: string; name: string; code: string }>({ items, onSelect }: { items: T[]; onSelect: (item: T) => void }) {
  return <div className="db-suggestions">{items.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item)}><strong>{item.name}</strong><span>{item.code}</span></button>)}</div>;
}

function formatOptionLabel(code: string, name: string) {
  return code.replace(/[^A-Z0-9]/gi, "").toUpperCase() === name.replace(/[^A-Z0-9]/gi, "").toUpperCase()
    ? name
    : `${code} - ${name}`;
}

function ClassResult({ item, onExport }: { item: ClassItem; onExport: (id: string, format: string) => void }) {
  return (
    <section className="db-card db-form">
      <div className="db-result-head">
        <div><h2>{item.name}</h2><p>{item.code}</p></div>
        <div className="db-export-actions">{["excel", "google-sheets", "pdf", "docx"].map((format) => <button key={format} type="button" onClick={() => onExport(item.id, format)}><Download size={14} /> {format}</button>)}</div>
      </div>
      <p className="db-empty">Sections: {item.sections.map((section) => `${section.code} - ${section.name}`).join(", ") || "-"}</p>
      <p className="db-empty">HTPO: {item.teachers?.htpo.join(", ") || "-"}</p>
      <p className="db-empty">CTPO: {item.teachers?.ctpo.join(", ") || "-"}</p>
      <p className="db-empty">STPO: {item.teachers?.stpo.join(", ") || "-"}</p>
      <table className="db-table"><thead><tr><th>Student Name</th><th>Roll Number</th></tr></thead><tbody>{(item.students ?? []).map((student) => <tr key={student.id}><td>{student.fullName}</td><td>{student.rollNumber}</td></tr>)}</tbody></table>
    </section>
  );
}

function ActionGroup({ children, title }: { children: ReactNode; title: string }) { return <section className="db-section"><h2>{title}</h2><div className="db-module-grid">{children}</div></section>; }
function GlassButton({ children, onClick, tone = "default" }: { children: ReactNode; onClick: () => void; tone?: "default" | "danger" }) {
  return <OptionActionButton tone={tone} onClick={onClick}>{children}</OptionActionButton>;
}
function Field({ children, label }: { children: ReactNode; label: string }) { return <label className="db-field"><span>{label}</span>{children}</label>; }
function Input({ onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { onChange: (value: string) => void }) { return <input className="db-input" {...props} onChange={(event) => onChange(event.target.value)} />; }
function Submit({ children, isSaving }: { children: ReactNode; isSaving: boolean }) { return <button className="db-submit" disabled={isSaving}>{isSaving ? "Saving..." : children}</button>; }
function ArchiveBox({ code, details = [], onArchive, title }: { title: string; code: string; details?: string[]; onArchive: () => Promise<void> }) { return <div className="db-archive-summary"><div><p>{title}</p><span>{code}</span>{details.map((item) => <span key={item}>{item}</span>)}</div><button type="button" onClick={() => void onArchive()}><Trash2 size={18} /> Archive</button></div>; }

async function responseError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
  return new Error(message || "Request failed.");
}
