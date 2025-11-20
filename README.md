# Mini Minecraft Clone

A voxel-based sandbox game built with **TypeScript**, **Three.js**, and **Vite**. This project was "vibe coded" using an advanced AI coding assistant, demonstrating a modern workflow where high-level intent guides AI implementation.

## 🎮 Features

- **Infinite Procedural World**: Terrain generated using Simplex Noise in a Web Worker.
- **Voxel Engine**: Optimized chunk meshing with hidden face culling and vertex-based Ambient Occlusion (AO).
- **Lighting**: Day/Night cycle elements with afternoon sun and dynamic shadows.
- **Physics**: Player movement, jumping, flying, and collision detection.
- **Interaction**: Break and place blocks with raycasting.
- **Persistence**: World changes are saved locally using IndexedDB.
- **Configurable Settings**: Render distance, FOV, and lighting toggles.

## 🚀 How to Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` in your browser.

3.  **Build for Production**:
    ```bash
    npm run build
    ```

## 🤖 "Vibe Coding" & Artifacts

This project was created through an interactive "vibe coding" process. The `vibe_artifacts/` directory contains the living documents used during development:

- **[task.md](vibe_artifacts/task.md)**: The step-by-step checklist of tasks completed.
- **[implementation_plan.md](vibe_artifacts/implementation_plan.md)**: The technical design document.
- **[walkthrough.md](vibe_artifacts/walkthrough.md)**: A guide to the implemented features and debugging tools.
- **[generation_metadata.md](vibe_artifacts/generation_metadata.md)**: Details about the AI generation process.

## 🛠️ Technical Architecture

### Core Engine (`src/core`)
- **Engine.ts**: Main game loop, scene management, and renderer.
- **WorldManager.ts**: Client-side world state, chunk management, and worker communication.
- **InputManager.ts**: Handles keyboard/mouse input and pointer lock.

### Web Worker (`src/worker`)
- **WorldWorker.ts**: Offloads heavy terrain generation and meshing.
- **Chunk.ts**: Block data management and geometry generation.
- **TerrainGenerator.ts**: Simplex noise-based terrain logic.

### UI (`src/ui`)
- **React Overlay**: Handles the HUD, Settings menu, and debug stats.

---
*Generated with ❤️ by Google DeepMind's Advanced Agentic Coding Team.*
