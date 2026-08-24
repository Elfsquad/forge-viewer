import { ElfsquadForgeViewer } from "./elfsquad-forge-viewer";
export { ElfsquadForgeViewer } from "./elfsquad-forge-viewer";

// Log controls. The Autodesk viewer writes to `console` on every model load; these turn
// that off by default and report the same GPU counters on demand instead.
export {
    setVerboseLogging,
    isVerboseLogging,
    printGpuMetrics,
} from "./forge/viewerLogging";
export type { GpuMetrics } from "./forge/viewerLogging";

customElements.define('elfsquad-forge-viewer', ElfsquadForgeViewer);
