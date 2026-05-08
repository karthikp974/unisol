import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { School } from "lucide-react";
import { useAuth } from "./auth-context";
import { getDefaultPortal } from "./portal-redirect";
import { useToast } from "../shared/toast-context";

export function LoginPage() {
  const { user, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("admin");
  const [password, setPassword] = useState("Admin@12345");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={getDefaultPortal(user.type)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const loggedInUser = await login(identifier, password);
      showToast(`Welcome ${loggedInUser.fullName}`);
      void navigate(getDefaultPortal(loggedInUser.type), { replace: true });
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Login failed.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <section className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-600 p-3 text-white">
            <School size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950">College ERP Login</h1>
            <p className="text-sm text-slate-500">Secure access for Admin, Teacher, and Student portals.</p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Roll Number / Employee Code</span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              autoComplete="username"
              type="text"
              placeholder="admin / teacher employee code / student roll number"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              autoComplete="current-password"
              type="password"
              required
            />
          </label>

          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          Demo admin username is prefilled for local development. Change this password before production.
        </p>
      </section>
    </main>
  );
}
