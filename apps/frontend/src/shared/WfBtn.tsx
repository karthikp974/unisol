import { ButtonHTMLAttributes } from "react";

type WfBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

/** Plain institutional action (no glass row / chevron / inferred description). */
export function WfBtn({ children, variant = "secondary", className = "", type = "button", ...rest }: WfBtnProps) {
  const v =
    variant === "primary" ? "db-wf-btn db-wf-btn--primary" : variant === "danger" ? "db-wf-btn db-wf-btn--danger" : "db-wf-btn";
  return (
    <button type={type} className={`${v} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
