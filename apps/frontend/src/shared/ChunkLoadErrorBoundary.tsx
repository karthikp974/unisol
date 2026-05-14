import { Component, type ErrorInfo, type ReactNode } from "react";
import { isStaleChunkLoadError, reloadAppForFreshChunks } from "./chunk-load-recovery";

type Props = { children: ReactNode };

type State = { hasFatalError: boolean; fatalMessage: string };

/**
 * Catches render-phase failures from React.lazy (including rejected chunk imports).
 * Stale deployments: recover with a single full reload instead of a blank screen.
 */
export class ChunkLoadErrorBoundary extends Component<Props, State> {
  state: State = { hasFatalError: false, fatalMessage: "" };

  static getDerivedStateFromError(error: unknown): Partial<State> | null {
    if (isStaleChunkLoadError(error)) return null;
    const fatalMessage = error instanceof Error ? error.message : "Something went wrong.";
    return { hasFatalError: true, fatalMessage };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (isStaleChunkLoadError(error)) {
      reloadAppForFreshChunks();
      return;
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("[AppErrorBoundary]", error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.hasFatalError) {
      return (
        <main className="erp-fatal-shell" role="alert">
          <div className="erp-fatal-card">
            <h1 className="erp-fatal-title">This view could not be shown</h1>
            <p className="erp-fatal-text">{this.state.fatalMessage}</p>
            <button type="button" className="db-submit" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
