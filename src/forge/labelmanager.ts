
export class Label3DManager {

    private labels: { [key: string]: HTMLDivElement };

    constructor(private viewer: any) {
        this.labels = {};
        

    }

    public addLabel(name: string, configurationId = "") : HTMLDivElement {
        const label = document.createElement('div');
        label.className = "configuration-label"
        label.style.position = 'absolute';
        label.style.background = 'rgba(255, 255, 255, 0.5)';
        label.style.padding = '6px 8px';
        label.style.fontSize = '10pt';
        label.style.color = 'black';
        label.style.borderRadius = '3px';
        label.style.zIndex = '1';
        label.style.boxShadow = 'black 0px 0px 4px';
        if (configurationId) {
            label.id = configurationId
            this.labels[configurationId] = label;
        }
        else {
            this.labels[name] = label;
        }
        document.body.append(label);
        return label;
    }

    public removeLabel(name: string) {
        if (this.labels[name]) {
            const label = this.getLabel(name);
            label.remove();
            delete this.labels[name];
        }
    }


    public removeAllLabels() {
        for (let key in this.labels)
            this.removeLabel(key);
    }

    public getLabel(name: string) {
        return this.labels[name];
    }

    public setLabelText(name: string, text: string) {
        this.getLabel(name).innerHTML = `<span>${text}</span>` + '<span class="label-icon">' + require('../icons/pencil.svg') + '</span>';
    }

    public setLabelPosition(name: string, position: any): void {
        try {
            const label = this.getLabel(name);
            const viewRect = this.viewer.canvas.getBoundingClientRect();
            const rect = label.getBoundingClientRect();
            label.style.left = Math.round(viewRect.left + position.x - rect.width / 2) + 'px';
            label.style.top = Math.round(viewRect.top + position.y - rect.height / 2) + 'px';
        }
        catch (error) {
            throw new Error();
        }
    }


    
}