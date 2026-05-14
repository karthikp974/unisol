/**
 * Detects failed lazy chunk loads (stale cache after deploy, flaky network).
 * Works with Vite/Rollup and webpack-style ChunkLoadError names.
 */
export function isStaleChunkLoadError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error === "string") return matchesChunkMessage(error);
  if (error instanceof Error) {
    if (error.name === "ChunkLoadError") return true;
    if (matchesChunkMessage(error.message)) return true;
  }
  if (typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return matchesChunkMessage((error as { message: string }).message);
  }
  return false;
}

function matchesChunkMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("loading chunk") ||
    m.includes("error loading dynamically imported module") ||
    m.includes("importing a module script failed") ||
    m.includes("failed to load module script") ||
    m.includes("unable to preload css") ||
    m.includes("dynamically imported module")
  );
}

const RELOAD_GUARD_KEY = "erp.chunk-reload-ts";
const RELOAD_DEBOUNCE_MS = 5000;

/** Single hard reload to pick up fresh chunks; debounced to avoid loops if CDN is down. */
export function reloadAppForFreshChunks(): void {
  try {
    const now = Date.now();
    const prev = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || "0");
    if (prev && now - prev < RELOAD_DEBOUNCE_MS) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    /* private mode / blocked storage */
  }
  window.location.reload();
}

/**
 * Catches chunk failures that escape React's tree (e.g. some dynamic import paths).
 * Pair with ChunkLoadErrorBoundary for lazy route coverage.
 */
export function installStaleChunkListeners(): () => void {
  function onWindowError(event: ErrorEvent): void {
    if (isStaleChunkLoadError(event.error) || isStaleChunkLoadError(event.message)) {
      event.preventDefault();
      reloadAppForFreshChunks();
    }
  }
  function onUnhandledRejection(event: PromiseRejectionEvent): void {
    if (isStaleChunkLoadError(event.reason)) {
      event.preventDefault();
      reloadAppForFreshChunks();
    }
  }
  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  return () => {
    window.removeEventListener("error", onWindowError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}
