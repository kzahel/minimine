import { createNoise2D } from 'simplex-noise';

export class TerrainGenerator {
    noise2D: (x: number, y: number) => number;
    seed: string;

    constructor(seed: string = 'default') {
        this.seed = seed;
        // Simple seed handling for now
        this.noise2D = createNoise2D(() => {
            let h = 0xdeadbeef;
            for (let i = 0; i < seed.length; i++)
                h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
            return ((h ^ h >>> 16) >>> 0) / 4294967296;
        });
    }

    getHeight(x: number, z: number): number {
        // Base terrain
        let y = 0;
        y += this.noise2D(x * 0.01, z * 0.01) * 10;
        y += this.noise2D(x * 0.05, z * 0.05) * 5;
        y += Math.pow(this.noise2D(x * 0.005, z * 0.005), 2) * 20; // Mountains

        return Math.floor(y + 10); // Base height 10
    }

    getBlock(x: number, y: number, z: number): number {
        const height = this.getHeight(x, z);
        if (y > height) return 0; // Air
        if (y === height) return 1; // Grass
        if (y > height - 3) return 2; // Dirt
        return 3; // Stone
    }
}
