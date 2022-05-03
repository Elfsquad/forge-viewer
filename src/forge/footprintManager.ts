import { ForgeContext } from "./forge-context";
import { ThreeHelpers } from "./threeHelpers";



export class FootprintManager {
    private footprintUnit: string = 'mm';
    // private footprintNeedsUpdate = false;

    constructor(private forgeContext: ForgeContext) {

        this.forgeContext.viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, () => {
            if (this.isFootprintEnabled() || this.forgeContext.nameLabelsManager.nameLabelsEnabled) {
                const bbox = this.forgeContext.getModelBoundingBox();
                this.updateLabelPositions(bbox[0], bbox[1]);
            }
        });

    }

    public toggle() {
        if (this.isFootprintEnabled())
            this.hide();
        else
            this.show();
    }

    public show() {    
        const bbox = this.forgeContext.getModelBoundingBox();

        const min = bbox[0];
        const max = bbox[1];

        this.drawBoundingBox(min, max, 'footprint');
        this.addLabels(min, max);
        this.updateLabelUnits(min, max);
    }

    public hide() {
        this.forgeContext.viewer.impl.removeOverlay('footprint', null);
        this.forgeContext.viewer.impl.removeOverlayScene('footprint');
        this.forgeContext.viewer.impl.invalidate(true);
        this.forgeContext.labelManager.removeLabel('footprint-width');
        this.forgeContext.labelManager.removeLabel('footprint-height');
        this.forgeContext.labelManager.removeLabel('footprint-depth');
    }

    private drawBoundingBox(min: THREE.Vector3, max: THREE.Vector3, renderOverlayName: string) {
        const geometry = new THREE.Geometry();

        // Floor
        geometry.vertices.push(new THREE.Vector3(min.x, min.y, min.z));
        geometry.vertices.push(new THREE.Vector3(max.x, min.y, min.z));

        geometry.vertices.push(new THREE.Vector3(max.x, min.y, min.z));
        geometry.vertices.push(new THREE.Vector3(max.x, max.y, min.z));

        geometry.vertices.push(new THREE.Vector3(max.x, max.y, min.z));
        geometry.vertices.push(new THREE.Vector3(min.x, max.y, min.z));

        geometry.vertices.push(new THREE.Vector3(min.x, max.y, min.z));
        geometry.vertices.push(new THREE.Vector3(min.x, min.y, min.z));

        // Top
        geometry.vertices.push(new THREE.Vector3(max.x, min.y, max.z));
        geometry.vertices.push(new THREE.Vector3(max.x, max.y, max.z));

        geometry.vertices.push(new THREE.Vector3(max.x, max.y, max.z));
        geometry.vertices.push(new THREE.Vector3(min.x, max.y, max.z));

        geometry.vertices.push(new THREE.Vector3(min.x, max.y, max.z));
        geometry.vertices.push(new THREE.Vector3(min.x, min.y, max.z));

        geometry.vertices.push(new THREE.Vector3(min.x, min.y, max.z));
        geometry.vertices.push(new THREE.Vector3(max.x, min.y, max.z));

        // Left
        geometry.vertices.push(new THREE.Vector3(max.x, min.y, min.z));
        geometry.vertices.push(new THREE.Vector3(min.x, min.y, min.z));

        geometry.vertices.push(new THREE.Vector3(min.x, min.y, min.z));
        geometry.vertices.push(new THREE.Vector3(min.x, min.y, max.z));

        geometry.vertices.push(new THREE.Vector3(min.x, min.y, max.z));
        geometry.vertices.push(new THREE.Vector3(max.x, min.y, max.z));

        geometry.vertices.push(new THREE.Vector3(max.x, min.y, max.z));
        geometry.vertices.push(new THREE.Vector3(max.x, min.y, min.z));

        // Right
        geometry.vertices.push(new THREE.Vector3(max.x, max.y, min.z));
        geometry.vertices.push(new THREE.Vector3(min.x, max.y, min.z));

        geometry.vertices.push(new THREE.Vector3(min.x, max.y, min.z));
        geometry.vertices.push(new THREE.Vector3(min.x, max.y, max.z));

        geometry.vertices.push(new THREE.Vector3(min.x, max.y, max.z));
        geometry.vertices.push(new THREE.Vector3(max.x, max.y, max.z));

        geometry.vertices.push(new THREE.Vector3(max.x, max.y, max.z));
        geometry.vertices.push(new THREE.Vector3(max.x, max.y, min.z));

        const linesMaterial = new THREE.LineBasicMaterial({
            color: '#000000',
            transparent: true,
            depthWrite: false,
            depthTest: true,
            // Due to limitations of the OpenGL Core Profile with the WebGL renderer 
            // on most platforms linewidth will always be 1 regardless of the set value. 
            linewidth: 1,
            opacity: 1.0
        });

        const lines = new THREE.Line(geometry, linesMaterial, (<any>THREE).LinePieces);
        (<any>this.forgeContext.viewer).impl.createOverlayScene(renderOverlayName, linesMaterial);
        (<any>this.forgeContext.viewer).impl.addOverlay(renderOverlayName, lines);
        (<any>this.forgeContext.viewer).impl.invalidate(true);
    }
    
    private addLabels(min: THREE.Vector3, max: THREE.Vector3) {
        this.forgeContext.labelManager.addLabel('footprint-width');
        this.forgeContext.labelManager.addLabel('footprint-height');
        this.forgeContext.labelManager.addLabel('footprint-depth');

        this.updateLabelUnits(min, max);
    }

    private updateLabelUnits(min: any, max: any): void {
        const dimensions = [
            max.x - min.x,
            max.y - min.y,
            max.z - min.z
        ];
        if (this.footprintUnit !== 'mm') {
            for (let i = 0; i < 3; i++) {
                // Convert to correct unit from mm.
                switch (this.footprintUnit) {
                    case 'cm':
                        dimensions[i] *= 0.1; // mm to cm
                        break;
                    case 'm':
                        dimensions[i] *= 0.001; // mm to m
                        break;
                    case 'inch':
                        dimensions[i] *= 0.0393700787; // mm to inch
                        break;
                    case 'feet':
                        dimensions[i] *= 0.0032808399; // mm to feet
                        break;
                    default:
                        console.warn('Footprint unit does not have a conversion'
                            + ' calculation, reverting to mm.');
                        this.footprintUnit = 'mm';
                        break;
                }
            }
        }

        this.forgeContext.labelManager.setLabelText(
            'footprint-width',
            '~' + dimensions[0].toFixed(2).toString() + ' ' + this.footprintUnit
        );

        this.forgeContext.labelManager.setLabelText(
            'footprint-height',
            '~' + dimensions[1].toFixed(2).toString() + ' ' + this.footprintUnit
        );

        this.forgeContext.labelManager.setLabelText(
            'footprint-depth',
            '~' + dimensions[2].toFixed(2).toString() + ' ' + this.footprintUnit
        );

        this.updateLabelPositions(min, max);
    }

    private updateLabelPositions(min: THREE.Vector3, max: THREE.Vector3) {

        const camPos = this.forgeContext.viewer.impl.camera.position;

        if (this.isFootprintEnabled()) {
            // Update width
            const widthPosWorld = ThreeHelpers.getNearestPoint(camPos, this.getFootprintLabelWidthPoints(min, max));
            const widthPosClient = this.forgeContext.viewer.impl.worldToClient(widthPosWorld);

            // Update height
            const heightPosWorld = ThreeHelpers.getNearestPoint(camPos, this.getFootprintLabelHeightPoints(min, max));
            const heightPosClient = this.forgeContext.viewer.impl.worldToClient(heightPosWorld);

            // Update depth
            const depthPosWorld = ThreeHelpers.getNearestPoint(camPos, this.getFootprintLabelDepthPoints(min, max));
            const depthPosClient = this.forgeContext.viewer.impl.worldToClient(depthPosWorld);

            this.forgeContext.labelManager.setLabelPosition('footprint-width', widthPosClient);
            this.forgeContext.labelManager.setLabelPosition('footprint-height', heightPosClient);
            this.forgeContext.labelManager.setLabelPosition('footprint-depth', depthPosClient);
        }

        // if (this.forgeContext.nameLabelsEnabled) {
        //     let broken = false;
        //     for (let id in this.loaded3dModels) {
        //         this.getConfigurationName(id).then(name => {
        //             try {
        //                 if (!broken) {
        //                     const subModelBBox = this.getModelBoundingBoxForSubModel(this.loaded3dModels[id]);
        //                     min = subModelBBox[0];
        //                     max = subModelBBox[1];
        //                     let up = this.viewer.navigation.getCamera().up;
        //                     const pos3d = this.calculateLabelPosition(min, max, up, true);
        //                     const position = this.viewer.impl.worldToClient(pos3d);
        //                     this.labelManager.setLabelPosition(id, position);
        //                 }
        //             }
        //             catch (error) {
        //                 setTimeout(() => {
        //                     this.hideNameLabels();
        //                     this.showNameLabels();
        //                 }, 250)
        //                 broken = true;
        //             }

        //         })
        //     }
        // }
    }

    private getFootprintLabelWidthPoints(min: THREE.Vector3, max: THREE.Vector3) {
        return [
            new THREE.Vector3(min.x, min.y, min.z).add(new THREE.Vector3(max.x, min.y, min.z))
                .multiplyScalar(0.5),
            new THREE.Vector3(min.x, max.y, min.z).add(new THREE.Vector3(max.x, max.y, min.z))
                .multiplyScalar(0.5),
            new THREE.Vector3(min.x, min.y, max.z).add(new THREE.Vector3(max.x, min.y, max.z))
                .multiplyScalar(0.5),
            new THREE.Vector3(min.x, max.y, max.z).add(new THREE.Vector3(max.x, max.y, max.z))
                .multiplyScalar(0.5)
        ];
    }

    private isFootprintEnabled(): boolean {
        return this.forgeContext.labelManager && !!this.forgeContext.labelManager.getLabel('footprint-width');
    }

    private getFootprintLabelHeightPoints(min: THREE.Vector3, max: THREE.Vector3) {
        return [
            new THREE.Vector3(min.x, min.y, min.z).add(new THREE.Vector3(min.x, max.y, min.z))
                .multiplyScalar(0.5),
            new THREE.Vector3(max.x, min.y, min.z).add(new THREE.Vector3(max.x, max.y, min.z))
                .multiplyScalar(0.5),
            new THREE.Vector3(min.x, min.y, max.z).add(new THREE.Vector3(min.x, max.y, max.z))
                .multiplyScalar(0.5),
            new THREE.Vector3(max.x, min.y, max.z).add(new THREE.Vector3(max.x, max.y, max.z))
                .multiplyScalar(0.5),
        ];
    }

    private getFootprintLabelDepthPoints(min: THREE.Vector3, max: THREE.Vector3) {
        return [
            new THREE.Vector3(min.x, min.y, min.z).add(new THREE.Vector3(min.x, min.y, max.z))
                .multiplyScalar(0.5),
            new THREE.Vector3(max.x, min.y, min.z).add(new THREE.Vector3(max.x, min.y, max.z))
                .multiplyScalar(0.5),
            new THREE.Vector3(min.x, max.y, min.z).add(new THREE.Vector3(min.x, max.y, max.z))
                .multiplyScalar(0.5),
            new THREE.Vector3(max.x, max.y, min.z).add(new THREE.Vector3(max.x, max.y, max.z))
                .multiplyScalar(0.5),
        ];
    }
}