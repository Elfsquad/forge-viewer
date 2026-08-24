/**
 * Log policy for the Autodesk Forge viewer.
 *
 * On every model load the viewer writes a fixed set of messages straight to `console`:
 * a THREE version banner, the WebGL renderer/vendor strings, and four GPU geometry
 * counters. None of them go through `Autodesk.Viewing.Private.logger`, so raising
 * `logger.setLevel` does not reach any of them.
 *
 * We silence the reachable ones at the two places the viewer produces them, rather than
 * by filtering `console`. A console filter would also swallow identical text coming from
 * application code, which makes debugging worse than the noise it removes.
 *
 * Verbose mode puts the viewer's own behaviour back for anyone who wants it, and
 * `printGpuMetrics` reports the same counters on demand instead of on every load.
 */

/** Extension the viewer reads solely to log the renderer/vendor strings. */
const DEBUG_RENDERER_INFO = 'WEBGL_debug_renderer_info';

let verbose = false;
let geometryStatsPatched = false;
let originalPrintStats: (() => void) | null = null;

/** The four counters the viewer's own `GeometryList.printStats` prints. */
export interface GpuMetrics {
    /** Bytes of geometry held for this model. */
    geometryMemory: number;
    /** Meshes in the geometry list. */
    meshCount: number;
    /** Meshes currently resident on the GPU. */
    meshCountOnGpu: number;
    /** Bytes of GPU memory those meshes occupy. */
    gpuMeshMemory: number;
}

/** Supplies the models a viewer instance currently has loaded. */
type MetricsSource = () => Autodesk.Viewing.Model[];

const metricsSources = new Set<MetricsSource>();

/**
 * Turn the viewer's own console output back on or off. Off by default: the viewer logs
 * unconditionally, and a production console should be quiet.
 *
 * Takes effect immediately for the geometry counters. The renderer/vendor strings are
 * only produced while a viewer is being constructed, so changing this afterwards does
 * not retroactively print them.
 */
export function setVerboseLogging(value: boolean): void {
    verbose = value;
}

/** Whether the viewer's own console output is currently enabled. */
export function isVerboseLogging(): boolean {
    return verbose;
}

/**
 * Replace `GeometryList.printStats` with a no-op unless verbose logging is on. The real
 * method is four `console.log` calls over four fields and has no other effect, so
 * standing in for it costs the viewer nothing. Idempotent, and safe to call before the
 * Autodesk bundle has evaluated — it simply does nothing in that case.
 */
export function suppressGeometryStats(): void {
    if (geometryStatsPatched) return;

    const geometryList = getPrivate('GeometryList');
    if (!geometryList || !geometryList.prototype) return;

    const original = geometryList.prototype.printStats as (() => void) | undefined;
    if (typeof original !== 'function') return;

    originalPrintStats = original;
    geometryList.prototype.printStats = function (this: unknown): void {
        if (verbose) originalPrintStats!.call(this);
    };
    geometryStatsPatched = true;
}

/**
 * Run `construct` with the `WEBGL_debug_renderer_info` extension hidden, which skips the
 * block where the viewer logs the renderer and vendor strings — and with it the
 * deprecation warning Firefox raises about that extension.
 *
 * The extension is denied only for the duration of the call, not installed globally:
 * other libraries on the page use it for genuine GPU capability detection, and the
 * viewer reads it for nothing but those two log lines.
 */
export function withRendererLogsSuppressed<T>(construct: () => T): T {
    if (verbose) return construct();

    const patched: { prototype: { getExtension: unknown }; original: unknown }[] = [];

    for (const constructor of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext]) {
        const prototype = constructor && constructor.prototype;
        if (!prototype || typeof prototype.getExtension !== 'function') continue;

        const original = prototype.getExtension;
        prototype.getExtension = function (this: WebGLRenderingContext, name: string) {
            return name === DEBUG_RENDERER_INFO ? null : original.call(this, name);
        } as typeof prototype.getExtension;

        patched.push({ prototype: prototype as never, original });
    }

    try {
        return construct();
    } finally {
        // Restore even if construction threw, so a failed viewer never leaves the page
        // with a permanently crippled getExtension.
        for (const entry of patched) {
            entry.prototype.getExtension = entry.original;
        }
    }
}

/**
 * Register a viewer instance's loaded models so `printGpuMetrics` can report on them.
 * Returns the function that deregisters it again.
 */
export function registerGpuMetricsSource(source: MetricsSource): () => void {
    metricsSources.add(source);
    return () => {
        metricsSources.delete(source);
    };
}

/**
 * Report the GPU geometry counters for every model currently loaded, across all live
 * viewers. This is the on-demand replacement for the viewer's per-load dump: same
 * numbers, read when someone actually wants them.
 *
 * Reachable from the developer console as `elfsquadForgeViewer.printGpuMetrics()`.
 */
export function printGpuMetrics(): GpuMetrics[] {
    const collected: GpuMetrics[] = [];

    for (const source of metricsSources) {
        for (const model of source()) {
            const metrics = readGpuMetrics(model);
            if (metrics) collected.push(metrics);
        }
    }

    if (collected.length === 0) {
        console.log('No 3D model is currently loaded, so there are no GPU metrics to report.');
        return collected;
    }

    // console.table is far easier to read than the viewer's four loose lines, and it
    // stays useful when several models are loaded at once.
    console.table(
        collected.map((metrics) => ({
            'Geometry size (MB)': metrics.geometryMemory / 1048576,
            Meshes: metrics.meshCount,
            'Meshes on GPU': metrics.meshCountOnGpu,
            'GPU geometry memory (bytes)': metrics.gpuMeshMemory,
        }))
    );

    return collected;
}

/** Read the counters the viewer keeps on a model's geometry list. */
function readGpuMetrics(model: Autodesk.Viewing.Model): GpuMetrics | null {
    const geometryList = model.getGeometryList() as unknown as {
        geomMemory?: number;
        geoms?: unknown[];
        gpuNumMeshes?: number;
        gpuMeshMemory?: number;
    } | null;
    if (!geometryList) return null;

    return {
        geometryMemory: geometryList.geomMemory || 0,
        // The viewer's own printStats subtracts one: index 0 of `geoms` is a placeholder.
        meshCount: geometryList.geoms ? geometryList.geoms.length - 1 : 0,
        meshCountOnGpu: geometryList.gpuNumMeshes || 0,
        gpuMeshMemory: geometryList.gpuMeshMemory || 0,
    };
}

/**
 * Expose the log controls on `window` so they can be driven from the developer console
 * of a deployed build, where there is no other way in.
 */
export function registerDevConsoleCommands(): void {
    const target = globalThis as unknown as Record<string, unknown>;
    if (target.elfsquadForgeViewer) return;

    target.elfsquadForgeViewer = {
        printGpuMetrics,
        setVerboseLogging,
        isVerboseLogging,
    };
}

/** Reach into the viewer's undeclared internals, which `@types/forge-viewer` does not cover. */
function getPrivate(name: string): { prototype: Record<string, unknown> } | null {
    const autodesk = (globalThis as unknown as Record<string, unknown>).Autodesk as
        | { Viewing?: { Private?: Record<string, unknown> } }
        | undefined;
    const value = autodesk && autodesk.Viewing && autodesk.Viewing.Private
        ? autodesk.Viewing.Private[name]
        : undefined;
    return (value as { prototype: Record<string, unknown> }) || null;
}
