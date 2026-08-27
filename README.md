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

## Styling the action buttons

The viewer renders into a shadow root, so the action row is not reachable by ordinary
selectors. It is exposed as [CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/::part)
instead:

| Part | What it is |
| --- | --- |
| `actions` | The row container. `position: absolute; top: 0; right: 0` by default. |
| `action-button` | Every button in the row. |
| `action-home` | The home button, present once `setHome()` has been called. |
| `action-focus-centred` | The focus/recenter button, always present. |
| `action-footprint` | The footprint toggle, present when `footprint="true"`. |
| `action-labels` | The labels toggle, present when `labels="true"`. |

Each button carries the shared name and its own, e.g. `part="action-button action-home"`,
so a host can style the whole row and still single one control out. Prefer the per-control
names over positional selectors: the row's composition changes at runtime, since `home`
appears on the first `setHome()` call and is prepended.

```css
/* Move the row to the top centre and give each control a tile treatment. */
elfsquad-forge-viewer::part(actions) {
    top: 12px;
    right: auto;
    left: 50%;
    transform: translateX(-50%);
    gap: 6px;
}

elfsquad-forge-viewer::part(action-button) {
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    /* 32px border-box - 2x1px border - 2x7px padding = a 16px icon. */
    padding: 7px;
    border: 1px solid #e1e4e9;
    border-radius: 8px;
    background: #fff;
    color: #47556d;
}

elfsquad-forge-viewer::part(action-button):hover {
    background: #f5f6f8;
}
```

Two things to know about the icons. They are inline SVGs stroked with `currentColor`, so
setting `color` on the button colours the icon. And they are stretched to fill the button's
content box, while `::part()` cannot be followed by a descendant selector — so the icon is
sized by the button's `padding` rather than by selecting the `svg`. With
`box-sizing: border-box` the icon ends up at `width - 2 x border - 2 x padding`, which is why
the example above uses 7px of padding rather than 8px to land on a 16px icon.
