import { useEffect } from "react";
import { installStaleChunkListeners } from "./chunk-load-recovery";

/** Registers global listeners for chunk load failures outside React render. */
export function useChunkLoadRecovery(): void {
  useEffect(() => installStaleChunkListeners(), []);
}
