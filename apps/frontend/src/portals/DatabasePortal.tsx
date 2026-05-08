import { PageHeader } from "../shared/PageHeader";
import { PortalCard } from "../shared/PortalCard";
import { SafeActionButton } from "../shared/SafeActionButton";
import { useToast } from "../shared/toast-context";

const tables = ["Campuses", "Programs", "Branches", "Batches", "Classes", "Sections", "Users", "Teacher Role Assignments"];

export function DatabasePortal() {
  const { showToast } = useToast();

  return (
    <>
      <PageHeader
        eyebrow="Database portal"
        title="Admin-only data browser"
        description="Clean read-only-first table browser foundation. Search, filters, export, and guarded edits can be added after the database is live."
      />
      <PortalCard title="Core tables" description="These are the Phase 1 foundation tables only. Module tables come later.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tables.map((table) => (
            <button
              key={table}
              type="button"
              onClick={() => showToast(`${table} table selected`, "info")}
              className="rounded-xl border bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:border-blue-200 hover:bg-blue-50"
            >
              {table}
            </button>
          ))}
        </div>
        <div className="mt-5">
          <SafeActionButton run={() => showToast("Database portal access checked")}>
            Check admin-only access
          </SafeActionButton>
        </div>
      </PortalCard>
    </>
  );
}
