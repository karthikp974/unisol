import { ChevronRight, History, Menu, Pencil, Plus, Trash2, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { AdminMenuContent } from "./AdminMenu";

type OptionActionButtonProps = {
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  /** When set, overrides the icon inferred from the label. */
  icon?: LucideIcon;
  /** When set, overrides the description inferred from the label. */
  description?: string;
  /** Highlights the control when it represents the current mode (e.g. workspace tab). */
  active?: boolean;
};

type QuickStat = {
  label: string;
  value: string | number;
};

export function OptionActionButton({ children, onClick, tone = "default", icon: iconOverride, description: descriptionOverride, active }: OptionActionButtonProps) {
  const label = typeof children === "string" ? children : "Open action";
  const inferred = actionMeta(label, tone);
  const Icon = iconOverride ?? inferred.Icon;
  const description = descriptionOverride ?? inferred.description;

  return (
    <button
      className={`db-glass-button${tone === "danger" ? " danger" : ""}${active ? " is-active" : ""}`}
      type="button"
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="db-action-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2.1} />
      </span>
      <span className="db-action-copy">
        <span className="db-action-label">{children}</span>
        <span className="db-action-description">{description}</span>
      </span>
      <ChevronRight className="db-action-chevron" size={18} strokeWidth={2.1} aria-hidden="true" />
    </button>
  );
}

export function QuickStatsBar({ stats }: { stats: QuickStat[] }) {
  return (
    <section className="db-quick-stats" aria-label="Quick stats">
      {stats.map((stat) => (
        <div className="db-quick-stat" key={stat.label}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </div>
      ))}
    </section>
  );
}

export function AdminWorkflowMenuButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    setIsOpen(false);
    await logout();
    void navigate("/login", { replace: true });
  }

  return (
    <>
      <button className="db-icon-button" type="button" onClick={() => setIsOpen(true)} aria-label="Open menu">
        <Menu size={20} />
      </button>
      {isOpen ? (
        <div className="workflow-menu-overlay" onClick={() => setIsOpen(false)}>
          <aside className="workflow-menu-drawer" onClick={(event) => event.stopPropagation()}>
            <AdminMenuContent onClose={() => setIsOpen(false)} onAfterNavigate={() => setIsOpen(false)} onSignOut={handleLogout} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function actionMeta(label: string, tone: "default" | "danger"): { description: string; Icon: LucideIcon } {
  const normalized = label.trim().toLowerCase();
  const entity = label.replace(/^(add|modify|delete)\s+/i, "").toLowerCase();
  if (tone === "danger" || normalized.startsWith("delete")) {
    return { Icon: Trash2, description: `Archive or remove an existing ${entity} record.` };
  }
  if (normalized.startsWith("modify")) {
    return { Icon: Pencil, description: `Review and update existing ${entity} details.` };
  }
  if (normalized.startsWith("add")) {
    return { Icon: Plus, description: `Create a new ${entity} record in KIET ERP.` };
  }
  if (normalized === "history" || normalized.endsWith(" history")) {
    return { Icon: History, description: "View recent activity and audit records." };
  }
  return { Icon: ChevronRight, description: "Open this workspace and continue setup." };
}
