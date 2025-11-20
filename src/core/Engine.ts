import * as THREE from 'three';
import Stats from 'stats.js';
import { InputManager } from './InputManager';
import { WorldManager } from './WorldManager';

export class Engine {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    inputManager: InputManager;
    worldManager: WorldManager;
    stats: Stats;
    dirLight: THREE.DirectionalLight | null = null;

    isRunning: boolean = false;
    container: HTMLElement;

    // Player settings
    playerHeight: number = 1.8;
    playerSpeed: number = 5.0;
    flySpeed: number = 10.0;
    isFlying: boolean = true; // Default to flying
    velocity: THREE.Vector3 = new THREE.Vector3();
    gravity: number = 30.0;
    jumpForce: number = 10.0;
    canJump: boolean = false;



    constructor(container: HTMLElement, options?: { renderer?: THREE.WebGLRenderer }) {
        this.container = container;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.02);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 10;

        // Renderer
        if (options?.renderer) {
            this.renderer = options.renderer;
        } else {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(this.renderer.domElement);
        }

        // Stats
        if (typeof document !== 'undefined') {
            // We can't easily check if Stats is valid constructor if it fails inside.
            // Let's try-catch or just skip if headless option is passed.
        }

        try {
            this.stats = new Stats();
            this.stats.showPanel(0);
            document.body.appendChild(this.stats.dom);
        } catch (e) {
            console.warn("Stats not initialized (headless mode?)");
            this.stats = { begin: () => { }, end: () => { }, dom: document.createElement('div') } as any;
        }

        // Managers
        this.inputManager = new InputManager();
        this.worldManager = new WorldManager(this.scene);

