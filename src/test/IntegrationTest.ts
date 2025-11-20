import { Engine } from '../core/Engine';
import * as THREE from 'three';

export class IntegrationTest {
    engine: Engine;
    log: (msg: string) => void;

    constructor(engine: Engine, log: (msg: string) => void) {
        this.engine = engine;
        this.log = log;
    }

    async run() {
        this.log("Starting Integration Test: Player Spawn & Physics");

        // 1. Wait for chunks to load
        this.log("Waiting for chunks...");
        await new Promise<void>(resolve => {
            const check = () => {
                if (this.engine.worldManager.chunks.size > 0) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
        this.log(`Chunks loaded: ${this.engine.worldManager.chunks.size}`);

        // 2. Wait for spawn
        this.log("Waiting for spawn teleport...");
        await new Promise<void>(resolve => {
            if (this.engine.worldManager.hasSpawned) resolve();
            else {
                const originalOnSpawn = this.engine.worldManager.onSpawn;
                this.engine.worldManager.onSpawn = () => {
                    if (originalOnSpawn) originalOnSpawn();
                    resolve();
                };
            }
        });
        this.log(`Spawned at: ${this.engine.camera.position.y.toFixed(2)}`);

        // 3. Simulate physics ticks
        this.log("Simulating 100 physics ticks...");
        const startY = this.engine.camera.position.y;
        void startY; // Suppress unused warning if we don't use it for diff

        for (let i = 0; i < 100; i++) {
            // We can't easily call private update, but we can wait.
            // Or we can expose a tick method.
            // For now, let's just wait real time.
            await new Promise(r => setTimeout(r, 16));
        }

        const endY = this.engine.camera.position.y;
        this.log(`Position after ticks: ${endY.toFixed(2)}`);

        // 4. Verify
        // Raycast down to find ground truth
        const raycaster = new THREE.Raycaster(this.engine.camera.position.clone(), new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(Array.from(this.engine.worldManager.chunks.values()));

        if (intersects.length > 0) {
            const groundY = intersects[0].point.y;
            const expectedY = groundY + this.engine.playerHeight;
            const diff = Math.abs(endY - expectedY);

            this.log(`Ground Y: ${groundY.toFixed(2)}, Expected Player Y: ${expectedY.toFixed(2)}`);

            if (diff < 0.1) {
                this.log("SUCCESS: Player is stable on ground.");
            } else {
                this.log(`FAILURE: Player is not on ground. Diff: ${diff.toFixed(2)}`);
            }
        } else {
            this.log("FAILURE: No ground found below player.");
        }
    }
}
