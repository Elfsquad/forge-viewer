import { CameraPosition, ConfiguratorContext } from "@elfsquad/configurator";
import { ForgeContext } from "./forge/forge-context";
import styles from './elfsquad-forge-viewer.css';


export class ElfsquadForgeViewer extends HTMLElement {

    private _forgeContext: ForgeContext | null = null;
    private _configuratorContext: ConfiguratorContext | null = null;
    private initialized: boolean = false;

    private _viewerContainerDiv: HTMLDivElement | null = null;
    private _actionsDiv: HTMLDivElement | null = null;

    constructor() {
        super();
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });

        const styleElement = document.createElement('style');
        styleElement.innerHTML = styles;
        this.shadowRoot!.appendChild(styleElement);

        this._viewerContainerDiv = document.createElement('div');
        this._viewerContainerDiv.className = "forge-viewer-container";
        this.shadowRoot!.appendChild(this._viewerContainerDiv);

        this._actionsDiv = document.createElement('div');
        this._actionsDiv.className = "forge-viewer-actions";
        this._viewerContainerDiv!.appendChild(this._actionsDiv);

        this.initializeActions();
    }

    public async initialize(configuratorContext: ConfiguratorContext, onProgess: ((event: any) => void)|null = null): Promise<void> {
        if (!this._viewerContainerDiv) return;

        this._configuratorContext = configuratorContext;
        this._configuratorContext.addEventListener('onConfigurationUpdated', _ => this.update());
        this.initializeSettings();
        this._forgeContext = new ForgeContext(this._configuratorContext);
        await this._forgeContext.initialize(this._viewerContainerDiv, onProgess);
        this.initialized = true;
        await this.update();
    }

    public async update(): Promise<void> {
        if (!this.initialized) {
            console.error("Viewer is not yet initialized");
            return;
        }

        const layout3d = await this._configuratorContext?.getLayout3d();
        await this._forgeContext?.applyLayout(layout3d as any);
    }

    public applyCamera(camera: CameraPosition) {
        this._forgeContext?.applyCamera(camera, (<any>this._configuratorContext).configuration.id);
    }

    private async initializeSettings(): Promise<void> {
        const settings = await this._configuratorContext?.getSettings();
        if (settings?.enable3dFootprint) {
            this.enableFootprint();
        }
        if (settings?.enable3dLabel) {
            this.enableLabels();
        }
    }

    private _footprintEnabled: boolean = false;
    public enableFootprint() {
        this._footprintEnabled = true;
        const footprintToggleButton = document.createElement('button');
        footprintToggleButton.innerHTML = require("./icons/bounding-box.svg") as string;
        footprintToggleButton.onclick = () => this.toggleFootprint();
        this._actionsDiv!.appendChild(footprintToggleButton);
    }

    private _labelsEnabled: boolean = false;
    private labelsToggleButton: HTMLButtonElement | null = null;
    public enableLabels() {
        this._labelsEnabled = true;
        this.labelsToggleButton = document.createElement('button');
        this.labelsToggleButton.innerHTML = require("./icons/tag.svg") as string;
        this.labelsToggleButton.onclick = () => this.toggleLabels();
        this._actionsDiv!.appendChild(this.labelsToggleButton);
    }

    public toggleFootprint() {

        if (!this._footprintEnabled) {
            console.error('Footprint is not enabled');
            return;
        }

        this._forgeContext?.footprintManager.toggle();
    }

    public toggleLabels() {
        if (!this._labelsEnabled) {
            console.error('Labels is not enabled');
            return;
        }

        this._forgeContext?.nameLabelsManager.toggleNameLabels();

        if (this._forgeContext?.nameLabelsManager.nameLabelsEnabled) {
            this.labelsToggleButton!.innerHTML = require("./icons/tag-off.svg") as string;
        }
        else {
            this.labelsToggleButton!.innerHTML = require("./icons/tag.svg") as string;
        }
    }

    private initializeActions() {
        this.intializeFocusAction();
    }

    private intializeFocusAction() {
        const focusButton = document.createElement('button');
        focusButton.innerHTML = require("./icons/focus-centred.svg") as string;
        focusButton.onclick = () => this._forgeContext?.focus();
        this._actionsDiv!.appendChild(focusButton);
    }
}