import * as THREE from 'three';

export class WorldManager {
    scene: THREE.Scene;
    worker: Worker;
    chunks: Map<string, THREE.Mesh> = new Map();
    private texture: THREE.Texture | null = null;
    lastBrokenBlockId: number = 1; // Default to Grass

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.worker = new Worker(new URL('../worker/WorldWorker.ts', import.meta.url), {
            type: 'module',
        });

        this.worker.onmessage = (e) => {
            const { type, data } = e.data;
            if (type === 'CHUNK_DATA') {
                this.updateChunk(data);
            } else if (type === 'BLOCK_BROKEN') {
                this.lastBrokenBlockId = data.id;
                console.log("Last broken block ID:", this.lastBrokenBlockId);
            }
        };

        // Initial load
        this.updateChunks(0, 0);
    }

    updateChunks(playerX: number, playerZ: number) {
        const radius = 2; // Small radius for now
        const chunkX = Math.floor(playerX / 16);
        const chunkZ = Math.floor(playerZ / 16);

        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                this.requestChunk(chunkX + x, chunkZ + z);
            }
        }
    }

    updateChunk(data: any) {
        const { x, z, geometry, key } = data;
        console.log(`Received chunk ${x}, ${z} with ${geometry.positions.length} vertices`);

        if (this.chunks.has(key)) {
            const oldMesh = this.chunks.get(key);
            if (oldMesh) {
                this.scene.remove(oldMesh);
                oldMesh.geometry.dispose();
                (oldMesh.material as THREE.Material).dispose();
            }
        }

        if (geometry.positions.length === 0) {
            console.warn(`Chunk ${x}, ${z} is empty`);
            return;
        }

        const bufferGeometry = new THREE.BufferGeometry();
        bufferGeometry.setAttribute('position', new THREE.BufferAttribute(geometry.positions, 3));
        bufferGeometry.setAttribute('normal', new THREE.BufferAttribute(geometry.normals, 3));
        bufferGeometry.setAttribute('uv', new THREE.BufferAttribute(geometry.uvs, 2));
        bufferGeometry.setIndex(new THREE.BufferAttribute(geometry.indices, 1));

        const material = new THREE.MeshLambertMaterial({
            map: this.loadTexture(),
            vertexColors: false,
            side: THREE.DoubleSide // Ensure visibility from inside if stuck
        });

        const mesh = new THREE.Mesh(bufferGeometry, material);
        mesh.position.set(x * 16, 0, z * 16); // 16 is CHUNK_SIZE, should import constant or pass it

        this.scene.add(mesh);
        this.chunks.set(key, mesh);

        // Spawn check
        if (x === 0 && z === 0 && !this.hasSpawned) {
            this.hasSpawned = true;
            // Find highest point at 0,0
            // We can't easily query the mesh here without raycasting or analyzing geometry.
            // Let's just emit an event or callback.
            if (this.onSpawn) this.onSpawn();
        }
    }

    hasSpawned: boolean = false;
    onSpawn: (() => void) | null = null;

    // Placeholder texture loader
    loadTexture(): THREE.Texture {
        if (this.texture) return this.texture;

        // Create a texture atlas
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Helper to draw noise
            const drawNoise = (x: number, y: number, w: number, h: number, color: string, noiseColor: string) => {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = noiseColor;
                for (let i = 0; i < 20; i++) {
                    const nx = x + Math.random() * w;
                    const ny = y + Math.random() * h;
                    const ns = 2 + Math.random() * 4;
                    ctx.fillRect(nx, ny, ns, ns);
                }
            };

            // 0: Grass Top (Top-Left: x=0, y=0 in canvas coords, but UV y=0.5-1.0)
            // Canvas coords: 0,0 is Top-Left.
            // UV mapping:
            // Top-Left (0,0 - 32,32) -> UV (0, 0.5) - (0.5, 1.0)
            drawNoise(0, 0, 32, 32, '#567d46', 'rgba(0,0,0,0.1)'); // Darker Green

            // 1: Dirt (Top-Right: x=32, y=0) -> UV (0.5, 0.5) - (1.0, 1.0)
            drawNoise(32, 0, 32, 32, '#5d4037', 'rgba(0,0,0,0.1)'); // Brown

            // 2: Stone (Bottom-Left: x=0, y=32) -> UV (0, 0) - (0.5, 0.5)
            drawNoise(0, 32, 32, 32, '#757575', 'rgba(0,0,0,0.1)'); // Grey

            // 3: Side Grass (Bottom-Right: x=32, y=32) -> UV (0.5, 0) - (1.0, 0.5)
            // Dirt background
            drawNoise(32, 32, 32, 32, '#5d4037', 'rgba(0,0,0,0.1)');
            // Grass top trim
            ctx.fillStyle = '#567d46';
            ctx.fillRect(32, 32, 32, 8);
        }
        this.texture = new THREE.CanvasTexture(canvas);
        this.texture.magFilter = THREE.NearestFilter;
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.colorSpace = THREE.SRGBColorSpace;
        return this.texture;
    }

    getBlockAt(x: number, y: number, z: number): number {
        const chunkX = Math.floor(x / 16);
        const chunkZ = Math.floor(z / 16);
        // const key = `${chunkX},${chunkZ}`;

        // We don't have direct access to block data here (it's in worker).
        // We need to either:
        // 1. Replicate block data in main thread (memory heavy)
        // 2. Use Three.js raycaster on meshes (easier for now)

        // Suppress unused variable warning
        void y;
        void chunkX;
        void chunkZ;

        return 0;
    }

    raycast(origin: THREE.Vector3, direction: THREE.Vector3): { point: THREE.Vector3, normal: THREE.Vector3, distance: number } | null {
        const raycaster = new THREE.Raycaster(origin, direction, 0, 100); // Max reach 100
        const intersects = raycaster.intersectObjects(Array.from(this.chunks.values()));

        if (intersects.length > 0) {
            return {
                point: intersects[0].point,
                normal: intersects[0].face!.normal,
                distance: intersects[0].distance
            };
        }
        return null;
    }

    requestChunk(x: number, z: number) {
        this.worker.postMessage({ type: 'LOAD_CHUNK', x, z });
    }

    setBlock(x: number, y: number, z: number, id: number) {
        this.worker.postMessage({ type: 'SET_BLOCK', x, y, z, id });
    }
}
