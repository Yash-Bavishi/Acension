import * as THREE from 'three';

const BODY_COLOR = 0x2255cc;
const HEAD_COLOR = 0xffcc99;
const HIT_COLOR  = 0xff2222;
const RESPAWN_TIME = 3;

export class Bot {
    public group: THREE.Group;
    private meshes: THREE.Mesh[] = [];
    private headMat!: THREE.MeshStandardMaterial;
    private bodyMat!: THREE.MeshStandardMaterial;
    private health = 100;
    private isDead = false;
    private respawnTimer = 0;
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene, position: THREE.Vector3) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.position.copy(position);
        this.build();
        scene.add(this.group);
    }

    private build() {
        this.headMat = new THREE.MeshStandardMaterial({ color: HEAD_COLOR });
        this.bodyMat = new THREE.MeshStandardMaterial({ color: BODY_COLOR });

        const add = (geo: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial, x: number, y: number, z: number) => {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, y, z);
            this.group.add(m);
            this.meshes.push(m);
        };

        add(new THREE.BoxGeometry(1.6, 1.6, 1.6), this.headMat,  0,   5.8, 0); // head
        add(new THREE.BoxGeometry(2.2, 3.0, 1.0), this.bodyMat,  0,   3.5, 0); // torso
        add(new THREE.BoxGeometry(0.8, 2.6, 0.8), this.bodyMat, -1.5, 3.5, 0); // L arm
        add(new THREE.BoxGeometry(0.8, 2.6, 0.8), this.bodyMat,  1.5, 3.5, 0); // R arm
        add(new THREE.BoxGeometry(0.9, 2.6, 0.9), this.bodyMat, -0.6, 1.3, 0); // L leg
        add(new THREE.BoxGeometry(0.9, 2.6, 0.9), this.bodyMat,  0.6, 1.3, 0); // R leg
    }

    public getHittableMeshes(): THREE.Mesh[] {
        return this.isDead ? [] : this.meshes;
    }

    public hit(damage = 34) {
        if (this.isDead) return;
        this.health -= damage;

        // Flash red then revert
        this.headMat.color.set(HIT_COLOR);
        this.bodyMat.color.set(HIT_COLOR);
        setTimeout(() => {
            this.headMat.color.set(HEAD_COLOR);
            this.bodyMat.color.set(BODY_COLOR);
        }, 120);

        if (this.health <= 0) this.die();
    }

    private die() {
        this.isDead = true;
        this.group.visible = false;
        this.respawnTimer = RESPAWN_TIME;
    }

    private respawn() {
        this.isDead = false;
        this.health = 100;
        this.group.visible = true;
        this.headMat.color.set(HEAD_COLOR);
        this.bodyMat.color.set(BODY_COLOR);
    }

    public update(delta: number, playerPos: THREE.Vector3) {
        if (this.isDead) {
            this.respawnTimer -= delta;
            if (this.respawnTimer <= 0) this.respawn();
            return;
        }
        // Always face the player
        this.group.lookAt(playerPos.x, this.group.position.y, playerPos.z);
    }
}
