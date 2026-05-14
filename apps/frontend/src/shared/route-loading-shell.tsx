import type { ReactNode } from "react";

type ShellProps = {
  /** Short line under the skeleton (e.g. recovery message). */
  caption?: string;
};

/**
 * Mirrors loaded admin UX: Shell-like top strip (grey placeholders only), then workflow header,
 * step chips, and one form card — neutral greys, no brand colour blocks.
 */
export function AdminWorkflowRouteSkeleton({ caption }: ShellProps): ReactNode {
  return (
    <div className="erp-route-skeleton" aria-busy="true" aria-label="Loading page">
      <div className="erp-route-skeleton-shelltop" aria-hidden="true">
        <span className="erp-skel-block erp-skel-sq" />
        <span className="erp-skel-block erp-skel-logo" />
        <span className="erp-skel-block erp-skel-brandline" />
        <span className="erp-skel-block erp-skel-pill" />
        <span className="erp-skel-block erp-skel-sq erp-skel-push-end" />
        <span className="erp-skel-block erp-skel-avatar-sm" />
      </div>
      <div className="erp-route-skeleton-workflow">
        <header className="erp-route-skeleton-wfheader" aria-hidden="true">
          <span className="erp-skel-block erp-skel-sq" />
          <span className="erp-skel-block erp-skel-wf-title" />
          <span className="erp-skel-block erp-skel-avatar-sm erp-skel-push-end" />
        </header>
        <div className="erp-route-skeleton-steps" aria-hidden="true">
          <span className="erp-skel-block erp-skel-chip" />
          <span className="erp-skel-block erp-skel-chip" />
          <span className="erp-skel-block erp-skel-chip" />
          <span className="erp-skel-block erp-skel-chip" />
        </div>
        <section className="erp-route-skeleton-card">
          <span className="erp-skel-block erp-skel-line erp-skel-w-40" />
          <span className="erp-skel-block erp-skel-line erp-skel-w-full" />
          <div className="erp-route-skeleton-grid erp-route-skeleton-grid-stack">
            <span className="erp-skel-block erp-skel-field" />
            <span className="erp-skel-block erp-skel-field" />
            <span className="erp-skel-block erp-skel-field" />
            <span className="erp-skel-block erp-skel-field" />
          </div>
          <div className="erp-route-skeleton-actions">
            <span className="erp-skel-block erp-skel-btn" />
            <span className="erp-skel-block erp-skel-btn" />
          </div>
        </section>
      </div>
      {caption ? <p className="erp-route-skeleton-caption">{caption}</p> : null}
    </div>
  );
}
