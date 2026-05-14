import { Suspense, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { AdminWorkflowRouteSkeleton } from "./route-loading-shell";

/**
 * Single Suspense boundary per route tree segment — do not nest additional Suspense
 * around individual lazy pages; keeps one smooth loading shell for code-split routes.
 */
export function LazyRouteBoundary(): ReactNode {
  return (
    <Suspense fallback={<AdminWorkflowRouteSkeleton />}>
      <Outlet />
    </Suspense>
  );
}
