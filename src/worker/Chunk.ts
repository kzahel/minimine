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
        const colors: number[] = []; // Vertex colors for AO
        const indices: number[] = [];

        let indexOffset = 0;

        // Helper for UVs (same as before)
        const uvMap = [
            { u: 0.0, v: 0.5 }, // 0: Grass Top
            { u: 0.5, v: 0.5 }, // 1: Dirt
            { u: 0.0, v: 0.0 }, // 2: Stone
            { u: 0.5, v: 0.0 }  // 3: Side Grass
        ];

        const getBlockUVs = (block: number, face: string) => {
            let textureIndex = 1;
            if (block === 1) {
                if (face === 'top') textureIndex = 0;
                else if (face === 'bottom') textureIndex = 1;
                else textureIndex = 3;
            } else if (block === 2) textureIndex = 1;
            else if (block === 3) textureIndex = 2;

            const { u, v } = uvMap[textureIndex];
            const s = 0.5;
            return { u, v, s };
        };

        // AO Helper
        // Returns light value 0.0 - 1.0 based on neighbors
        const calculateAO = (side1: number, side2: number, corner: number) => {
            if (side1 && side2) return 0.2; // Fully occluded corner
            const occlusion = (side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0);
            // 0 -> 1.0, 1 -> 0.8, 2 -> 0.6, 3 -> 0.4
            return 1.0 - occlusion * 0.2;
        };

        // Helper to get block safely (handling chunk boundaries simply for now by returning 0)
        // Ideally we need neighbor chunks for perfect AO at edges.
        const get = (x: number, y: number, z: number) => this.getBlock(x, y, z);

        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                for (let z = 0; z < CHUNK_SIZE; z++) {
                    const block = this.getBlock(x, y, z);
                    if (block === 0) continue;

                    // Top Face (Y+)
                    if (get(x, y + 1, z) === 0) {
                        positions.push(x, y + 1, z + 1, x + 1, y + 1, z + 1, x + 1, y + 1, z, x, y + 1, z);
                        normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
                        const { u, v, s } = getBlockUVs(block, 'top');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);

                        // AO for Top Face
                        // Neighbors at y+1
                        const nN = get(x, y + 1, z - 1); // North (Z-)
                        const nS = get(x, y + 1, z + 1); // South (Z+)
                        const nW = get(x - 1, y + 1, z); // West (X-)
                        const nE = get(x + 1, y + 1, z); // East (X+)

                        const nNW = get(x - 1, y + 1, z - 1);
                        const nNE = get(x + 1, y + 1, z - 1);
                        const nSW = get(x - 1, y + 1, z + 1);
                        const nSE = get(x + 1, y + 1, z + 1);

                        // Vertices: 0:BL(x,z+1), 1:BR(x+1,z+1), 2:TR(x+1,z), 3:TL(x,z)
                        // Wait, push order above: 
                        // (x, y+1, z+1) -> SW
                        // (x+1, y+1, z+1) -> SE
                        // (x+1, y+1, z) -> NE
                        // (x, y+1, z) -> NW

                        const aoSW = calculateAO(nS, nW, nSW);
                        const aoSE = calculateAO(nS, nE, nSE);
                        const aoNE = calculateAO(nN, nE, nNE);
                        const aoNW = calculateAO(nN, nW, nNW);

                        colors.push(aoSW, aoSW, aoSW, aoSE, aoSE, aoSE, aoNE, aoNE, aoNE, aoNW, aoNW, aoNW);

                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }

                    // Bottom Face (Y-)
                    if (get(x, y - 1, z) === 0) {
                        positions.push(x, y, z, x + 1, y, z, x + 1, y, z + 1, x, y, z + 1);
                        normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
                        const { u, v, s } = getBlockUVs(block, 'bottom');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);

                        // AO (Simplified: just full brightness for bottom for now to save perf/complexity)
                        colors.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5);

                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }

                    // Sides - Simplified AO (just global dimming for sides vs top)
                    const sideAO = 0.8;

                    // Front (Z+)
                    if (get(x, y, z + 1) === 0) {
                        positions.push(x, y, z + 1, x + 1, y, z + 1, x + 1, y + 1, z + 1, x, y + 1, z + 1);
                        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
                        const { u, v, s } = getBlockUVs(block, 'side');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);
                        colors.push(sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO);
                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }
                    // Back (Z-)
                    if (get(x, y, z - 1) === 0) {
                        positions.push(x + 1, y, z, x, y, z, x, y + 1, z, x + 1, y + 1, z);
                        normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
                        const { u, v, s } = getBlockUVs(block, 'side');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);
                        colors.push(sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO);
                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }
                    // Right (X+)
                    if (get(x + 1, y, z) === 0) {
                        positions.push(x + 1, y, z + 1, x + 1, y, z, x + 1, y + 1, z, x + 1, y + 1, z + 1);
                        normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
                        const { u, v, s } = getBlockUVs(block, 'side');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);
                        colors.push(sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO);
                        indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);
                        indexOffset += 4;
                    }
                    // Left (X-)
                    if (get(x - 1, y, z) === 0) {
                        positions.push(x, y, z, x, y, z + 1, x, y + 1, z + 1, x, y + 1, z);
                        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);
                        const { u, v, s } = getBlockUVs(block, 'side');
                        uvs.push(u, v, u + s, v, u + s, v + s, u, v + s);
                        colors.push(sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO, sideAO);
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
            colors: new Float32Array(colors),
            indices: new Uint32Array(indices)
        };
    }
}
