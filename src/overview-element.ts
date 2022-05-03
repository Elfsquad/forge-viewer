import { Layout3d } from "@elfsquad/configurator";
import { ForgeContext } from "./forge/forge-context";


export class ElfsquadConfigurationOverview {

    private selectedConfigurationId: string | null = null;
    public onConfigurationSelected: ((layout: Layout3d) => void)  | null = null;

    constructor(private forgeContext: ForgeContext, private container: HTMLDivElement | null) {
    }


    public selectConfiguration(configurationId: string) {
        this.selectedConfigurationId = configurationId;
        this.update();
    }

    public async update(): Promise<void> {
        if (this.container == null) return;

        this.container.innerHTML = "";
        
        const configurations = Object.values(this.forgeContext.linked3dSettings);
        if (configurations.length <= 1) return;

        if (!this.selectedConfigurationId ||
            !configurations.find(c => c.configurationId === this.selectedConfigurationId)) { 
            this.selectedConfigurationId = configurations[0].configurationId;
        }

        for (let configuration of configurations) {
            const element = document.createElement('div');
            element.className = "configuration-overview-element";
            if (configuration.imageUrl){
                const image = document.createElement('img');
                image.src = configuration.imageUrl;
                element.appendChild(image);
            }
            element.appendChild(document.createTextNode(configuration.name));
            
            if (configuration.configurationId == this.selectedConfigurationId) {
                element.classList.add("selected");
            }

            element.onclick = _ => {
                this.selectedConfigurationId = configuration.configurationId;
                this.update();                
                
                if (this.onConfigurationSelected) {
                    this.onConfigurationSelected(configuration);
                }
            };

            this.container.appendChild(element);
        }
    }
}