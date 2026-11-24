import type { Layout3d } from "@elfsquad/configurator";

/**
 * A 3D layout entry that can ask for its model to be drawn at the CAD file's own origin.
 * The flag is optional so that layouts from a configurator without it keep working.
 */
export type CadOriginLayout3d = Layout3d & {
    /**
     * When true the model is loaded with a zero global offset, so it is drawn at its CAD
     * origin instead of being centred on its bounding box. Absent or false keeps the default.
     */
    useCadOrigin?: boolean;
};

/**
 * The options passed to Autodesk's `viewer.loadModel` for one layout entry.
 * Only a `useCadOrigin` of exactly `true` adds a `globalOffset`.
 */
export function getModelLoadOptions(layout3d: CadOriginLayout3d) {
    return {
        applyScaling: 'mm',
        loadAsHidden: true,
        ...(layout3d.useCadOrigin === true ? { globalOffset: { x: 0, y: 0, z: 0 } } : {}),
    };
}
