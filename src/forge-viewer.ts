
export class ElfsquadForgeViewer extends HTMLElement {

    get configurationId(): string {
        return this.getAttribute('configuration-id') as string;
    }

    set configurationId(newValue: string) {
        this.setAttribute('configuration-id', newValue);
    }

    constructor() {
        super();
    }


    connectedCallback() {
        console.log('initialize forge viewer', this.configurationId);

    }
}