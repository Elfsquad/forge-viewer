
export class ForgeContext {
    private FORGE_VIEWER_JS_PATH = "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js";

    constructor() {
    }



    public initialize(): Promise<void> {
        const promise = new Promise<void>((resolve, _) => {
            if (typeof Autodesk !== 'undefined') resolve();

            const scriptElement = document.createElement('script');
            scriptElement.src = this.FORGE_VIEWER_JS_PATH;

            scriptElement.onload = () => resolve();
            
            document.head.appendChild(scriptElement);
        });

        return promise;
    }

}