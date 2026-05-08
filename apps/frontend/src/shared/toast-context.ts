import { createContext, useContext } from "react";

export type Toast = {
  id: string;
  message: string;
  tone: "success" | "info" | "error";
};

export type ToastContextValue = {
  showToast: (message: string, tone?: Toast["tone"]) => void;
};

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
