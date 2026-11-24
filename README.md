# Elfsquad Forge Viewer
The Elfsquad Forge Viewer allows you to embed a [Autodesk Forge viewer](https://forge.autodesk.com/) into your own custom build configurator implementation.

## Documentation

For more detailed documentation see https://elfsquad.github.io/forge-viewer/classes/ElfsquadForgeViewer.html

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

## Teardown

Removing the element from the page does not stop the Autodesk viewer inside it: it keeps
rendering, and an `initialize()` that is still running goes on to start one. Call `dispose()`
before you drop the element:

```javascript
forgeViewer.dispose();
forgeViewer.remove();
```

`dispose()` stops the render loop, finishes the Autodesk viewer, removes the viewer's event
listeners and disconnects the element's observers. It is safe to call more than once and at any
time. If `initialize()` has not finished yet, it resolves without starting a viewer, or without
loading further models once the viewer exists. A disposed element cannot be initialized again:
create a new one.

## Drawing a model at its CAD origin

By default Autodesk centres every model on the middle of its bounding box. A layout entry that
carries `useCadOrigin: true` is loaded with a zero `globalOffset` instead, so the model is drawn
at the origin of its CAD file. The flag is read per entry, so the root model and each linked model
choose independently. An absent flag or `false` keeps the default.

```javascript
await forgeViewer.initialize(layout3d.map(l => ({ ...l, useCadOrigin: l.useCadOrigin === true })));
```
