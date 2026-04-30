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
    private flyMode = false;
    private flyUp = false;
    private flyDown = false;
    private muzzleFlash!: THREE.PointLight;
    private muzzleFlashTimer = 0;
    private bulletTemplate: THREE.Group | null = null;
    private bullets: { obj: THREE.Object3D; vel: THREE.Vector3; ttl: number }[] = [];
    private gunPivot!: THREE.Group;
    private muzzleAnchor = new THREE.Object3D();
    private ammo = 15;
    public onAmmoChange: ((ammo: number) => void) | null = null;
    private scene: THREE.Scene;
    private bhopMode: 'auto' | 'manual';
    private bots: Bot[] = [];
    public onBhop: ((chain: number) => void) | null = null;
    public onHitPeer: ((peerId: string) => void) | null = null;
    public onHitConfirm: (() => void) | null = null;
    private bhopChain = 0;
    private peerMeshes: { id: string; mesh: THREE.Mesh }[] = [];
    private yaw = 0;
    private pitch = 0;

    constructor(scene: THREE.Scene, bhopMode: 'auto' | 'manual' = 'auto') {
        this.scene = scene;
        this.bhopMode = bhopMode;
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 250);
        scene.add(this.camera);

        this.controls = new PointerLockControls(this.camera, document.body);
        this.controls.pointerSpeed = 0;  // disable built-in rotation — we handle it

        // Custom mouse handler: clamp spikes, apply directly each event
        document.addEventListener('mousemove', (e) => {
            if (!this.controls.isLocked) return;
            const dx = Math.max(-30, Math.min(30, e.movementX));
            const dy = Math.max(-30, Math.min(30, e.movementY));
            this.yaw   -= dx * 0.0016;
            this.pitch -= dy * 0.0016;
            this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.y = this.yaw;
            this.camera.rotation.x = this.pitch;
        });

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
                    this.jumpBufferTime = 0.15;
                }
                this.holdingSpace = true;
                if (this.flyMode) this.flyUp = true;
            }
            if (code === 'KeyF') this.flyMode = !this.flyMode;
            if (code === 'ControlLeft' || code === 'ControlRight') this.flyDown = true;
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
                this.flyUp = false;
            }
            if (code === 'ControlLeft' || code === 'ControlRight') this.flyDown = false;
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

    public setPeerMeshes(peers: { id: string; mesh: THREE.Mesh }[]) {
        this.peerMeshes = peers;
    }

    public setSpawn(pos: THREE.Vector3, angleY: number) {
        this.camera.position.copy(pos);
        this.yaw = angleY;
        this.pitch = 0;
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
    }

    private setupGun() {
        this.gunPivot = new THREE.Group();
        this.gunPivot.position.set(0.28, -0.39, -0.5);
        this.camera.add(this.gunPivot);

        this.muzzleFlash = new THREE.PointLight(0x00f2fe, 0, 10);
        this.muzzleFlash.position.set(0, 0.02, -0.25);
        this.gunPivot.add(this.muzzleFlash);

        // Dedicated light so the gun is lit independently of the scene
        const gunLight = new THREE.PointLight(0xffffff, 2.5, 3);
        gunLight.position.set(0, 0.4, 0.1);
        this.gunPivot.add(gunLight);

        const loader = new GLTFLoader();
        loader.load('/bubble_gun.glb', (gltf) => {
            const model = gltf.scene;

            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            model.scale.setScalar(0.3 / Math.max(size.x, size.y, size.z));

            box.setFromObject(model);
            model.position.sub(box.getCenter(new THREE.Vector3()));
            model.rotation.set(-0.6, 0.1, 0.5);

            // Attach muzzle anchor at barrel tip (max X = cone/funnel end)
            box.setFromObject(model);
            this.muzzleAnchor.position.set(box.max.x, -0.08, 0);
            model.add(this.muzzleAnchor);

            this.gunPivot.add(model);
        }, undefined, (err) => console.error('Gun load error:', err));

        // Preload bullet model
        const bulletLoader = new GLTFLoader();
        bulletLoader.load('/gun_bullet_cartoonic.glb', (gltf) => {
            this.bulletTemplate = gltf.scene;
            const box = new THREE.Box3().setFromObject(this.bulletTemplate);
            const size = box.getSize(new THREE.Vector3());
            this.bulletTemplate.scale.setScalar(0.8 / Math.max(size.x, size.y, size.z));
        });

        document.addEventListener('click', () => {
            if (!this.controls.isLocked) return;
            this.muzzleFlash.intensity = 5;
            this.muzzleFlashTimer = 0.08;
            this.spawnBullet();
        });
    }

    private spawnBullet() {
        if (this.ammo <= 0) return;
        this.ammo--;
        this.onAmmoChange?.(this.ammo);

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // Bot hits
        const botMeshes = this.bots.flatMap(b => b.getHittableMeshes());
        const botHits = raycaster.intersectObjects(botMeshes);
        if (botHits.length > 0) {
            const hitMesh = botHits[0].object as THREE.Mesh;
            const bot = this.bots.find(b => b.getHittableMeshes().includes(hitMesh));
            bot?.hit(34);
        }


        if (!this.bulletTemplate) return;

        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        const bullet = this.bulletTemplate.clone();
        const spawnPos = new THREE.Vector3();
        this.muzzleAnchor.getWorldPosition(spawnPos);
        bullet.position.copy(spawnPos);
        bullet.lookAt(spawnPos.clone().add(direction));
        bullet.rotateX(Math.PI / 2);
        this.scene.add(bullet);

        this.bullets.push({ obj: bullet, vel: direction.clone().multiplyScalar(45), ttl: 1.0 });
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

        // Fly mode — F to toggle, Space=up, Ctrl=down
        if (this.flyMode) {
            const flySpeed = 80;
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            if (this.moveForward)  this.camera.position.addScaledVector(forward, flySpeed * delta);
            if (this.moveBackward) this.camera.position.addScaledVector(forward, -flySpeed * delta);
            if (this.moveLeft)     this.camera.position.addScaledVector(right, -flySpeed * delta);
            if (this.moveRight)    this.camera.position.addScaledVector(right, flySpeed * delta);
            if (this.flyUp)        this.camera.position.y += flySpeed * delta;
            if (this.flyDown)      this.camera.position.y -= flySpeed * delta;
            this.worldVelocity.set(0, 0, 0);
            return;
        }

        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= delta;
            if (this.muzzleFlashTimer <= 0) this.muzzleFlash.intensity = 0;
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.ttl -= delta;
            b.vel.y -= 30 * delta;
            b.obj.position.addScaledVector(b.vel, delta);

            // Check bullet vs peer positions
            let hit = false;
            for (const peer of this.peerMeshes) {
                const dx = b.obj.position.x - peer.mesh.position.x;
                const dy = b.obj.position.y - (peer.mesh.position.y + 2.5);
                const dz = b.obj.position.z - peer.mesh.position.z;
                if (Math.abs(dx) < 1.5 && Math.abs(dy) < 3.5 && Math.abs(dz) < 1.5) {
                    this.onHitPeer?.(peer.id);
                    this.onHitConfirm?.();
                    hit = true;
                    break;
                }
            }

            if (b.ttl <= 0 || hit) {
                this.scene.remove(b.obj);
                this.bullets.splice(i, 1);
            }
        }

        if (this.jumpBufferTime > 0) {
            this.jumpRequested = true;
            this.jumpBufferTime -= delta;
        } else {
            this.jumpRequested = false;
        }

        // ---------------------------------------------------------------
        // Build input / acceleration vectors BEFORE the movement loop so
        // they are available inside every sub-step.
        // ---------------------------------------------------------------
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

        // ---------------------------------------------------------------
        // FIX 1 — TUNNELING: sub-step movement so we never skip over terrain.
        // We advance in steps no larger than MAX_STEP_SIZE units horizontally.
        // ---------------------------------------------------------------
        const MAX_STEP_SIZE = 2.5; // units per sub-step — tighter than min platform thickness
        const totalMove = this.worldVelocity.clone().multiplyScalar(delta);
        const totalDist = totalMove.length();
        const numSteps  = Math.max(1, Math.ceil(totalDist / MAX_STEP_SIZE));
        const subDelta  = delta / numSteps;

        let isGrounded     = false;
        let canJump        = false;
        let jumpedThisFrame = false;
        let onPlatform     = false;
        let floorY         = 0;
        let onPlatformDisplacementX = 0;
        let onPlatformDisplacementZ = 0;

        for (let step = 0; step < numSteps; step++) {

            // --- Compute floor at current XZ ---
            const playerRadius = 1.8;
            floorY = terrain.getHeight(this.camera.position.x, this.camera.position.z);
            const feetY  = this.camera.position.y - PLAYER_HEIGHT;
            onPlatformDisplacementX = 0;
            onPlatformDisplacementZ = 0;

            // --- Platform AABB collision ---
            for (const p of terrain.platforms) {
                const b = p.box;

                if (this.camera.position.x + playerRadius > b.min.x && this.camera.position.x - playerRadius < b.max.x &&
                    this.camera.position.z + playerRadius > b.min.z && this.camera.position.z - playerRadius < b.max.z) {

                    if (feetY >= b.max.y - 1.5) {
                        floorY = Math.max(floorY, b.max.y);

                        if (floorY === b.max.y) {
                            onPlatformDisplacementX = p.mesh.position.x - p.prevX;
                            onPlatformDisplacementZ = p.mesh.position.z - p.prevZ;
                        }
                    }
                    else if (this.camera.position.y <= b.min.y) {
                        if (this.worldVelocity.y > 0 && this.camera.position.y > b.min.y - 1.0) {
                            this.worldVelocity.y = -5.0;
                        }
                    }
                    else {
                        const dx1 = b.max.x - (this.camera.position.x - playerRadius);
                        const dx2 = (this.camera.position.x + playerRadius) - b.min.x;
                        const dz1 = b.max.z - (this.camera.position.z - playerRadius);
                        const dz2 = (this.camera.position.z + playerRadius) - b.min.z;

                        const minPush = Math.min(dx1, dx2, dz1, dz2);

                        if (minPush === dx1) {
                            this.camera.position.x += dx1;
                            if (this.worldVelocity.x < 0) this.worldVelocity.x *= -0.5;
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

            // ---------------------------------------------------------------
            // FIX 2 — SLOPE DETECTION: stronger slide force, lower threshold,
            // and cancel any velocity component going UP the slope.
            // FIX 3 — JUMP GATE: canJump is true ONLY when onPlatform.
            //   Standing on bare terrain (mountain or flat ground) never allows
            //   jumping — players must use the spiral platforms.
            // ---------------------------------------------------------------
            const px = this.camera.position.x;
            const pz = this.camera.position.z;
            const terrainH = terrain.getHeight(px, pz);

            // Sample gradient with a slightly wider stencil for accuracy
            const slopeX = (terrain.getHeight(px + 1.0, pz) - terrain.getHeight(px - 1.0, pz)) * 0.5;
            const slopeZ = (terrain.getHeight(px, pz + 1.0) - terrain.getHeight(px, pz - 1.0)) * 0.5;
            const slopeMag = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);

            // floor raised clearly above terrain mesh = player is on a platform
            onPlatform = floorY > terrainH + 0.5;

            isGrounded = this.camera.position.y <= floorY + PLAYER_HEIGHT + 0.05;

            // Grass base (terrainH < 40) = climbable
            // Summit area (within 30 units of peak) = climbable so player can walk to flag
            // Brown/rocky zone = slides, no jumping
            const distFromPeak = Math.sqrt(px * px + pz * pz);
            const atSummit = distFromPeak < 30;
            const onGrass = !onPlatform && terrainH < 40;
            const onRock  = !onPlatform && terrainH >= 40 && !atSummit;

            canJump = isGrounded && (onPlatform || onGrass || atSummit);

            if (isGrounded && onRock && slopeMag > 0.7) {
                // Cancel uphill velocity — cannot climb rock
                const uphillX = -slopeX;
                const uphillZ = -slopeZ;
                const velDotUphill = this.worldVelocity.x * uphillX + this.worldVelocity.z * uphillZ;
                if (velDotUphill > 0) {
                    this.worldVelocity.x -= velDotUphill * uphillX / (slopeMag * slopeMag);
                    this.worldVelocity.z -= velDotUphill * uphillZ / (slopeMag * slopeMag);
                }

                // Slide down
                this.worldVelocity.x -= slopeX * 280 * subDelta;
                this.worldVelocity.z -= slopeZ * 280 * subDelta;

                const hspd = this.getHorizontalSpeed();
                if (hspd > 55) {
                    this.worldVelocity.x *= 55 / hspd;
                    this.worldVelocity.z *= 55 / hspd;
                }
            }

            // Gravity
            if (!isGrounded) {
                this.worldVelocity.y -= PHYSICS.gravity * subDelta;
            }

            // Grounded resolution
            if (isGrounded) {
                this.camera.position.y = floorY + PLAYER_HEIGHT;
                this.camera.position.x += onPlatformDisplacementX;
                this.camera.position.z += onPlatformDisplacementZ;

                if (this.worldVelocity.y < 0) this.worldVelocity.y = 0;

                const shouldJump = canJump && (this.bhopMode === 'auto'
                    ? this.holdingSpace
                    : this.jumpRequested);

                if (shouldJump) {
                    const spd = this.getHorizontalSpeed();
                    if (spd > 0 && this.bhopChain >= 3) {
                        const newSpd = Math.min(spd * (this.bhopMode === 'auto' ? 1.18 : 1.08), 200);

                        if (this.bhopMode === 'auto') {
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

                    if (spd > 4) {
                        this.bhopChain++;
                        this.onBhop?.(this.bhopChain);
                        if (this.bhopChain % 3 === 0) {
                            this.ammo = Math.min(15, this.ammo + 5);
                            this.onAmmoChange?.(this.ammo);
                        }
                    }
                } else if (!jumpedThisFrame) {
                    // Only reset chain and apply friction when no jump happened in any sub-step
                    this.bhopChain = 0;
                    this.applyFriction(subDelta);
                }
            }

            // Acceleration — applied per sub-step
            if (isGrounded || jumpedThisFrame) {
                if (hasInput) this.accelerate(wishDir, PHYSICS.maxVelocityGround, PHYSICS.accelerate, subDelta);
            } else {
                this.accelerate(wishDir, PHYSICS.maxVelocityAir, PHYSICS.airAccelerate, subDelta);
            }

            // Advance position by one sub-step
            this.camera.position.addScaledVector(this.worldVelocity, subDelta);
        }

        // Dynamic FOV — scales from 75 to 105 with speed
        const spd = this.getHorizontalSpeed();
        const targetFov = 75 + Math.min(1, spd / 180) * 30;
        this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, 10 * delta);
        this.camera.updateProjectionMatrix();
    }

    public getHorizontalSpeed(): number {
        return Math.sqrt(this.worldVelocity.x * this.worldVelocity.x + this.worldVelocity.z * this.worldVelocity.z);
    }
}
