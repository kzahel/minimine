import { TerrainGenerator } from './TerrainGenerator';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 128;

export class Chunk {
    x: number;
    z: number;
    blocks: Uint8Array;
    isDirty: boolean = true;

    constructor(x: number, z: number, generator: TerrainGenerator) {
        this.x = x;
        this.z = z;
        this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
        this.generate(generator);
    }

    generate(generator: TerrainGenerator) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = this.x * CHUNK_SIZE + x;
                const worldZ = this.z * CHUNK_SIZE + z;
                const height = generator.getHeight(worldX, worldZ);

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    let block = 0;
                    if (y > height) block = 0;
                    else if (y === height) block = 1; // Grass
                    else if (y > height - 3) block = 2; // Dirt
                    else block = 3; // Stone

                    this.setBlock(x, y, z, block);
                }
            }
        }
    }

    getBlock(x: number, y: number, z: number): number {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
            return 0;
        }
        return this.blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
    }

    setBlock(x: number, y: number, z: number, id: number) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
            return;
        }
        this.blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = id;
        this.isDirty = true;
    }

    generateGeometry() {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        let indexOffset = 0;

        // Helper for UVs
        // Atlas is 2x2.
        // 0: Grass Top (TL) -> 0, 0.5
        // 1: Dirt (TR) -> 0.5, 0.5
        // 2: Stone (BL) -> 0, 0
        // 3: Side Grass (BR) -> 0.5, 0
        const uvMap = [
            { u: 0.0, v: 0.5 }, // 0: Grass Top
            { u: 0.5, v: 0.5 }, // 1: Dirt
            { u: 0.0, v: 0.0 }, // 2: Stone
            { u: 0.5, v: 0.0 }  // 3: Side Grass
        ];

        const getBlockUVs = (block: number, face: string) => {
            let textureIndex = 1; // Default Dirt

            if (block === 1) { // Grass Block
                if (face === 'top') textureIndex = 0; // Grass Top
                else if (face === 'bottom') textureIndex = 1; // Dirt
                else textureIndex = 3; // Side Grass
            } else if (block === 2) { // Dirt
                textureIndex = 1;
            } else if (block === 3) { // Stone
                textureIndex = 2;
            }

            const { u, v } = uvMap[textureIndex];
            const s = 0.5; // Size of one slot
            // UVs for a quad: (0,0), (1,0), (1,1), (0,1) relative to slot
            // But we need to match the vertex order.
            // Vertices are usually: BL, BR, TR, TL (or similar order)
            // Let's check the push order below.
            return { u, v, s };
        };

        // Simple culled meshing (only draw faces adjacent to air)
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                for (let z = 0; z < CHUNK_SIZE; z++) {
                    const block = this.getBlock(x, y, z);
                    if (block === 0) continue;

                    // Check neighbors
                    // Top
                    if (this.getBlock(x, y + 1, z) === 0) {
                        positions.push(x, y + 1, z + 1, x + 1, y + 1, z + 1, x + 1, y + 1, z, x, y + 1, z);
                        normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
                        const { u, v, s } = getBlockUVs(block, 'top');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);
                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }
                    // Bottom
                    if (this.getBlock(x, y - 1, z) === 0) {
                        positions.push(x, y, z, x + 1, y, z, x + 1, y, z + 1, x, y, z + 1);
                        normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
                        const { u, v, s } = getBlockUVs(block, 'bottom');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);
                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }
                    // Front (Z+)
                    if (this.getBlock(x, y, z + 1) === 0) {
                        positions.push(x, y, z + 1, x + 1, y, z + 1, x + 1, y + 1, z + 1, x, y + 1, z + 1);
                        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
                        const { u, v, s } = getBlockUVs(block, 'side');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);
                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }
                    // Back (Z-)
                    if (this.getBlock(x, y, z - 1) === 0) {
                        positions.push(x + 1, y, z, x, y, z, x, y + 1, z, x + 1, y + 1, z);
                        normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
                        const { u, v, s } = getBlockUVs(block, 'side');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);
                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }
                    // Right (X+)
                    if (this.getBlock(x + 1, y, z) === 0) {
                        positions.push(x + 1, y, z + 1, x + 1, y, z, x + 1, y + 1, z, x + 1, y + 1, z + 1);
                        normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
                        const { u, v, s } = getBlockUVs(block, 'side');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);
                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }
                    // Left (X-)
                    if (this.getBlock(x - 1, y, z) === 0) {
                        positions.push(x, y, z, x, y, z + 1, x, y + 1, z + 1, x, y + 1, z);
                        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);
                        const { u, v, s } = getBlockUVs(block, 'side');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);
                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }
                }
            }
        }

        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        };
    }
}
