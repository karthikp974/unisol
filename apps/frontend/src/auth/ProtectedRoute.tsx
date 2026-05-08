import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";
import { UserType } from "./auth-types";

export function ProtectedRoute({ allowedTypes }: { allowedTypes: UserType[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border bg-white p-6 text-sm font-medium text-slate-600 shadow-sm">
          Checking secure session...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedTypes.includes(user.type)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
