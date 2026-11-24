import { test } from "node:test";
import assert from "node:assert/strict";
import { getModelLoadOptions } from "./load-options.ts";

const layout: any = { configurationId: "c", urn: "u", x: 0, y: 0, z: 0 };

test("default load options are unchanged", () => {
    assert.deepEqual(getModelLoadOptions(layout), { applyScaling: "mm", loadAsHidden: true });
});

test("useCadOrigin false and absent do not set a global offset", () => {
    assert.equal("globalOffset" in getModelLoadOptions({ ...layout, useCadOrigin: false }), false);
    assert.equal("globalOffset" in getModelLoadOptions({ ...layout, useCadOrigin: undefined }), false);
});

test("useCadOrigin true loads with a zero global offset and keeps the rest", () => {
    assert.deepEqual(getModelLoadOptions({ ...layout, useCadOrigin: true }), {
        applyScaling: "mm",
        loadAsHidden: true,
        globalOffset: { x: 0, y: 0, z: 0 },
    });
});
