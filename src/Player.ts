import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Terrain } from './Terrain';

const PHYSICS = {
    gravity: 80.0,
    friction: 4.0,
    maxVelocityGround: 27.0,
    maxVelocityAir: 3.0,
    accelerate: 10.0,
    airAccelerate: 12.0,
    jumpVelocity: 29.0
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
    private jumpBufferTime = 0;

    constructor(scene: THREE.Scene) {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        // Start further away so player isn't inside massive mountain initially
        this.camera.position.set(0, 5, 250);
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
                    this.jumpBufferTime = 0.15; // 150ms jump buffer
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
                this.jumpBufferTime = 0.15;
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
        
        if (this.jumpBufferTime > 0) {
            this.jumpRequested = true;
            this.jumpBufferTime -= delta;
        } else {
            this.jumpRequested = false;
        }

        let floorY = terrain.getHeight(this.camera.position.x, this.camera.position.z);
        const playerRadius = 1.8;
        const feetY = this.camera.position.y - PLAYER_HEIGHT;

        // --- 3D AABB Sweep for Dynamic Platforms ---
        let onPlatformDisplacementX = 0;
        let onPlatformDisplacementZ = 0;

        for (const p of terrain.platforms) {
            const b = p.box;

            if (this.camera.position.x + playerRadius > b.min.x && this.camera.position.x - playerRadius < b.max.x &&
                this.camera.position.z + playerRadius > b.min.z && this.camera.position.z - playerRadius < b.max.z) {

                // If feet are above or explicitly landing onto the platform
                if (feetY >= b.max.y - 1.5) {
                    floorY = Math.max(floorY, b.max.y);

                    // Track precise movement vector of the floor you are standing on
                    if (floorY === b.max.y) {
                        onPlatformDisplacementX = p.mesh.position.x - p.prevX;
                        onPlatformDisplacementZ = p.mesh.position.z - p.prevZ;
                    }
                }
                // Bonk checking for undersides (hit head)
                else if (this.camera.position.y <= b.min.y) {
                    if (this.worldVelocity.y > 0 && this.camera.position.y > b.min.y - 1.0) {
                        this.worldVelocity.y = -5.0;
                    }
                }
                // Hit horizontal wall, execute push-off calculation!
                else {
                    const dx1 = b.max.x - (this.camera.position.x - playerRadius);
                    const dx2 = (this.camera.position.x + playerRadius) - b.min.x;
                    const dz1 = b.max.z - (this.camera.position.z - playerRadius);
                    const dz2 = (this.camera.position.z + playerRadius) - b.min.z;

                    const minPush = Math.min(dx1, dx2, dz1, dz2);

                    if (minPush === dx1) {
                        this.camera.position.x += dx1;
                        if (this.worldVelocity.x < 0) this.worldVelocity.x *= -0.5; // bounce a little
                    } else if (minPush === dx2) {
                        this.camera.position.x -= dx2;
                        if (this.worldVelocity.x > 0) this.worldVelocity.x *= -0.5;
                    } else if (minPush === dz1) {
                        this.camera.position.z += dz1;
                        if (this.worldVelocity.z < 0) this.worldVelocity.z *= -0.5;
                    } else if (minPush === dz2) {
                        this.camera.position.z -= dz2;
                        if (this.worldVelocity.z > 0) this.worldVelocity.z *= -0.5;
                    }
                }
            }
        }

        let isGrounded = this.camera.position.y <= floorY + PLAYER_HEIGHT + 0.05;

        if (!isGrounded) {
            this.worldVelocity.y -= PHYSICS.gravity * delta;
        }

        if (isGrounded) {
            this.camera.position.y = floorY + PLAYER_HEIGHT;

            // Stick to the actively swaying platform underneath you!
            this.camera.position.x += onPlatformDisplacementX;
            this.camera.position.z += onPlatformDisplacementZ;

            if (this.worldVelocity.y < 0) {
                this.worldVelocity.y = 0;
            }

            if (this.jumpRequested) {
                this.worldVelocity.y = PHYSICS.jumpVelocity;
                isGrounded = false;
                this.jumpRequested = false;
                this.jumpBufferTime = 0; // consumed jump
            } else {
                this.applyFriction(delta);
            }
        }

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();

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