        this.worldManager.onSpawn = () => {
            console.log("Spawn chunk loaded. Teleporting player.");
            // Raycast down from high up to find ground
            const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 100, 0), new THREE.Vector3(0, -1, 0));
            const intersects = raycaster.intersectObjects(Array.from(this.worldManager.chunks.values()));
            if (intersects.length > 0) {
                this.camera.position.y = intersects[0].point.y + this.playerHeight + 2;
                console.log("Spawned at y=", this.camera.position.y);
            } else {
                this.camera.position.y = 50; // Fallback
                console.log("Spawn fallback y=50");
            }
            this.velocity.y = 0;
        };

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced ambient for better contrast
        this.scene.add(ambientLight);

        // Afternoon Sun
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(50, 80, 30); // High afternoon sun
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;
        this.scene.add(dirLight);
        this.dirLight = dirLight;

        // Debug Aids
        const gridHelper = new THREE.GridHelper(100, 100);
        this.scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Use Standard for shadows
        const cube = new THREE.Mesh(geometry, material);
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.position.set(0, 10, -5); // In front of camera
        this.scene.add(cube);

        // Events
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Input Events
        this.inputManager.on('keydown', (code) => {
            console.log('Key pressed:', code);
            if (code === 'Space') {
                if (this.isFlying) {
                    this.velocity.y = this.playerSpeed;
                } else if (this.canJump) {
                    this.velocity.y = this.jumpForce;
                    this.canJump = false;
                }
            }
            if (code === 'KeyP' || code === 'p') { // Debug Camera Toggle
                this.toggleDebugCamera();
            }
        });

        this.camera.rotation.order = "YXZ"; // Important for FPS camera

        this.inputManager.on('mousemove', (delta: { x: number, y: number }) => {
            // console.log('Engine mousemove:', delta);
            const sensitivity = 0.005; // Increased sensitivity
            this.camera.rotation.y -= delta.x * sensitivity;
            this.camera.rotation.x -= delta.y * sensitivity;
            this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
            console.log(`Rot: ${this.camera.rotation.x.toFixed(2)}, ${this.camera.rotation.y.toFixed(2)}`);
        });

        this.inputManager.on('click', () => {
            this.handleInteraction(false); // Break
        });

        this.inputManager.on('rightclick', () => {
            this.handleInteraction(true); // Place
        });
    }

    private handleInteraction(isPlacing: boolean) {
        const rayOrigin = this.camera.position.clone();
        const rayDirection = new THREE.Vector3();
        this.camera.getWorldDirection(rayDirection);

        const hit = this.worldManager.raycast(rayOrigin, rayDirection);
        if (hit && hit.distance < 100) { // Increased range
            if (isPlacing) {
                const placePos = hit.point.clone().add(hit.normal.clone().multiplyScalar(0.01));
                const blockToPlace = this.worldManager.lastBrokenBlockId || 1;
                this.worldManager.setBlock(Math.floor(placePos.x), Math.floor(placePos.y), Math.floor(placePos.z), blockToPlace);
            } else {
                const breakPos = hit.point.clone().add(rayDirection.clone().multiplyScalar(0.01));
                this.worldManager.setBlock(Math.floor(breakPos.x), Math.floor(breakPos.y), Math.floor(breakPos.z), 0); // Air
            }
        }
    }

    isDebugCamera: boolean = false;
    debugCamera: THREE.OrthographicCamera | null = null;

    toggleDebugCamera() {
        this.isDebugCamera = !this.isDebugCamera;
        if (this.isDebugCamera) {
            const aspect = window.innerWidth / window.innerHeight;
            const d = 50;
            this.debugCamera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
            this.debugCamera.position.set(50, 50, 50);
            this.debugCamera.lookAt(this.scene.position);
        } else {
            this.debugCamera = null;
        }
    }

    setLighting(enabled: boolean) {
        if (this.renderer) {
            this.renderer.shadowMap.enabled = enabled;
        }
        if (this.dirLight) {
            this.dirLight.castShadow = enabled;
        }
        // Also toggle AO if possible, but that requires material update on chunks
        this.worldManager.setAO(enabled);
    }

    setRenderDistance(distance: number) {
        this.worldManager.setRenderDistance(distance);
        // Force update immediately to feel responsive
        this.worldManager.updateChunks(this.camera.position.x, this.camera.position.z);
    }

    start() {
        console.log("Engine.start() called");
        if (this.isRunning) {
            console.log("Engine already running");
            return;
        }
        this.isRunning = true;
        this.animate();
    }

    stop() {
        console.log("Engine.stop() called");
        this.isRunning = false;
    }

    dispose() {
        this.stop();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        if (this.stats && this.stats.dom && this.stats.dom.parentNode) {
            this.stats.dom.parentNode.removeChild(this.stats.dom);
        }
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        // Cleanup other listeners if needed, though InputManager handles its own? 
        // InputManager listeners are global, so we should probably dispose it too.
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate = () => {
        if (!this.isRunning) {
            // console.log("Skipping frame, not running");
            return;
        }
        requestAnimationFrame(this.animate);

        try {
            this.stats.begin();
            this.update(1 / 60); // Fixed time step for now, should use delta
            this.renderer.render(this.scene, this.isDebugCamera && this.debugCamera ? this.debugCamera : this.camera);
            this.stats.end();

            // if (Math.random() < 0.01) console.log("Render loop running");
        } catch (e) {
            console.error("Error in game loop:", e);
            this.stop();
        }
    };

    private update(dt: number) {
        // Player Movement
        if (this.inputManager.isPointerLocked) {
            const forward = this.inputManager.getForwardVector(this.camera);
            const right = this.inputManager.getRightVector(this.camera);

            const speed = this.isFlying ? this.flySpeed : this.playerSpeed;
            const moveDir = new THREE.Vector3();

            if (this.inputManager.isKeyDown('KeyW') || this.inputManager.isKeyDown('ArrowUp')) moveDir.add(forward);
            if (this.inputManager.isKeyDown('KeyS') || this.inputManager.isKeyDown('ArrowDown')) moveDir.sub(forward);
            if (this.inputManager.isKeyDown('KeyD') || this.inputManager.isKeyDown('ArrowRight')) moveDir.add(right);
            if (this.inputManager.isKeyDown('KeyA') || this.inputManager.isKeyDown('ArrowLeft')) moveDir.sub(right);

            if (moveDir.lengthSq() > 0) {
                moveDir.normalize().multiplyScalar(speed * dt);
                this.camera.position.add(moveDir);
            }

            // Physics (Simple Gravity)
            if (!this.isFlying) {
                this.velocity.y -= this.gravity * dt;
                this.camera.position.y += this.velocity.y * dt;

                // Floor collision (temp)
                // if (this.camera.position.y < this.playerHeight) {
                //     this.camera.position.y = this.playerHeight;
                //     this.velocity.y = 0;
                //     this.canJump = true;
                // }

                // Check for collision with blocks
                // Simple point check at feet
                const feetPos = this.camera.position.clone();
                feetPos.y -= this.playerHeight;

                // Check block below
                // We need a way to check block solidity synchronously or predictively.
                // Since we don't have block data in main thread, we can use raycasting downwards for floor check.

                const rayOrigin = this.camera.position.clone();
                const rayDirection = new THREE.Vector3(0, -1, 0);
                const hit = this.worldManager.raycast(rayOrigin, rayDirection);

                if (hit && hit.distance < this.playerHeight) {
                    this.camera.position.y = hit.point.y + this.playerHeight;
                    this.velocity.y = 0;
                    this.canJump = true;
                }
            } else {
                // Fly up/down
                if (this.inputManager.isKeyDown('Space')) {
                    this.camera.position.y += this.flySpeed * dt;
                }
                if (this.inputManager.isKeyDown('ShiftLeft')) {
                    this.camera.position.y -= this.flySpeed * dt;
                }
                this.velocity.y = 0;
            }

            this.worldManager.updateChunks(this.camera.position.x, this.camera.position.z);
        }

        // Mouse Look (Pointer Lock controls camera rotation directly usually, 
        // but we need to handle it via events or checking movementX/Y)
        // InputManager doesn't expose movementX/Y yet.
        // Let's add a listener in InputManager or handle it here.
        // Better to handle it here with a listener on document.
    }
}
