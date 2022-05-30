# Elfsquad Forge Viewer
The Elfsquad Forge Viewer allows you to embed a [Autodesk Forge viewer](https://forge.autodesk.com/) into your own custom build configurator implementation.

## Example
```javascript
import { Configuration, ConfiguratorContext } from "@elfsquad/configurator";
import { ElfsquadForgeViewer } from "@elfsquad/forge-viewer";

// Initialize a instance of the configurator context that can
// be used to interact with the Elfsquad Configurator API.
const configuratorContext = new ConfiguratorContext({
    tenantId: '<TENANT_ID>'
});

// ElfsquadForgeViewer is a HTML element that will display the  
// 3D viewer.
const forgeViewer = new ElfsquadForgeViewer();
// Hide the viewer while loading.
forgeViewer.style.visibility = 'hidden';
// Append the viewer to the body of the page.
document.body.appendChild(forgeViewer);

// Start a new configuration session
configuratorContext.newConfiguration('Model name').then(async (configuration) => {
    // Retrieve a 3d layout from the Elfsquad API and apply it to
    // the 3D viewer.
    configuratorContext.getLayout3d().then(async (layout3d) => {
        await forgeViewer.initialize(layout3d);
        // At this point the viewer has been initialized and we
        // make the 3D viewer visible for the user.
        forgeViewer.style.visibility = 'visible';
    });    

    // Subscribe to configurator update events and re-apply the
    // 3D layout settings to the viewer.
    configuratorContext.onUpdate(async (c) => {
        configuratorContext.getLayout3d().then(async (layout3d) => {
            await forgeViewer.update(layout3d);
        });
    });

});
```
