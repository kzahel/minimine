import 'fake-indexeddb/auto';
import * as THREE from 'three';
import { JSDOM } from 'jsdom';
import { Engine } from '../core/Engine';
import { WorldWorkerController } from '../worker/WorldWorkerController';
import { IDBPersistence } from '../worker/Persistence';

// Mock Browser Environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="container"></div></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true
});
global.window = dom.window as any;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock Canvas
class MockCanvas {
    width = 64;
    height = 64;
    getContext() {
        return {
            fillStyle: '',
            fillRect: () => { },
        };
    }
}
(global as any).HTMLCanvasElement = MockCanvas;
const originalCreateElement = dom.window.document.createElement.bind(dom.window.document);
(global.document as any).createElement = (tagName: string) => {
    if (tagName === 'canvas') return new MockCanvas();
    return originalCreateElement(tagName);
};

// Mock Worker
class MockWorker {
    controller: WorldWorkerController;
    onmessage: ((e: any) => void) | null = null;

    constructor() {
        const persistence = new IDBPersistence();
        this.controller = new WorldWorkerController(persistence, (msg) => {
            if (this.onmessage) {
                this.onmessage({ data: msg });
            }
        });
    }

    postMessage(data: any) {
        // Simulate async delay
        setTimeout(() => {
            this.controller.handleMessage(data);
        }, 0);
    }

    terminate() { }
}
(global as any).Worker = MockWorker;

// Mock Three.js Texture Loader to avoid image loading
THREE.TextureLoader.prototype.load = (url: string) => { void url; return new THREE.Texture(); };

// Mock WebGLRenderer
class MockWebGLRenderer {
    domElement = document.createElement('canvas');
    setSize() { }
    setPixelRatio() { }
    render() { }
    dispose() { }
}
// (THREE as any).WebGLRenderer = MockWebGLRenderer; // Cannot assign to read only

// Mock Stats.js
class MockStats {
    dom = document.createElement('div');
    begin() { }
    end() { }
    showPanel() { }
}
(global as any).Stats = MockStats;
// jest.mock removed as we are running with tsx
// We need to intercept the import or global.
// Since Engine imports it, we might need to rely on it being global or mock the module.
// For tsx, we can't easily mock modules without a loader.
// But Engine.ts imports it as `import Stats from 'stats.js'`.
// Let's try to patch the prototype if it's loaded, or define it globally if Engine uses global.
// Engine uses `import Stats`, so we need to mock the module resolution or the class.
// Since we can't easily mock module with tsx, let's modify Engine to allow injecting Stats or make it optional.


async function runHeadlessTest() {
    console.log("Starting Headless Test...");

    const container = document.getElementById('container') as HTMLDivElement;
    const engine = new Engine(container, { renderer: new MockWebGLRenderer() as any });

    // Force pointer lock for physics
    engine.inputManager.isPointerLocked = true;

    // Start engine
    engine.start();
    console.log("Engine started.");

    // Wait for chunks
    console.log("Waiting for chunks...");
    await new Promise<void>(resolve => {
        const check = () => {
            if (engine.worldManager.chunks.size > 0) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
    console.log(`Chunks loaded: ${engine.worldManager.chunks.size}`);

    // Wait for spawn
    console.log("Waiting for spawn...");
    await new Promise<void>(resolve => {
        if (engine.worldManager.hasSpawned) resolve();
        else {
            const originalOnSpawn = engine.worldManager.onSpawn;
            engine.worldManager.onSpawn = () => {
                if (originalOnSpawn) originalOnSpawn();
                resolve();
            };
        }
    });
    console.log(`Spawned at Y: ${engine.camera.position.y}`);

    // Simulate physics
    console.log("Simulating physics...");
    const startY = engine.camera.position.y;
    void startY;
    for (let i = 0; i < 100; i++) {
        // Engine loop is running via mocked requestAnimationFrame
        await new Promise(r => setTimeout(r, 16));
    }
    const endY = engine.camera.position.y;
    console.log(`End Y: ${endY}`);

    // Verify
    const raycaster = new THREE.Raycaster(engine.camera.position.clone(), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObjects(Array.from(engine.worldManager.chunks.values()));

    if (intersects.length > 0) {
        const groundY = intersects[0].point.y;
        const expectedY = groundY + engine.playerHeight;
        const diff = Math.abs(endY - expectedY);

        console.log(`Ground Y: ${groundY}, Expected: ${expectedY}, Actual: ${endY}, Diff: ${diff}`);

        if (diff < 0.1) {
            console.log("SUCCESS: Player is on ground.");
            process.exit(0);
        } else {
            console.error("FAILURE: Player is floating or sinking.");
            process.exit(1);
        }
    } else {
        console.error("FAILURE: No ground found.");
        process.exit(1);
    }
}

runHeadlessTest().catch(e => {
    console.error(e);
    process.exit(1);
});
