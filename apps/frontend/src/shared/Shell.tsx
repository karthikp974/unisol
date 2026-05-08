import { Database, GraduationCap, LayoutDashboard, School, UserRoundCog } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";

const navItems = [
  { to: "/admin", label: "Admin Portal", icon: LayoutDashboard },
  { to: "/teacher", label: "Teacher Portal", icon: UserRoundCog },
  { to: "/student", label: "Student Portal", icon: GraduationCap },
  { to: "/database", label: "DB Portal", icon: Database }
];

export function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  async function handleLogout() {
    await logout();
    void navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-white p-5 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 text-white">
            <School size={24} />
          </div>
          <div>
            <p className="text-lg font-bold">College ERP</p>
            <p className="text-xs text-slate-500">{user ? `${user.fullName} (${user.type})` : "Secure portal"}</p>
          </div>
        </div>
        <nav className="space-y-2">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-8 w-full rounded-xl border px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Logout
        </button>
      </aside>
      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
