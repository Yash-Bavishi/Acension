import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Terrain } from './Terrain';

const PHYSICS = {
    gravity: 80.0,          // Scaled to 5-unit player
    friction: 4.0,          // Standard CSGO friction
    maxVelocityGround: 25.0, // Scaled run speed
    maxVelocityAir: 3.0,    // Scaled air-speed cap
    accelerate: 10.0,
    airAccelerate: 100.0,
    jumpVelocity: 27.0      // Scaled jump impulse (feels perfect)
};

const PLAYER_HEIGHT = 5;

export class Player {
    public camera: THREE.PerspectiveCamera;
    public controls: PointerLockControls;
    public worldVelocity = new THREE.Vector3();

    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private holdingSpace = false;
    private jumpRequested = false;

    constructor(scene: THREE.Scene) {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 120);
        scene.add(this.camera);

        this.controls = new PointerLockControls(this.camera, document.body);

        this.setupUI();
        this.setupInput();
    }

    private setupUI() {
        const blocker = document.getElementById('blocker');
        const instructions = document.getElementById('instructions');

        if (instructions && blocker) {
            blocker.addEventListener('click', () => {
                this.controls.lock();
            });

            document.addEventListener('keydown', (e) => {
                if (e.code === 'Enter' && !this.controls.isLocked) {
                    this.controls.lock();
                }
            });

            this.controls.addEventListener('lock', () => {
                instructions.style.display = 'none';
                blocker.style.display = 'none';
            });

            this.controls.addEventListener('unlock', () => {
                blocker.style.display = 'flex';
                instructions.style.display = '';
            });
        }
    }

    private setupInput() {
        const onKeyDown = (event: KeyboardEvent) => {
            const code = event.code;
            const key = event.key.toLowerCase();

            if (code === 'ArrowUp' || code === 'KeyW' || key === 'w') this.moveForward = true;
            if (code === 'ArrowLeft' || code === 'KeyA' || key === 'a') this.moveLeft = true;
            if (code === 'ArrowDown' || code === 'KeyS' || key === 's') this.moveBackward = true;
            if (code === 'ArrowRight' || code === 'KeyD' || key === 'd') this.moveRight = true;

            if (code === 'Space' || key === ' ') {
                if (!this.holdingSpace) {
                    this.jumpRequested = true;
                }
                this.holdingSpace = true;
            }
        };

        const onKeyUp = (event: KeyboardEvent) => {
            const code = event.code;
            const key = event.key.toLowerCase();

            if (code === 'ArrowUp' || code === 'KeyW' || key === 'w') this.moveForward = false;
            if (code === 'ArrowLeft' || code === 'KeyA' || key === 'a') this.moveLeft = false;
            if (code === 'ArrowDown' || code === 'KeyS' || key === 's') this.moveBackward = false;
            if (code === 'ArrowRight' || code === 'KeyD' || key === 'd') this.moveRight = false;

            if (code === 'Space' || key === ' ') {
                this.holdingSpace = false;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        document.addEventListener('wheel', () => {
            if (this.controls.isLocked) {
                this.jumpRequested = true;
            }
        }, { passive: true });
    }

    private applyFriction(t: number) {
        let speed = Math.sqrt(this.worldVelocity.x * this.worldVelocity.x + this.worldVelocity.z * this.worldVelocity.z);
        if (speed < 0.1) {
            this.worldVelocity.x = 0;
            this.worldVelocity.z = 0;
            return;
        }

        let drop = speed * PHYSICS.friction * t;
        let newSpeed = speed - drop;
        if (newSpeed < 0) newSpeed = 0;

        newSpeed /= speed;

        this.worldVelocity.x *= newSpeed;
        this.worldVelocity.z *= newSpeed;
    }

    private accelerate(wishDir: THREE.Vector3, wishSpeed: number, accel: number, t: number) {
        let currentSpeed = this.worldVelocity.x * wishDir.x + this.worldVelocity.z * wishDir.z;
        let addSpeed = wishSpeed - currentSpeed;
        if (addSpeed <= 0) return;

        let accelSpeed = accel * t * wishSpeed;
        if (accelSpeed > addSpeed) accelSpeed = addSpeed;

        this.worldVelocity.x += accelSpeed * wishDir.x;
        this.worldVelocity.z += accelSpeed * wishDir.z;
    }

    public update(delta: number, terrain: Terrain) {
        if (!this.controls.isLocked) return;

        const floorY = terrain.getHeight(this.camera.position.x, this.camera.position.z);
        let isGrounded = this.camera.position.y <= floorY + PLAYER_HEIGHT + 0.01;

        if (!isGrounded) {
            this.worldVelocity.y -= PHYSICS.gravity * delta;
        }

        if (isGrounded) {
            this.camera.position.y = floorY + PLAYER_HEIGHT;
            if (this.worldVelocity.y < 0) {
                this.worldVelocity.y = 0;
            }

            if (this.jumpRequested) {
                this.worldVelocity.y = PHYSICS.jumpVelocity;
                isGrounded = false;
            } else {
                this.applyFriction(delta);
            }
        }

        this.jumpRequested = false;

        // The Right vector completely ignores pitch distortion.
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();

        // Forward is cleanly mathematically derived by crossing UP with RIGHT.
        // This wholly stops zenith floating precision coordinate flipping!
        const forward = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), right).normalize();

        const inputZ = Number(this.moveForward) - Number(this.moveBackward);
        const inputX = Number(this.moveRight) - Number(this.moveLeft);

        const wishDir = new THREE.Vector3();
        wishDir.addScaledVector(forward, inputZ);
        wishDir.addScaledVector(right, inputX);
        if (wishDir.lengthSq() > 0) {
            wishDir.normalize();
        }

        if (isGrounded) {
            this.accelerate(wishDir, PHYSICS.maxVelocityGround, PHYSICS.accelerate, delta);
        } else {
            this.accelerate(wishDir, PHYSICS.maxVelocityAir, PHYSICS.airAccelerate, delta);
        }

        this.camera.position.addScaledVector(this.worldVelocity, delta);
    }

    public getHorizontalSpeed(): number {
        return Math.sqrt(this.worldVelocity.x * this.worldVelocity.x + this.worldVelocity.z * this.worldVelocity.z);
    }
}
