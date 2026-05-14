import { AlertTriangle, CheckCircle2, Info, Trash2, X } from "lucide-react";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { safeRandomId } from "./safe-random-id";
import { Toast, ToastContext } from "./toast-context";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = safeRandomId("toast");
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="erp-toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`erp-toast erp-toast-${toast.tone}`}>
            <div className="erp-toast-content">
              <span className="erp-toast-icon">{toastIcon(toast.tone)}</span>
              <p>{toast.message}</p>
              <button type="button" aria-label="Close notification" onClick={() => dismissToast(toast.id)}>
                <X size={15} />
              </button>
            </div>
            <div className="toast-progress" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function toastIcon(tone: Toast["tone"]) {
  if (tone === "danger") return <Trash2 size={17} />;
  if (tone === "error" || tone === "warning") return <AlertTriangle size={17} />;
  if (tone === "info") return <Info size={17} />;
  return <CheckCircle2 size={17} />;
}
