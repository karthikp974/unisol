import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./auth/LoginPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { useAuth } from "./auth/auth-context";
import { getDefaultPortal } from "./auth/portal-redirect";
import { AdminPortal } from "./portals/AdminPortal";
import { DatabasePortal } from "./portals/DatabasePortal";
import { StudentPortal } from "./portals/StudentPortal";
import { TeacherPortal } from "./portals/TeacherPortal";
import { Shell } from "./shared/Shell";

export function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<Shell />}>
        <Route index element={<Navigate to={user ? getDefaultPortal(user.type) : "/login"} replace />} />
        <Route element={<ProtectedRoute allowedTypes={["ADMIN"]} />}>
          <Route path="admin" element={<AdminPortal />} />
          <Route path="database" element={<DatabasePortal />} />
        </Route>
        <Route element={<ProtectedRoute allowedTypes={["ADMIN", "TEACHER"]} />}>
          <Route path="teacher" element={<TeacherPortal />} />
        </Route>
        <Route element={<ProtectedRoute allowedTypes={["ADMIN", "STUDENT"]} />}>
          <Route path="student" element={<StudentPortal />} />
        </Route>
      </Route>
    </Routes>
  );
}
