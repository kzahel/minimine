import { Chunk, CHUNK_SIZE } from './Chunk';
import { TerrainGenerator } from './TerrainGenerator';
import type { IPersistence } from './Persistence';

export class WorldWorkerController {
    generator: TerrainGenerator;
    persistence: IPersistence;
    chunks: Map<string, Chunk>;
    postMessage: (message: any, transfer?: Transferable[]) => void;

    constructor(persistence: IPersistence, postMessage: (message: any, transfer?: Transferable[]) => void) {
        this.generator = new TerrainGenerator();
        this.persistence = persistence;
        this.chunks = new Map();
        this.postMessage = postMessage;
    }

    async handleMessage(data: any) {
        const { type, x, z } = data;
        if (type === 'LOAD_CHUNK') {
            const key = `${x},${z}`;
            let chunk = this.chunks.get(key);

            if (!chunk) {
                // Try loading from persistence
                const savedData = await this.persistence.loadChunk(x, z);
                chunk = new Chunk(x, z, this.generator);

                if (savedData) {
                    chunk.blocks = savedData;
                    chunk.isDirty = true;
                }
                this.chunks.set(key, chunk);
            }

            if (chunk.isDirty || type === 'LOAD_CHUNK') { // Always send if requested
                const geometry = chunk.generateGeometry();
                this.postMessage({
                    type: 'CHUNK_DATA',
                    data: {
                        x, z,
                        geometry,
                        key
                    }
                }, [geometry.positions.buffer, geometry.normals.buffer, geometry.uvs.buffer, geometry.colors.buffer, geometry.indices.buffer] as any);
                chunk.isDirty = false;
            }
        } else if (type === 'SET_BLOCK') {
            const { x, y, z, id } = data;
            const chunkX = Math.floor(x / CHUNK_SIZE);
            const chunkZ = Math.floor(z / CHUNK_SIZE);
            const key = `${chunkX},${chunkZ}`;
            const chunk = this.chunks.get(key);

            if (chunk) {
                const localX = x - chunkX * CHUNK_SIZE;
                const localZ = z - chunkZ * CHUNK_SIZE;

                const oldBlockId = chunk.getBlock(localX, y, localZ);
                chunk.setBlock(localX, y, localZ, id);

                if (id === 0 && oldBlockId !== 0) {
                    this.postMessage({
                        type: 'BLOCK_BROKEN',
                        data: { id: oldBlockId }
                    });
                }

                // Save to persistence
                this.persistence.saveChunk(chunkX, chunkZ, chunk.blocks);

                // Regenerate mesh
                const geometry = chunk.generateGeometry();
                this.postMessage({
                    type: 'CHUNK_DATA',
                    data: {
                        x: chunkX, z: chunkZ,
                        geometry,
                        key
                    }
                }, [geometry.positions.buffer, geometry.normals.buffer, geometry.uvs.buffer, geometry.colors.buffer, geometry.indices.buffer] as any);
                chunk.isDirty = false;
            }
        }
    }
}
