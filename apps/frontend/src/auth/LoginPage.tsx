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
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
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

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier })
      });
      if (!response.ok) throw new Error("Unable to prepare password reset.");
      const data = (await response.json()) as { message: string; devResetToken?: string };
      if (data.devResetToken) setResetToken(data.devResetToken);
      setMode("reset");
      showToast(data.message, "info");
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : "Unable to prepare password reset.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword })
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(data?.message ?? "Password reset failed.");
      showToast(data?.message ?? "Password updated. Please sign in again.");
      setMode("login");
      setPassword("");
      setNewPassword("");
      setResetToken("");
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : "Password reset failed.";
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

        {mode === "login" ? (
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
          <button
            type="button"
            className="w-full text-center text-sm font-semibold text-blue-700"
            onClick={() => {
              setError(null);
              setMode("forgot");
            }}
          >
            Forgot password?
          </button>
        </form>
        ) : null}

        {mode === "forgot" ? (
          <form className="space-y-5" onSubmit={(event) => void requestReset(event)}>
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

            {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Preparing reset..." : "Continue"}
            </button>
            <button type="button" className="w-full text-center text-sm font-semibold text-slate-600" onClick={() => setMode("login")}>
              Back to login
            </button>
          </form>
        ) : null}

        {mode === "reset" ? (
          <form className="space-y-5" onSubmit={(event) => void resetPassword(event)}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Reset Token</span>
              <input
                value={resetToken}
                onChange={(event) => setResetToken(event.target.value)}
                className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                autoComplete="one-time-code"
                type="text"
                placeholder="Paste reset token"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">New Password</span>
              <input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                autoComplete="new-password"
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
              {isSubmitting ? "Updating password..." : "Reset password"}
            </button>
            <button type="button" className="w-full text-center text-sm font-semibold text-slate-600" onClick={() => setMode("login")}>
              Back to login
            </button>
          </form>
        ) : null}

        <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          Demo admin username is prefilled for local development. Reset tokens are shown only outside production until email/SMS delivery is configured.
        </p>
      </section>
    </main>
  );
}
