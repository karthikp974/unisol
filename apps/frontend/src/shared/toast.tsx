import { ReactNode, useCallback, useMemo, useState } from "react";
import { Toast, ToastContext } from "./toast-context";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-3">
        {toasts.map((toast) => (
          <div key={toast.id} className="overflow-hidden rounded-xl border bg-white shadow-lg">
            <div className="p-4">
              <p className="text-sm font-medium text-slate-900">{toast.message}</p>
            </div>
            <div className={toast.tone === "error" ? "toast-progress-error" : "toast-progress"} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
