import { CameraPosition, Layout3d, Material } from "@elfsquad/configurator";
import { FootprintManager } from "./footprintManager";
import { Label3DManager as LabelManager } from "./labelmanager";
import { ViewerProgressEvent } from "./models/progressEvent";
import { NameLabelsManager } from "./nameLabelsManager";
import { ViewerState } from "./viewerState";
import { GeometryLoadedEvent } from "./models/geometryLoadedEvent";

export class ForgeContext {
    public _element: HTMLElement;
    private _token: string | null = null;
    public viewer: Autodesk.Viewing.Viewer3D;

    public labelManager: LabelManager;
    public footprintManager: FootprintManager;
    public nameLabelsManager: NameLabelsManager;

    public loaded3dModels: { [configurationId: string]: Autodesk.Viewing.Model } = {};
    public linked3dSettings: { [configurationId: string]: Layout3d } = {};
    private dbIdsByName: { [modelId: number]: { [name: string]: number[] } } = {};
    private onLoadStart: ((event: Layout3d) => void) | null;

    constructor() { }

    public async initialize(
        element: HTMLElement,
        onProgess: ((event: ViewerProgressEvent) => void) | null = null,
        onLoadStart: ((event: Layout3d) => void) | null = null,
        onLoadEnd: ((event: GeometryLoadedEvent) => void) | null = null
    ): Promise<void> {
        if (typeof Autodesk == 'undefined') {
            throw Error(`Autodesk is not defined. Ensure you have loaded the required Autodesk Forge Viewer script from https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js`);
        }

        this._element = element;
        await this.initializeViewerToken();
        await this.initializeViewer(this._element, onProgess, onLoadEnd);
        this.intializeNameLabelsManager();
        this.initializeLabelManager();
        this.initializeFootprintManager();
        this.onLoadStart = onLoadStart;
    }

    public focus(): void {
        this.viewer.fitToView();
    }

    private async initializeViewerToken(): Promise<void> {
        const response = await fetch(`https://api.elfsquad.io/api/2.0/configurations/autodesktoken`);
        this._token = await response.text();
    }

