import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../auth/auth-context";
import { SafeActionButton } from "../shared/SafeActionButton";
import { SearchableSelect } from "../shared/SearchableSelect";
import { useToast } from "../shared/toast-context";
import { PaginatedResponse } from "../structure/structure-types";

type ApplicationCategory = "GENERAL" | "ATTENDANCE" | "FEES" | "RESULTS" | "CERTIFICATE" | "LEAVE" | "OTHER";
type ApplicationStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "CLOSED";
type StudentApplication = {
  id: string;
  category: ApplicationCategory;
  subject: string;
  message: string;
  status: ApplicationStatus;
  response?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  student: { id: string; rollNumber: string; fullName: string; section: string; semester: number };
};

const inputClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const categories: ApplicationCategory[] = ["GENERAL", "ATTENDANCE", "FEES", "RESULTS", "CERTIFICATE", "LEAVE", "OTHER"];
const reviewStatuses: ApplicationStatus[] = ["IN_REVIEW", "APPROVED", "REJECTED", "CLOSED"];

function useApi() {
  const { authFetch } = useAuth();

  async function fetchJson<T>(path: string) {
    const response = await authFetch(path);
    if (!response.ok) throw new Error(`Request failed: ${path}`);
    return (await response.json()) as T;
  }

  async function sendJson<T>(path: string, body: unknown, method = "POST") {
    const response = await authFetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "Application action failed.");
    }
    return (await response.json().catch(() => ({}))) as T;
  }

  return { fetchJson, sendJson };
}

export function AdminApplicationsPanel() {
  return <ReviewerApplicationsPanel title="Application Review" description="Review student applications across campus scopes." />;
}

export function TeacherApplicationsPanel() {
  return <ReviewerApplicationsPanel title="Scoped Student Applications" description="Review applications for your assigned class/section scope." />;
}

function ReviewerApplicationsPanel({ title, description }: { title: string; description: string }) {
  const { fetchJson, sendJson } = useApi();
  const { showToast } = useToast();
  const [items, setItems] = useState<StudentApplication[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [review, setReview] = useState({ id: "", status: "IN_REVIEW" as ApplicationStatus, response: "" });

  async function load() {
    const params = new URLSearchParams({ pageSize: "25" });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    const page = await fetchJson<PaginatedResponse<StudentApplication>>(`/api/applications?${params.toString()}`);
    setItems(page.items);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error) => showToast(error instanceof Error ? error.message : "Unable to load applications", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reviewApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review.id) return;
    await sendJson(`/api/applications/${review.id}/review`, { status: review.status, response: review.response || undefined }, "PATCH");
    setReview({ id: "", status: "IN_REVIEW", response: "" });
    await load();
    showToast("Application updated");
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <SafeActionButton run={() => load().then(() => showToast("Applications refreshed"))}>Refresh</SafeActionButton>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SearchableSelect value={status} options={[{ value: "", label: "All statuses" }, ...["PENDING", ...reviewStatuses].map((item) => ({ value: item, label: item }))]} onChange={setStatus} required={false} clearable searchable={false} />
        <input className={inputClass} placeholder="Search subject or student" value={search} onChange={(event) => setSearch(event.target.value)} />
        <SafeActionButton run={load}>Apply Filters</SafeActionButton>
      </div>
      <ApplicationList items={items} onSelect={(item) => setReview({ id: item.id, status: item.status === "PENDING" ? "IN_REVIEW" : item.status, response: item.response ?? "" })} />
      <form className="mt-4 grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-4" onSubmit={(event) => void reviewApplication(event)}>
        <SearchableSelect value={review.id} placeholder="Select application" options={items.map((item) => [item.id, `${item.student.rollNumber} - ${item.subject}`])} onChange={(id) => setReview({ ...review, id })} required searchable={false} />
        <SearchableSelect value={review.status} options={reviewStatuses.map((item) => [item, item])} onChange={(status) => setReview({ ...review, status: status as ApplicationStatus })} searchable={false} />
        <input className={inputClass} placeholder="Response / note" value={review.response} onChange={(event) => setReview({ ...review, response: event.target.value })} />
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Update Application</button>
      </form>
    </section>
  );
}

export function StudentApplicationsPanel() {
  const { fetchJson, sendJson } = useApi();
  const { showToast } = useToast();
  const [items, setItems] = useState<StudentApplication[]>([]);
  const [form, setForm] = useState({ category: "GENERAL" as ApplicationCategory, subject: "", message: "" });

  async function load() {
    const page = await fetchJson<PaginatedResponse<StudentApplication>>("/api/applications/me?pageSize=25");
    setItems(page.items);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error) => showToast(error instanceof Error ? error.message : "Unable to load applications", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendJson("/api/applications", form);
    setForm({ category: "GENERAL", subject: "", message: "" });
    await load();
    showToast("Application submitted");
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">My Applications</h2>
          <p className="text-sm text-slate-500">Submit requests and track their status.</p>
        </div>
        <SafeActionButton run={() => load().then(() => showToast("Applications refreshed"))}>Refresh</SafeActionButton>
      </div>
      <form className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-4" onSubmit={(event) => void submitApplication(event)}>
        <SearchableSelect value={form.category} options={categories.map((item) => [item, item])} onChange={(category) => setForm({ ...form, category: category as ApplicationCategory })} searchable={false} />
        <input className={inputClass} placeholder="Subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required />
        <textarea className={`${inputClass} md:col-span-2`} placeholder="Explain your request" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required />
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white md:col-span-4">Submit Application</button>
      </form>
      <ApplicationList items={items} />
    </section>
  );
}

function ApplicationList({ items, onSelect }: { items: StudentApplication[]; onSelect?: (item: StudentApplication) => void }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border">
      <table className="min-w-full divide-y text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Student</th>
            <th className="px-3 py-2">Application</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Response</th>
            {onSelect ? <th className="px-3 py-2">Action</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-2 font-medium">{item.student.rollNumber}<br /><span className="text-xs text-slate-500">{item.student.fullName} - {item.student.section}</span></td>
              <td className="px-3 py-2"><span className="text-xs font-bold text-blue-700">{item.category}</span><br />{item.subject}<br /><span className="text-xs text-slate-500">{item.message}</span></td>
              <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{item.status}</span></td>
              <td className="px-3 py-2">{item.response ?? "-"}<br /><span className="text-xs text-slate-500">{item.reviewedBy ? `By ${item.reviewedBy}` : ""}</span></td>
              {onSelect ? <td className="px-3 py-2"><button type="button" className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700" onClick={() => onSelect(item)}>Review</button></td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? <p className="p-4 text-sm text-slate-500">No applications found.</p> : null}
    </div>
  );
}
