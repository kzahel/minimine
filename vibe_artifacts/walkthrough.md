# Mini Minecraft Clone Walkthrough

## Features Implemented

### Core Engine
- **Three.js Rendering**: Voxel-based world rendering.
- **Game Loop**: Smooth 60fps target loop.
- **Input Handling**: WASD movement, Mouse Look (Pointer Lock), Jump (Space), Fly Mode (Shift/Space).

### World Generation
- **Infinite Terrain**: Randomly generated using Simplex Noise.
- **Chunk System**: 16x16x128 chunks generated in a Web Worker.
- **Meshing**: Optimized mesh generation (hidden face culling).

### Interaction
- **Block Breaking**: Left Click to remove blocks.
- **Block Placing**: Right Click to place blocks (Grass).
- **Physics**: Simple AABB collision and gravity.

### Persistence
- **IndexedDB**: World changes are saved locally and persist across reloads.

## Debugging Tools

### Integration Test
A built-in integration test verifies that the player spawns correctly and lands on the terrain.
1. Open the **Settings Menu** (Press `Esc`).
2. Click **"Run Integration Test"**.
3. Check the browser console for test logs (`[TEST] ...`).

### Debug Camera
- Press **'P'** to toggle an isometric top-down view. This is useful for verifying terrain generation if you spawn underground or in the void.

### Spawn Logic
- The game now automatically attempts to spawn the player on the surface of the first chunk (0,0).

## How to Run
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173`
