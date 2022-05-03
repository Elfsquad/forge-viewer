export interface ViewerState {
    seedURN: string;
    objectSet: ObjectSet[];
    viewport: Viewport;
    renderOptions: RenderOptions;
    cutplanes: any[];
}

export interface ObjectSet {
    id: any[];
    idType: string;
    isolated: any[];
    hidden: any[];
    explodeScale: number;
}

export interface Viewport {
    name: string;
    eye: number[];
    target: number[];
    up: number[];
    worldUpVector: number[];
    pivotPoint: number[];
    distanceToOrbit: number;
    aspectRatio: number;
    projection: string;
    isOrthographic: boolean;
    fieldOfView: number;
}

export interface RenderOptions {
    environment: string;
    ambientOcclusion: any;
    toneMap: any;
    appearance: any;
}