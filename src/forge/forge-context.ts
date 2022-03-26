
export class ForgeContext {
    
    constructor() {
    }

    public initialize(): Promise<void> {
        const promise = new Promise<void>((resolve, _) => {
            if (typeof Autodesk == 'undefined') {
                throw Error(`Autodesk is not defined. Ensure you have loaded the required Autodesk Forge Viewer script from https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js`);
            }

            resolve();
        });

        return promise;
    }

}