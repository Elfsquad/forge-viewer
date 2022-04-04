import { ForgeContext } from "./forge-context";

export class NameLabelsManager {

    public nameLabelsEnabled: boolean = false;
    private labels: ConfigurationLabel[] = [];


    constructor(private forgeContext: ForgeContext) {
        this.forgeContext.viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, () => {
            if (this.isNameLabelsEnabled()) {
                const bbox = this.forgeContext.getModelBoundingBox();
                this.updateLabelPositions(bbox[0], bbox[1]);
            }
        });
    }

    public toggleNameLabels() {  
        if (this.isNameLabelsEnabled())
            this.hideNameLabels();
        else
            this.showNameLabels();
    }

    public showNameLabels() {

        this.nameLabelsEnabled = true;
        for (let id of Object.keys(this.forgeContext.loaded3dModels)) {
            const name = this.forgeContext.linked3dSettings[id].name;
            var configurationLabel = new ConfigurationLabel();
            configurationLabel.configurationId = id;
            configurationLabel.duplicate = false;
            configurationLabel.name = name;
            configurationLabel.order = 1;
            this.labels.push(configurationLabel);


            let label = this.forgeContext.labelManager.addLabel(configurationLabel.getName(), id);
            label.style.cursor = "pointer";
            label.onclick = () => {
                this.forgeContext.viewer.clearSelection();
                let model = this.forgeContext.loaded3dModels[label.id];
                let instanceTree = model.getData().instanceTree;
                var selections = [
                    {
                        model: model,
                        ids: [instanceTree.getRootId()]
                    }
                ];
                this.forgeContext.viewer.impl.selector.setAggregateSelection(selections);
            }
            let duplicates = this.labels.filter(l => l.name == name);
            for (let i = 0; i < duplicates.length; i++) {
                duplicates[i].order = i + 1;
                duplicates[i].duplicate = duplicates.length > 1;
                this.forgeContext.labelManager.setLabelText(duplicates[i].configurationId, duplicates[i].getName());
            }
        }

        const bbox = this.forgeContext.getModelBoundingBox();
        const min = bbox[0];
        const max = bbox[1];
        this.updateLabelPositions(min, max);
        //this.elfsquad.emit('labelsUpdated', this.labels);
    }

    public hideNameLabels() {
        this.forgeContext.labelManager.removeAllLabels();
        for (var i = 0; i < this.labels.length; i++) {
            delete this.labels[i];
        }
        this.labels = [];
        this.nameLabelsEnabled = false;
        Array.from(document.getElementsByClassName('configuration-label')).forEach(e => e.remove())
    }

    public isNameLabelsEnabled(): boolean {
        return this.nameLabelsEnabled;
    }


    private updateLabelPositions(min: THREE.Vector3, max: THREE.Vector3) {
        if (this.nameLabelsEnabled) {
            let broken = false;
            for (let id in this.forgeContext.loaded3dModels) {
                try {
                    if (!broken) {
                        const subModelBBox = this.forgeContext.getModelBoundingBoxForSubModel(this.forgeContext.loaded3dModels[id]);
                        min = subModelBBox[0];
                        max = subModelBBox[1];
                        let up = this.forgeContext.viewer.navigation.getCamera().up;
                        const pos3d = this.calculateLabelPosition(min, max, up, true);
                        const position = this.forgeContext.viewer.impl.worldToClient(pos3d);
                        this.forgeContext.labelManager.setLabelPosition(id, position);
                    }
                }
                catch (error) {
                    setTimeout(() => {
                        this.hideNameLabels();
                        this.showNameLabels();
                    }, 250)
                    broken = true;
                }
            }
        }
    }

    private calculateLabelPosition(min: THREE.Vector3, max: THREE.Vector3, upVector: THREE.Vector3, name = false) {
        // Get the mid point from the bounding box.
        const mid = max.add(min).multiplyScalar(0.5);

        // Determine which axis is up, and add half the length of that BBox side * 1.1, to set it a bit above it.
        if (Math.abs(upVector.x) > Math.abs(upVector.y) && Math.abs(upVector.x) > Math.abs(upVector.z)) {
            // x-axis
            const length = (max.x - min.x) * Math.sign(upVector.x) * (name ? 3 : 1.1);
            return mid.add(new THREE.Vector3(length * .5, 0, 0));
        }
        else if (Math.abs(upVector.y) > Math.abs(upVector.x) && Math.abs(upVector.y) > Math.abs(upVector.z)) {
            // y-axis
            const length = (max.y - min.y) * Math.sign(upVector.y) * (name ? 3 : 1.1);
            return mid.add(new THREE.Vector3(0, length * .5, 0));
        }
        else if (Math.abs(upVector.z) > Math.abs(upVector.x) && Math.abs(upVector.z) > Math.abs(upVector.y)) {
            // z-axis
            const length = (max.z - min.z) * Math.sign(upVector.z) * (name ? 3 : 1.1);
            return mid.add(new THREE.Vector3(0, 0, length * .5));
        }
        return mid;
    }

}

export class ConfigurationLabel {
    name: string;
    order: number;
    duplicate: boolean;
    configurationId: string;

    public getName(): string {
        if (this.duplicate) {
            return `${this.name} (${this.order})`;
        }
        else {
            return this.name;
        }
    }
}