    private initializeViewer(element: HTMLElement, onProgess: ((event: ViewerProgressEvent) => void) | null, onLoadEnd: ((event: GeometryLoadedEvent) => void) | null = null): Promise<void> {
        let promise = new Promise<void>((resolve, _) => {

            Autodesk.Viewing.Initializer({
                env: 'AutodeskProduction',
                accessToken: this._token as string
            }, () => {
                this.viewer = new Autodesk.Viewing.Viewer3D(element, {});
                if (onProgess) this.viewer.addEventListener(Autodesk.Viewing.PROGRESS_UPDATE_EVENT, onProgess);
                this.viewer.initialize();
                this.viewer.setGhosting(false);
                this.viewer.setProgressiveRendering(false);
                this.viewer.setBackgroundColor(250, 250, 250, 250, 250, 250);
                this.viewer.disableHighlight(true);
                this.viewer.impl.createOverlayScene(this._overlayScene);
                this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, (e) => this.onObjectTreeCreated(e));
                this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, (e) => this.onGeometryLoaded(e));
                if (onLoadEnd)
                    this.viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, (e) => onLoadEnd(e));
                this.viewer.addEventListener(Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT, _ => this.viewer.clearSelection());
                this.update();
                resolve();
            });
        });

        return promise;
    }

    private update() {
        requestAnimationFrame(() => this.update());
        let invalidate = false;
        for (let spinner of Object.values(this._loadModelSpinners)) {
            spinner.rotateZ(0.07);
            invalidate = true;
        }
        if (invalidate) this.viewer.impl.invalidate(true);
    }

    private initializeFootprintManager() {
        this.footprintManager = new FootprintManager(this, this._element);
    }

    private intializeNameLabelsManager() {
        this.nameLabelsManager = new NameLabelsManager(this);
    }

    private initializeLabelManager() {

        this.labelManager = new LabelManager(this);

        const style = document.createElement('style');
        style.textContent = `
            .configuration-label {
                display:flex;
                justify-content: center;
                align-items: center;
            }
            .configuration-label:hover{
                background-color: cornflowerblue!important;
            }
            .label-icon{
                display:none;
                width:17px;
                height:17px;
            }
            .configuration-label:hover .label-icon{
                display:inline-block;
            }
            .configuration-label:hover span{
                    vertical-align: super;
            }
        `;
        this._element.append(style);
    }

    public applyLayout(layout3d: Layout3d[]): Promise<void> {
        let promise = new Promise<void>(async (resolve, reject) => {
            if (this.viewer == null) {
                reject(Error("Viewer is not yet initialized"));
                return;
            }

            for (let configurationId of Object.keys(this.loaded3dModels)) {
                if (!layout3d.some(l => l.configurationId == configurationId)) {
                    this.viewer.hideModel(this.loaded3dModels[configurationId].id);
                    delete this.loaded3dModels[configurationId];
                    delete this.linked3dSettings[configurationId];
                }
            }

            for (let layout of layout3d) {

                this.linked3dSettings[layout.configurationId] = layout;

                if (!(layout.configurationId in this.loaded3dModels)) {
                    const model = await this.loadModel(layout);
                    await this.toggleInViewer(model, layout);
                } else {
                    let loadedModel = this.loaded3dModels[layout.configurationId];
                    this.moveModel(loadedModel, layout);
                    await this.toggleInViewer(loadedModel, layout);
                }
            }

            (<any>this.viewer).impl.invalidate(true);
            (<any>this.viewer).impl.sceneUpdated(true);
            this.setPivotPoint();
            this.footprintManager.redraw();
            resolve();
        });

        return promise;
    }

    public async applyCamera(camera: CameraPosition, configurationId: string | null = null): Promise<void> {
        if (!camera.state) { return; }

        let viewerState = JSON.parse(camera.state) as ViewerState;

        if (configurationId) {
            let settings = this.linked3dSettings[configurationId];
            if (settings) {
                viewerState.viewport.target[0] += settings.x;
                viewerState.viewport.target[1] += settings.y;
                viewerState.viewport.target[2] += settings.z;

                viewerState.viewport.eye[0] += settings.x;
                viewerState.viewport.eye[1] += settings.y;
                viewerState.viewport.eye[2] += settings.z;
            }
        }
        viewerState.renderOptions.appearance.progressiveDisplay = false;
        await this.restoreState(viewerState);
        this.setPivotPoint();
    }

    private restoreState(targetState: ViewerState): Promise<void> {
        // https://forge.autodesk.com/blog/wait-restorestate-finish
        var promise = new Promise<void>((resolve, _) => {
            var listener = (event: any) => {
                if (event.value.finalFrame) {
                    this.viewer.removeEventListener(
                        Autodesk.Viewing.FINAL_FRAME_RENDERED_CHANGED_EVENT,
                        listener
                    );
                    resolve();
                }
            }

            // Wait for last render caused by camera changes
            this.viewer.addEventListener(
                Autodesk.Viewing.FINAL_FRAME_RENDERED_CHANGED_EVENT,
                listener
            );

            this.viewer.restoreState(targetState);
        });

        return promise;
    }

    private _loadModelPromises: { [configurationId: string]: { resolve: any, reject: Function } } = {};
    private _loadModelSpinners: { [configurationId: string]: THREE.Object3D } = {};
    private _layouts: Layout3d[] = [];

    private _overlayScene = "overlayscene";

    private loadModel(layout3d: Layout3d): Promise<Autodesk.Viewing.Model> {
        if (this.onLoadStart)
            this.onLoadStart(layout3d);
        let promise = new Promise<Autodesk.Viewing.Model>((resolve, reject) => {

            this.addLoadingSpinner(layout3d);

            Autodesk.Viewing.Document.load(
                `urn:${layout3d.urn}`,
                async (viewerDocument) => {
                    if (this.viewer == null) return;

                    this._loadModelPromises[layout3d.configurationId] = { resolve, reject };
                    this._layouts[viewerDocument.docRoot.id] = layout3d;

                    const defaultModel = viewerDocument.getRoot().getDefaultGeometry();
                    this.viewer.loadModel(viewerDocument.getViewablePath(defaultModel), {
                        applyScaling: 'mm',
                        loadAsHidden: true
                    },
                        (model) => {
                            this.loaded3dModels[layout3d.configurationId] = model;
                            this.moveModel(model, layout3d);
                        });

                },
                (err) => {
                    console.error('document load error', err)
                    reject(err);
                });
        });

        return promise;
    }

    private _geometryLoaded: boolean[] = [];

    private addLoadingSpinner(layout3d: Layout3d) {
        var spinnerGeometry = new (<any>THREE).TorusGeometry(64, 12, 16, 100, 5);
        var spinnerMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        var spinner = new THREE.Mesh(spinnerGeometry, spinnerMaterial);
        spinner.position.set(layout3d.x, layout3d.y, layout3d.z);
        this._loadModelSpinners[layout3d.configurationId] = spinner;
        this.viewer.impl.addOverlay(this._overlayScene, spinner);
    }

    private onGeometryLoaded(e: any) {
        this._geometryLoaded[e.model.id] = true;
        this.resolveLoadedModel(e.model);
    }

    private _objectTreeLoaded: boolean[] = [];
    private onObjectTreeCreated(e: any) {
        this._objectTreeLoaded[e.model.id] = true;
        this.mapDbIds(e.model);
        this.resolveLoadedModel(e.model);
    }

    private resolveLoadedModel(model: Autodesk.Viewing.Model) {
        let configurationId = this.configurationIdForModel(model);
        if (!configurationId) return;

        if (!this._loadModelPromises[configurationId]) return;

        if (!(this._objectTreeLoaded[model.id] && this._geometryLoaded[model.id])) return;
        this.viewer.showModel(model, false);

        this._loadModelPromises[configurationId].resolve(model);
        delete this._loadModelPromises[configurationId];

        if (this._loadModelSpinners[configurationId]) {
            const spinner = this._loadModelSpinners[configurationId];
            this.viewer.impl.removeOverlay(this._overlayScene, spinner);
            delete this._loadModelSpinners[configurationId];
        }
    }

    private configurationIdForModel(model: Autodesk.Viewing.Model): string | null {
        let configurationIds = Object.keys(this.loaded3dModels);
        for (let configurationId of configurationIds) {
            if (this.loaded3dModels[configurationId].id == model.id) {
                return configurationId;
            }
        }
        return null;
    }

    private moveModel(model: Autodesk.Viewing.Model, layout3d: Layout3d) {
        let fragCount = model.getFragmentList().fragments.fragId2dbId.length;
        for (let fragId = 0; fragId < fragCount; fragId++) {
            let fragProxy = (<any>this.viewer).impl.getFragmentProxy(model, fragId);
            fragProxy.getAnimTransform();

            fragProxy.quaternion = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                layout3d.rotationY);

            fragProxy.updateAnimTransform();
            fragProxy.getAnimTransform();
            fragProxy.position = new THREE.Vector3(layout3d.x, layout3d.y, layout3d.z);
            fragProxy.updateAnimTransform();
        }
    }

    private mapDbIds(model: Autodesk.Viewing.Model) {

        this.dbIdsByName[model.id] = {};

        let instanceTree = model.getInstanceTree();

        if (!instanceTree)
            return;

        let allDbIds = Object.keys(instanceTree.nodeAccess.dbIdToIndex).map(id => parseInt(id));
        for (let dbId of allDbIds) {
            let nodeName = instanceTree.getNodeName(dbId);
            if (!nodeName) { continue; }
            nodeName = nodeName.toLowerCase();
            if (!this.dbIdsByName[model.id][nodeName]) { this.dbIdsByName[model.id][nodeName] = []; }
            this.dbIdsByName[model.id][nodeName].push(dbId);
        }
    }

    private originalMaterials: { [fragId: string]: any } = {};
    private originalColors: { [fragId: string]: any } = {};
    private async toggleInViewer(model: Autodesk.Viewing.Model, linked3dModel: Layout3d) {
        if (!this.viewer) { return; }

        const state = this.viewer.getState();
        for (const objSet of state.objectSet) {
            objSet.hidden = [];
        }
        await this.restoreState(state);

        let mapped3dItems = linked3dModel.mapped3dItems;

        this.moveModel(model, linked3dModel);

        let instanceTree = this.viewer.model.getData().instanceTree;

        for (let visibleItem of mapped3dItems.visibleItems) {
            let itemIds = this.dbIdsByName[model.id][visibleItem.toLowerCase()];
            if (itemIds && itemIds.length > 0) {
                if (model.visibilityManager) {
                    for (let itemId of itemIds) {
                        model.visibilityManager.setNodeOff(itemId, false);
                    }
                }
            }
        }

        for (let hiddenItem of mapped3dItems.hiddenItems) {
            let itemIds = this.dbIdsByName[model.id][hiddenItem.toLowerCase()];
            if (itemIds && itemIds.length > 0) {
                if (model.visibilityManager) {
                    for (let itemId of itemIds) {
                        model.visibilityManager.setNodeOff(itemId, true);
                    }
                }
            }
        }

        // Reset materials
        let fragmentList = model.getFragmentList();
        for (let fragId in this.originalMaterials) {
            (<any>fragmentList).setMaterial(fragId, this.originalMaterials[fragId])
        }
        for (let fragId in this.originalColors) {
            let color = this.originalColors[fragId];
            let material = (<any>this.viewer.model.getFragmentList()).getMaterial(fragId);
            material.color = color;
            material.needsUpdate = true;
        }

        // Colors
        for (let item in mapped3dItems.itemColors) {
            let itemIds = this.dbIdsByName[model.id][item.toLowerCase()];

            if (itemIds && itemIds.length > 0) {
                for (let itemId of itemIds) {
                    let color = mapped3dItems.itemColors[item];

                    let colorVector = new THREE.Color(color[0], color[1], color[2]);
                    const frags = this.dbsToFrags([itemId]);

                    for (const fragId of frags) {
                        let originalMaterial = (<any>this.viewer.model.getFragmentList()).getMaterial(fragId);
                        if (originalMaterial) {
                            if (!(fragId in this.originalMaterials)) {
                                this.originalMaterials[fragId] = originalMaterial;
                            }

                            let newMaterial = this.originalMaterials[fragId].clone();
                            newMaterial.color = colorVector;
                            newMaterial.needsUpdate = true;

                            let keysToCopy = ["packedNormals", "proteinType", "disableEnvMap", "ambient", "exposureBias", "tonemapOutput", "envMapExposure"];
                            for (let key of keysToCopy) {
                                if (!this.originalMaterials[fragId][key]) { continue; }
                                if (this.originalMaterials[fragId][key].clone) {
                                    try {
                                        newMaterial[key] = this.originalMaterials[fragId][key].clone();
                                    }
                                    catch {
                                    }
                                } else {
                                    newMaterial[key] = this.originalMaterials[fragId][key];
                                }
                            }
                            var cloneM_name = 'model:' + model.id.toString() + '|frag:' + fragId.toString();
                            newMaterial = this.addToMatMan(cloneM_name, newMaterial, true);
                            (<any>fragmentList).setMaterial(fragId, newMaterial);
                        }
                    }
                }
            }
        }

        // Materials
        for (const item in mapped3dItems.itemMaterials) {
            if (!mapped3dItems.hiddenItems.some(i => i.toLowerCase() == item.toLowerCase())) {
                const itemIds = this.dbIdsByName[model.id][item.toLowerCase()];
                if (itemIds && itemIds.length > 0) {
                    for (const parentId of itemIds) {
                        await this.recursiveEnumerateVisibleItems(instanceTree, parentId, async (itemId: any) => {
                            await this.applyMaterial(itemId, mapped3dItems.itemMaterials[item], fragmentList);
                        });
                    }
                }
            }
        }

        this.viewer.impl.invalidate(true);
        this.viewer.impl.sceneUpdated(true);
        this.setPivotPoint();        
    }

    private async applyMaterial(itemId: number, material: Material, fragmentList: any): Promise<any> {
        if (!this.viewer) return;

        const frags = this.dbsToFrags([itemId]);
        for (const fragId of frags) {

            if (!this.originalMaterials[fragId]) {
                const mat = (<any>this.viewer.model.getFragmentList()).getMaterial(fragId);
                if (!mat) { continue; }
                this.originalMaterials[fragId] = mat;
            }
            const originalMaterial = this.originalMaterials[fragId];
            let clonedMaterial = this.cloneMaterial(originalMaterial);
            clonedMaterial = await this.applyMaterialChanges(clonedMaterial, material, fragId);
            this.applyMaterialToFragId(clonedMaterial, fragId, fragmentList);
        }
    }

    private async recursiveEnumerateVisibleItems(instanceTree: any, dbId: number, callback: Function): Promise<any> {
        let stack = [dbId];

        if (instanceTree.isNodeOff(dbId)) { return; }

        while (stack.length > 0) {
            let id = stack.pop();
            await callback(id);
            instanceTree.enumNodeChildren(id, function (childId: any) {
                if (!instanceTree.isNodeOff(childId)) {
                    stack.push(childId);
                }
            });
        }
    }

    private applyMaterialToFragId(material: any, fragId: any, fragmentList: any) {
        var cloneM_name = this.uuidv4();
        material = this.addToMatMan(cloneM_name, material, true);
        fragmentList.setMaterial(fragId, material);
    }

    private addToMatMan(name: any, material: any, someBool: any) {
        if (!this.viewer) return;

        let matman = this.viewer.impl.matman();
        let currentMaterial = material.elfsquadId ? Object.values((<any>matman)._materials).find((m: any) => m.elfsquadId == material.elfsquadId) : null;
        if (!currentMaterial) {
            matman.addMaterial(name, material, someBool);
        }
        else {
            material = currentMaterial;
        }
        return material;
    }

    private cloneMaterial(material: any) {

        let newMaterial = material.clone();
        newMaterial.needsUpdate = true;

        let keysToCopy = ["packedNormals", "proteinType", "disableEnvMap", "ambient", "exposureBias", "tonemapOutput", "envMapExposure"];
        for (let key of keysToCopy) {
            if (material[key] == undefined) { continue; }

            if (material[key].clone) {
                try {
                    newMaterial[key] = material[key].clone();
                }
                catch {
                }
            } else {
                newMaterial[key] = material[key];
            }
        }

        return newMaterial;
    }

    private async applyMaterialChanges(threeMaterial: any, material: any, fragId: number): Promise<any> {
        if (!this.viewer) return;

        // Get the size of the object.
        const bbox = new THREE.Box3();
        const fragments = this.viewer.model.getFragmentList();
        fragments.getWorldBounds(fragId, bbox);
        const size = bbox.min.distanceTo(bbox.max);

        threeMaterial.name = material.name;
        threeMaterial.color = new THREE.Color(material.color);
        threeMaterial.ambient = new THREE.Color(material.ambient);
        threeMaterial.emissive = new THREE.Color(material.emissive);
        threeMaterial.specular = new THREE.Color(material.specular);
        threeMaterial.wireframe = material.wireframe;
        threeMaterial.alphaTest = material.alphaTest;
        threeMaterial.side = parseInt(material.side.toString());
        threeMaterial.transparant = material.transparent;
        threeMaterial.opacity = material.opacity;
        threeMaterial.depthTest = material; // default: true
        threeMaterial.depthWrite = material; // default: true
        threeMaterial.fog = material.fog;
        threeMaterial.shininess = material.shininess;
        threeMaterial.metal = material.metal;
        threeMaterial.bumpScale = material.bumpScale;
        threeMaterial.reflectivity = material.reflectivity;
        threeMaterial.refractionRatio = material.refractionRatio;
        threeMaterial.combine = parseInt(material.combine.toString());
        threeMaterial.needsUpdate = true;
        threeMaterial.elfsquadId = (<any>material).id;

        for (const key of ['map', 'specularMap', 'bumpMap']) {
            if (material[key]) {
                const texture = await this.loadTexture(material[key], material, threeMaterial);
                threeMaterial[key] = texture;
                // Normalize all the material textures to the object size.
                const normalizedRepeatX = material.textureRepeatX / size,
                    normalizedRepeatY = material.textureRepeatY / size;

                texture.repeat.set(normalizedRepeatX, normalizedRepeatY); // Adjust scale.
                threeMaterial.needsUpdate = texture.needsUpdate = true;

                if (!this.viewer) return;
                this.viewer.impl.invalidate(true, true, true); // Re-render.
            }
        }

        return threeMaterial;
    }


    private loadTexture(path: string, material: Material, threeMaterial: any): Promise<THREE.Texture> {
        let promise = new Promise<any>((resolve, _) => {
            const loader = new THREE.TextureLoader();
            loader.crossOrigin = '';
            loader.load(path,
                (texture) => {
                    this.applyTextureData(material, texture);
                    threeMaterial.needsUpdate = texture.needsUpdate = true;
                    resolve(texture);
                }
            );
        });

        return promise;
        
    }

    private applyTextureData(material: Material, texture: any) {
        texture.wrapS = parseInt(material.textureWrapX.toString());
        texture.wrapT = parseInt(material.textureWrapY.toString());
        texture.repeat.set(material.textureRepeatX, material.textureRepeatY);
        texture.flipY = material.textureFlipY;
    }

    private dbsToFrags(dbIds: number[]) {
        if (!this.viewer) return [];

        let stack = [...dbIds];
        let allDbIds: (number | undefined)[] = [];
        const it = this.viewer.model.getData().instanceTree;
        while (stack.length > 0) {
            let dbId = stack.pop();
            allDbIds.push(dbId);
            it.enumNodeChildren(dbId, (cId: number) => {
                if (allDbIds.indexOf(cId) == -1) {
                    stack.push(cId);
                }
            });
        }

        let fragId2dbId = it.fragList.fragments.fragId2dbId;
        let result = Object.keys(fragId2dbId)
            .filter(fragId => allDbIds.indexOf(fragId2dbId[fragId]) > -1)
            .map(fragId => parseInt(fragId));
        return result;
    }
    private uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private setPivotPoint() {
        if (!this.viewer) return;

        let bbox = this.getModelBoundingBox();
        const min = bbox[0];
        const max = bbox[1];
        let middle = new THREE.Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
        this.viewer.navigation.setPivotPoint(middle)
    }

    public getModelBoundingBox(): THREE.Vector3[] {

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;

        for (const model of Object.values(this.loaded3dModels)) {
            if (model.visibilityManager) {
                const fragments = model.getFragmentList();

                const fragCount = fragments.fragments.fragId2dbId.length;
                for (let fragId = 0; fragId < fragCount; fragId++) {
                    if ((<any>fragments).isFragVisible(fragId)) {
                        const bbox = new THREE.Box3();
                        fragments.getWorldBounds(fragId, bbox);
                        minX = Math.min(minX, bbox.min.x);
                        minY = Math.min(minY, bbox.min.y);
                        minZ = Math.min(minZ, bbox.min.z);
                        maxX = Math.max(maxX, bbox.max.x);
                        maxY = Math.max(maxY, bbox.max.y);
                        maxZ = Math.max(maxZ, bbox.max.z);
                    }
                }
            }
        }

        return [new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ)];
    }

    public getModelBoundingBoxForSubModel(model: any): THREE.Vector3[] {

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;

        if (model.visibilityManager) {
            const fragments = model.getFragmentList();

            const fragCount = fragments.fragments.fragId2dbId.length;
            for (let fragId = 0; fragId < fragCount; fragId++) {
                if (fragments.isFragVisible(fragId)) {
                    const bbox = new THREE.Box3();
                    fragments.getWorldBounds(fragId, bbox);
                    minX = Math.min(minX, bbox.min.x);
                    minY = Math.min(minY, bbox.min.y);
                    minZ = Math.min(minZ, bbox.min.z);
                    maxX = Math.max(maxX, bbox.max.x);
                    maxY = Math.max(maxY, bbox.max.y);
                    maxZ = Math.max(maxZ, bbox.max.z);
                }
            }
        }

        return [new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ)];
    }
}
