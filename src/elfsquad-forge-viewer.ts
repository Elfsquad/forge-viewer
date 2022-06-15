import { CameraPosition, Layout3d } from "@elfsquad/configurator";
import { ForgeContext } from "./forge/forge-context";
import styles from './elfsquad-forge-viewer.css';
import { ElfsquadConfigurationOverview } from "./overview-element";
import { ViewerProgressEvent } from "./forge/models/progressEvent";


export class ElfsquadForgeViewer extends HTMLElement {

    private _forgeContext: ForgeContext | null = null;
    private initialized: boolean = false;

    private _viewerContainerDiv: HTMLDivElement;
    private _actionsDiv: HTMLDivElement | null = null;

    private _overviewContainerDiv: HTMLDivElement | null = null;
    private _configurationOverview: ElfsquadConfigurationOverview | null = null;

    private _footprintEnabled = false;
    private _labelsEnabled = false;

    constructor() {
        super();
        this._viewerContainerDiv = document.createElement('div');

      
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });

        new MutationObserver((mutations) => {
            if (!mutations.some(m => m.type == 'attributes')) return;
            this.initializeSettings();
        }).observe(this, { attributes: true});

        const styleElement = document.createElement('style');
        styleElement.innerHTML = styles;
        this.shadowRoot!.appendChild(styleElement);

        this._viewerContainerDiv.className = "forge-viewer-container";
        this.shadowRoot!.appendChild(this._viewerContainerDiv);

        this._actionsDiv = document.createElement('div');
        this._actionsDiv.className = "forge-viewer-actions";
        this._viewerContainerDiv!.appendChild(this._actionsDiv);

        this._overviewContainerDiv = document.createElement('div');
        this._overviewContainerDiv.className = 'configurations-overview';
        this._viewerContainerDiv!.appendChild(this._overviewContainerDiv);

        this.initializeSettings();
        this.initializeActions();
    }
    
    /**
     * Initialize the viewer component.
     * @param layout3d - Layout that should be applied on initialization.
     * @param onProgess - Callback function to listen to loading progress events.
     */
    public async initialize(layout3d: Layout3d[], onProgess: ((event: ViewerProgressEvent) => void)|null = null): Promise<void> {
        if (!this._viewerContainerDiv) return;

        this._forgeContext = new ForgeContext();
        await this._forgeContext.initialize(this._viewerContainerDiv, onProgess);

        
        this._forgeContext.nameLabelsManager.onConfigurationSelected = (configurationId) => {
            this._configurationOverview?.selectConfiguration(configurationId);
            this.emitConfigurationSelected(configurationId);
        };

        this.initialized = true;
        await this.update(layout3d);
    }

    /*
     * Apply layout settings to the viewer.
     */
    public async update(layout3d: Layout3d[]): Promise<void> {
        if (!this.initialized) {
            console.error("Viewer is not yet initialized");
            return;
        }

        await this._forgeContext?.applyLayout(layout3d);
        await this._configurationOverview?.update();
    }

    public applyCamera(camera: CameraPosition, configurationId: string) {
        this._forgeContext?.applyCamera(camera, configurationId);
    }

    public hideUi() {
        this._viewerContainerDiv.classList.add('hide-ui');
        this._forgeContext?.nameLabelsManager!.hideNameLabels();
    }

    public showUi() {
        this._viewerContainerDiv.classList.remove('hide-ui');
    }

    private async initializeSettings(): Promise<void> {
        if (this.getAttribute('footprint') === 'true' && !this._footprintEnabled){
            this.enableFootprint();
        }
        if (this.getAttribute('labels') === 'true' && !this._labelsEnabled) {
            this.enableLabels();
        }
    }

    private footprintToggleButton: HTMLButtonElement | null = null;
    public enableFootprint() {
        this._footprintEnabled = true;
        this.footprintToggleButton = document.createElement('button');
        this.footprintToggleButton.innerHTML = require("./icons/bounding-box.svg") as string;
        this.footprintToggleButton.onclick = () => this.toggleFootprint();
        this._actionsDiv!.appendChild(this.footprintToggleButton);
    }

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

        if (this._forgeContext?.footprintManager.isShowing) {
            this.footprintToggleButton!.innerHTML = require("./icons/bounding-box-off.svg") as string;
        }
        else {
            this.footprintToggleButton!.innerHTML = require("./icons/bounding-box.svg") as string;
        }
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

    public disableLabels(){
        this._forgeContext?.nameLabelsManager!.hideNameLabels();
    }

    public screenshot():string {
        const canvas = this._viewerContainerDiv.getElementsByTagName('canvas')[0];
        return canvas.toDataURL('image/png');
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

    private emitConfigurationSelected(configurationId: string) {
        this.dispatchEvent(new CustomEvent('onConfigurationSelected', { detail: configurationId }));
    }
}
