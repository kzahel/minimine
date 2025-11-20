# Mini Minecraft Clone Implementation Plan

## Goal Description
Create a basic Minecraft clone using TypeScript and Vite. The application will feature a 3D voxel world with randomly generated terrain, player movement, block interaction (add/remove), and a menu system. The architecture will use a Web Worker for world generation and persistence to ensure smooth performance on the main thread.

## User Review Required
> [!IMPORTANT]
> I am proposing to use **React** for the UI overlay (menus, HUD) as it simplifies state management for settings (FOV, Render Distance). The core game engine will be pure TypeScript/Three.js to avoid React overhead in the game loop.

## Proposed Changes

### Project Structure
#### [NEW] [package.json](file:///home/kgraehl/code/minimine/package.json)
- Dependencies: `three`, `react`, `react-dom`, `simplex-noise`, `idb`, `stats.js`
- DevDependencies: `vite`, `typescript`, `@types/three`, `@types/react`, `@types/react-dom`

### Core Engine (`src/core`)
#### [NEW] [Engine.ts](file:///home/kgraehl/code/minimine/src/core/Engine.ts)
- Main entry point for the game logic.
- Manages the Game Loop, Scene, Camera, and Renderer.
- Manages the Game Loop, Scene, Camera, and Renderer.
- Handles communication with the World Worker.
- [NEW] Enable Fly Mode by default.
- [NEW] Increase block interaction range to 100 units.

#### [NEW] [InputManager.ts](file:///home/kgraehl/code/minimine/src/core/InputManager.ts)
- Handles Keyboard (WASD, Space for Jump/Fly) and Mouse (Look, Click) input.
- Manages Pointer Lock state.

#### [NEW] [WorldManager.ts](file:///home/kgraehl/code/minimine/src/core/WorldManager.ts)
- Client-side representation of the world.
- Receives chunk meshes from the worker and adds them to the Three.js scene.
- Handles raycasting for block interaction.
- [NEW] Generates a texture atlas for block rendering.

#### [MODIFY] [Chunk.ts](file:///home/kgraehl/code/minimine/src/worker/Chunk.ts)
- Update `generateGeometry` to use UV coordinates from the texture atlas based on block type and face.

### World Worker (`src/worker`)
#### [NEW] [WorldWorker.ts](file:///home/kgraehl/code/minimine/src/worker/WorldWorker.ts)
- Entry point for the Web Worker.
- Handles messages from the main thread (e.g., "Load Chunk", "Update Block").

#### [NEW] [TerrainGenerator.ts](file:///home/kgraehl/code/minimine/src/worker/TerrainGenerator.ts)
- Uses `simplex-noise` to generate terrain heightmaps.

#### [NEW] [Chunk.ts](file:///home/kgraehl/code/minimine/src/worker/Chunk.ts)
- Manages block data for a chunk.
- Generates geometry data (vertices, normals, uvs) for the chunk mesh.
- [NEW] Calculates vertex-based Ambient Occlusion (AO) and stores it in vertex colors.

#### [NEW] [Persistence.ts](file:///home/kgraehl/code/minimine/src/worker/Persistence.ts)
- Defines an abstract `IPersistence` interface to support future backends (File/SQLite).
- Implements `IDBPersistence` using `idb` for client-side storage.

### UI (`src/ui`)
#### [NEW] [App.tsx](file:///home/kgraehl/code/minimine/src/ui/App.tsx)
- Root React component.
- Renders the HUD (crosshair, stats), Menus (Settings), and New World creation (Seed input).

#### [NEW] [Overlay.tsx](file:///home/kgraehl/code/minimine/src/ui/Overlay.tsx)
- Handles the "Pause" menu and Settings (Fog Toggle, Fly Mode).

## Verification Plan

### Automated Tests
- N/A for this initial prototype phase. We will rely on manual verification.

### Manual Verification
- **Startup**: Run `npm run dev` and verify the game loads without errors.
- **Movement**: Verify WASD moves the camera and Mouse looks around.
- **Terrain**: Verify terrain generates and renders around the player.
- **Interaction**:
    - Left Click: Break block (verify block disappears).
    - Right Click: Place block (verify block appears).
- **Persistence**:
    - Modify the world.
    - Refresh the page.
    - Verify changes persist.
- **Settings**:
    - Open menu (Esc).
    - Change Render Distance.
    - Verify fog/chunk loading updates.
