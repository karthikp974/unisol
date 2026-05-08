import { ButtonHTMLAttributes, useState } from "react";

type SafeActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  run: () => Promise<void> | void;
  busyLabel?: string;
};

export function SafeActionButton({ run, children, busyLabel = "Working...", className = "", ...props }: SafeActionButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      await run();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      {...props}
      type="button"
      disabled={busy || props.disabled}
      onClick={() => {
        void handleClick();
      }}
      className={`rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {busy ? busyLabel : children}
    </button>
  );
}
