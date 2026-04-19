import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Terrain } from './Terrain';
import { Bot } from './Bot';

const PHYSICS = {
    gravity: 80.0,
    friction: 4.0,
    maxVelocityGround: 18.0,
    maxVelocityAir: 2.0,
    accelerate: 7.0,
    airAccelerate: 8.0,
    jumpVelocity: 31.0
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
    private muzzleFlash!: THREE.PointLight;
    private muzzleFlashTimer = 0;
    private tracers: { line: THREE.Line; ttl: number }[] = [];
    private scene: THREE.Scene;
    private bhopMode: 'auto' | 'manual';
    private bots: Bot[] = [];
    public onBhop: ((chain: number) => void) | null = null;
    private bhopChain = 0;

    constructor(scene: THREE.Scene, bhopMode: 'auto' | 'manual' = 'auto') {
        this.scene = scene;
        this.bhopMode = bhopMode;
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 250);
        scene.add(this.camera);

        this.controls = new PointerLockControls(this.camera, document.body);
        this.controls.pointerSpeed = 0.4;

        this.setupUI();
        this.setupInput();
        this.setupGun();
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

        // Manual mode: scroll triggers jump buffer
        document.addEventListener('wheel', () => {
            if (this.controls.isLocked && this.bhopMode === 'manual') {
                this.jumpBufferTime = 0.15;
            }
        }, { passive: true });
    }

    public setBots(bots: Bot[]) {
        this.bots = bots;
    }

    public setSpawn(pos: THREE.Vector3, angleY: number) {
        this.camera.position.copy(pos);
        this.camera.rotation.set(0, angleY, 0);
    }

    private setupGun() {
        const gunPivot = new THREE.Group();
        gunPivot.position.set(0.22, -0.22, -0.45);
        this.camera.add(gunPivot);

        // Muzzle flash
        this.muzzleFlash = new THREE.PointLight(0xffaa33, 0, 10);
        this.muzzleFlash.position.set(0, 0.02, -0.25);
        gunPivot.add(this.muzzleFlash);

        // Dedicated light so the gun is lit independently of the scene
        const gunLight = new THREE.PointLight(0xffffff, 2.5, 3);
        gunLight.position.set(0, 0.4, 0.1);
        gunPivot.add(gunLight);

        // --- Load Desert Eagle with original materials ---
        const loader = new GLTFLoader();
        loader.load('/desert_eagle_gun.glb', (gltf) => {
            const model = gltf.scene;

            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            model.scale.setScalar(0.35 / Math.max(size.x, size.y, size.z));

            box.setFromObject(model);
            model.position.sub(box.getCenter(new THREE.Vector3()));
            model.rotation.y = Math.PI;

            gunPivot.add(model);
        }, undefined, (err) => console.error('Gun load error:', err));

        document.addEventListener('click', () => {
            if (!this.controls.isLocked) return;
            this.muzzleFlash.intensity = 5;
            this.muzzleFlashTimer = 0.08;
            this.spawnTracer();
        });
    }

    private spawnTracer() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // Check bot hits
        const botMeshes = this.bots.flatMap(b => b.getHittableMeshes());
        const hits = raycaster.intersectObjects(botMeshes);
        if (hits.length > 0) {
            const hitMesh = hits[0].object as THREE.Mesh;
            const bot = this.bots.find(b => b.getHittableMeshes().includes(hitMesh));
            bot?.hit(34); // 3 shots to kill
        }

        const end = hits.length > 0
            ? hits[0].point
            : raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 300);

        const points = [raycaster.ray.origin.clone(), end];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: 0xffee88, transparent: true, opacity: 1.0 });
        const line = new THREE.Line(geo, mat);
        this.scene.add(line);
        this.tracers.push({ line, ttl: 0.12 });
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
        currentSpeed = Math.max(0, currentSpeed); // don't penalize sharp turns
        let addSpeed = wishSpeed - currentSpeed;
        if (addSpeed <= 0) return;

        let accelSpeed = accel * t * wishSpeed;
        if (accelSpeed > addSpeed) accelSpeed = addSpeed;

        this.worldVelocity.x += accelSpeed * wishDir.x;
        this.worldVelocity.z += accelSpeed * wishDir.z;
    }

    public update(delta: number, terrain: Terrain) {
        if (!this.controls.isLocked) return;

        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= delta;
            if (this.muzzleFlashTimer <= 0) this.muzzleFlash.intensity = 0;
        }

        for (let i = this.tracers.length - 1; i >= 0; i--) {
            const t = this.tracers[i];
            t.ttl -= delta;
            (t.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, t.ttl / 0.12);
            if (t.ttl <= 0) {
                this.scene.remove(t.line);
                this.tracers.splice(i, 1);
            }
        }

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

        let jumpedThisFrame = false;

        if (isGrounded) {
            this.camera.position.y = floorY + PLAYER_HEIGHT;
            this.camera.position.x += onPlatformDisplacementX;
            this.camera.position.z += onPlatformDisplacementZ;

            if (this.worldVelocity.y < 0) this.worldVelocity.y = 0;

            const shouldJump = this.bhopMode === 'auto'
                ? this.holdingSpace
                : this.jumpRequested;

            if (shouldJump) {
                const spd = this.getHorizontalSpeed();
                if (spd > 0 && this.bhopChain >= 3) {
                    const newSpd = Math.min(spd * (this.bhopMode === 'auto' ? 1.18 : 1.08), 200);

                    if (this.bhopMode === 'auto') {
                        // Camera always steers in auto mode
                        const camForward = new THREE.Vector3();
                        this.camera.getWorldDirection(camForward);
                        camForward.y = 0;
                        camForward.normalize();
                        this.worldVelocity.x = camForward.x * newSpd;
                        this.worldVelocity.z = camForward.z * newSpd;
                    } else {
                        this.worldVelocity.x *= newSpd / spd;
                        this.worldVelocity.z *= newSpd / spd;
                    }
                }
                this.worldVelocity.y = PHYSICS.jumpVelocity;
                isGrounded = false;
                jumpedThisFrame = true;
                this.jumpRequested = false;
                this.jumpBufferTime = 0;

                // Register bhop — grounded + speed means it's a real hop
                if (spd > 4) {
                    this.bhopChain++;
                    this.onBhop?.(this.bhopChain);
                }
            } else {
                this.bhopChain = 0;
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
        if (wishDir.lengthSq() > 0) wishDir.normalize();

        const hasInput = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
        if (isGrounded || jumpedThisFrame) {
            if (hasInput) this.accelerate(wishDir, PHYSICS.maxVelocityGround, PHYSICS.accelerate, delta);
        } else {
            this.accelerate(wishDir, PHYSICS.maxVelocityAir, PHYSICS.airAccelerate, delta);
        }

        this.camera.position.addScaledVector(this.worldVelocity, delta);
    }

    public getHorizontalSpeed(): number {
        return Math.sqrt(this.worldVelocity.x * this.worldVelocity.x + this.worldVelocity.z * this.worldVelocity.z);
    }
}
