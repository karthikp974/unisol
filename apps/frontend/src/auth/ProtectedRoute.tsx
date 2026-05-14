import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ErpLoader } from "../shared/ErpLoader";
import { useAuth } from "./auth-context";
import { UserType } from "./auth-types";

export function ProtectedRoute({ allowedTypes }: { allowedTypes: UserType[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <ErpLoader fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedTypes.includes(user.type)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
