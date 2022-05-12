import { ConfiguratorContext, LinkedConfigurationOverview } from "@elfsquad/configurator";

export class ElfsquadConfigurationOverview {

    private selectedConfigurationId: string | null = null;
    public onConfigurationSelected: ((configurationId: string) => void)  | null = null;

    constructor(private configuratorContext: ConfiguratorContext, private container: HTMLDivElement | null) {
    }


    public selectConfiguration(configurationId: string) {
        this.selectedConfigurationId = configurationId;
        this.update();
    }

    public async update(): Promise<void> {
        if (this.container == null) return;

        const configurations = (await this.getLinkedConfigurationsOverview()).configurations;

        this.container.innerHTML = "";
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
            element.appendChild(document.createTextNode(configuration.title));
            
            if (configuration.configurationId == this.selectedConfigurationId) {
                element.classList.add("selected");
            }

            element.onclick = _ => {
                this.selectedConfigurationId = configuration.configurationId;
                this.update();                
                
                if (this.onConfigurationSelected) {
                    this.onConfigurationSelected(configuration.configurationId);
                }
            };

            this.container.appendChild(element);
        }
    }

    private getLinkedConfigurationsOverview(): Promise<LinkedConfigurationOverview> {
        return this.configuratorContext.getLinkedConfigurationOverview()
    }
}