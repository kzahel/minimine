type Listener = (...args: any[]) => void;

export class InputManager {
    keys: { [key: string]: boolean } = {};
    isPointerLocked: boolean = false;
    events: { [key: string]: Listener[] } = {};

    constructor() {
        this.setupListeners();
    }

    on(event: string, listener: Listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    emit(event: string, ...args: any[]) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
    }

    private setupListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.emit('keydown', e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.emit('keyup', e.code);
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === document.body;
            this.emit('pointerlockchange', this.isPointerLocked);
        });

        document.addEventListener('mousedown', (e) => {
            if (!this.isPointerLocked) {
                document.body.requestPointerLock();
            } else {
                if (e.button === 0) {
                    this.emit('click'); // Left click
                } else if (e.button === 2) {
                    this.emit('rightclick'); // Right click
                }
            }
        });

        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // We handle right click in mousedown now
        });

        document.addEventListener('mousemove', (e) => {
            // console.log('Raw mousemove:', e.movementX, e.movementY, this.isPointerLocked);
            if (this.isPointerLocked) {
                console.log('InputManager mousemove:', e.movementX, e.movementY);
                this.emit('mousemove', { x: e.movementX, y: e.movementY });
            }
        });
    }

    isKeyDown(code: string): boolean {
        return !!this.keys[code];
    }

    getForwardVector(camera: THREE.Camera): THREE.Vector3 {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();
        return direction;
    }

    getRightVector(camera: THREE.Camera): THREE.Vector3 {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        direction.cross(camera.up);
        direction.y = 0;
        direction.normalize();
        return direction;
    }
}

import * as THREE from 'three';
