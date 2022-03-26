import { ForgeContext } from "./forge/forge-context";

export class ElfsquadForgeViewer extends HTMLElement {

    private _forgeContext: ForgeContext;
    private initialized: boolean = false;
    
    get configurationId(): string {
        return this.getAttribute('configuration-id') as string;
    }

    set configurationId(newValue: string) {
        this.setAttribute('configuration-id', newValue);
    }

    constructor() {
        super();

        this._forgeContext = new ForgeContext();
        this._forgeContext.initialize().then(() => {
            this.initialized = true;
            console.log('Autodesk initialized');
        });
    }


    connectedCallback() {
        console.log('initialize forge viewer', this.configurationId);
        
    }

    update() {
        if (!this.initialized) {

        }
    }
}