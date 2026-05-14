import { Bell, Database, GraduationCap, LayoutDashboard, Menu, School, UserRoundCog, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";
import { AdminMenuContent } from "./AdminMenu";

const navItems = [
  { to: "/admin", label: "Admin Portal", icon: LayoutDashboard },
  { to: "/teacher", label: "Teacher Portal", icon: UserRoundCog },
  { to: "/student", label: "Student Portal", icon: GraduationCap },
  { to: "/database", label: "DB Portal", icon: Database }
];

const moduleTitles: Record<string, string> = {
  announcements: "Announcements",
  applications: "Applications",
  batches: "Batches",
  classes: "Classes",
  dashboard: "Dashboard",
  "department-branch": "Department & Branch",
  finance: "Finance",
  "fee-structure": "Fee Structure",
  payments: "Payments",
  feedback: "Feedback",
  promotion: "Promotion",
  reports: "Reports",
  sections: "Sections",
  students: "Students",
  subjects: "Subjects",
  syllabus: "Syllabus",
  teachers: "Teachers"
};

export function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const visibleNavItems = navItems.filter((item) => {
    if (!user) {
      return false;
    }

    if (user.type === "ADMIN") {
      return true;
    }

    if (user.type === "TEACHER") {
      return item.to === "/teacher";
    }

    return item.to === "/student";
  });
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "U";

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("erp.theme");
  }, []);

  async function handleLogout() {
    await logout();
    void navigate("/login", { replace: true });
  }

  const isAdmin = user?.type === "ADMIN";
  const activeModule = new URLSearchParams(location.search).get("module") ?? "";
  const pageTitle =
    location.pathname === "/admin"
      ? "Dashboard"
      : location.pathname === "/admin/modules"
        ? moduleTitles[activeModule] ?? "Management"
        : location.pathname === "/database"
          ? "Database"
          : location.pathname === "/teacher"
            ? "Teacher Portal"
            : location.pathname.startsWith("/student/feedback")
              ? "Feedback"
              : location.pathname === "/student"
                ? "Student Portal"
                : location.pathname.startsWith("/feedback")
                  ? "Feedback"
                  : "ERP Control Center";
  const sidebar = isAdmin ? (
    <AdminMenuContent
      onClose={() => {
        setIsSidebarCollapsed(true);
        setIsMenuOpen(false);
      }}
      onAfterNavigate={() => setIsMenuOpen(false)}
      onSignOut={handleLogout}
    />
  ) : (
    <div className="erp-sidebar-content flex h-full flex-col">
      <div className="erp-brand">
        <div>
          <p className="erp-brand-title">CampusERP</p>
          <p className="erp-brand-subtitle">College management system</p>
        </div>
        <button
          type="button"
          className="erp-sidebar-close"
          onClick={() => {
            setIsSidebarCollapsed(true);
            setIsMenuOpen(false);
          }}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>
      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[#004B8D] p-3">
        <div className="rounded-xl bg-white/15 p-2 text-white shadow-sm">
          <School size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">College ERP</p>
          <p className="text-[11px] text-slate-400">{user ? `${user.fullName} (${user.type})` : "Secure portal"}</p>
        </div>
      </div>
      <nav className="space-y-2">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setIsMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                isActive ? "bg-[#004B8D] text-white shadow-lg shadow-slate-950/20" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button type="button" onClick={() => void handleLogout()} className="erp-signout">
        Sign out
      </button>
    </div>
  );

  return (
    <div className={`erp-shell min-h-screen bg-[#f3f6fb] text-slate-950 transition-colors ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {!isSidebarCollapsed ? (
      <aside className="erp-sidebar fixed inset-y-0 left-0 hidden overflow-y-auto bg-[#1c2737] p-3 shadow-xl lg:block">
        {sidebar}
      </aside>
      ) : null}
      {isMenuOpen ? (
        <div className="erp-mobile-overlay fixed inset-0 z-40 h-screen bg-slate-950/40 lg:hidden" onClick={() => setIsMenuOpen(false)}>
          <aside
            className="erp-mobile-drawer fixed inset-y-0 left-0 h-screen overflow-y-auto bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {sidebar}
          </aside>
        </div>
      ) : null}
      <main className="erp-main">
        <header className="erp-topbar sticky top-0 z-30 border-b border-slate-200 bg-white/95">
          <div className="erp-topbar-inner flex items-center justify-between gap-3">
            <div className="erp-app-header-left">
              <button
                type="button"
                className="erp-menu-toggle"
                onClick={() => {
                  if (window.matchMedia("(min-width: 768px)").matches) {
                    setIsSidebarCollapsed(false);
                  } else {
                    setIsMenuOpen(true);
                  }
                }}
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <img className="erp-header-logo" src="/kiet-logo.png" alt="KIET Group of Institutions" />
              <div className="erp-header-copy">
                <p className="erp-header-title">KIET ERP</p>
                <p className="erp-header-subtitle">Group of Institutions</p>
              </div>
              {location.pathname !== "/admin" ? <span className="erp-page-pill">{pageTitle}</span> : null}
            </div>
            <div className="erp-topbar-actions">
              <button type="button" className="erp-icon-button" aria-label="Notifications">
                <Bell size={20} />
              </button>
              <div className="erp-top-avatar" aria-label="Profile">
                {initials}
              </div>
            </div>
          </div>
        </header>
        <div className="erp-content p-3 sm:p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
