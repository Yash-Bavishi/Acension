import * as THREE from 'three';
import { Terrain } from './Terrain';

const BOT_HEIGHT = 5;
const HOP_HEIGHT = 8;

export class PacerBot {
    public mesh: THREE.Mesh;
    private waypoints: THREE.Vector3[] = [];
    private wpIndex = 0;
    private t = 0; // 0→1 progress between current and next waypoint
    private scene: THREE.Scene;
    private label: THREE.Sprite;
    private finished = false;
    private speed: number;

    constructor(scene: THREE.Scene, terrain: Terrain, speed = 0.75) {
        this.scene = scene;
        this.speed = speed;

        for (let i = 0; i < terrain.platforms.length; i += 2) {
            const p = terrain.platforms[i];
            this.waypoints.push(new THREE.Vector3(
                p.mesh.position.x,
                p.box.max.y + BOT_HEIGHT / 2,
                p.mesh.position.z
            ));
        }

        const geo = new THREE.BoxGeometry(1.8, BOT_HEIGHT, 1.8);
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(1.0, 0.45, 0.0),
            emissive: new THREE.Color(0.4, 0.15, 0.0),
            roughness: 0.6,
            metalness: 0.2
        });
        this.mesh = new THREE.Mesh(geo, mat);

        if (this.waypoints.length > 0) {
            this.mesh.position.copy(this.waypoints[0]);
        }

        scene.add(this.mesh);
        this.label = this.makeLabel('PACER');
        scene.add(this.label);
    }

    private makeLabel(text: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = '#ff7700';
        ctx.textAlign = 'center';
        ctx.fillText(text, 128, 44);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(6, 1.5, 1);
        return sprite;
    }

    public update(delta: number, _terrain: Terrain) {
        if (this.finished || this.waypoints.length < 2) return;

        const from = this.waypoints[this.wpIndex];
        const to = this.waypoints[this.wpIndex + 1];

        const horizDist = new THREE.Vector2(to.x - from.x, to.z - from.z).length();
        const stepPerSec = this.speed * 18 / Math.max(horizDist, 1);

        this.t += delta * stepPerSec;

        if (this.t >= 1) {
            this.t = 0;
            this.wpIndex++;
            if (this.wpIndex + 1 >= this.waypoints.length) {
                this.finished = true;
                this.mesh.position.copy(this.waypoints[this.waypoints.length - 1]);
                return;
            }
        }

        // Lerp XZ, add parabolic arc on Y
        const pos = this.mesh.position;
        pos.x = from.x + (to.x - from.x) * this.t;
        pos.z = from.z + (to.z - from.z) * this.t;
        pos.y = from.y + (to.y - from.y) * this.t + HOP_HEIGHT * Math.sin(this.t * Math.PI);

        this.label.position.set(pos.x, pos.y + BOT_HEIGHT / 2 + 2, pos.z);
    }

    public dispose() {
        this.scene.remove(this.mesh);
        this.scene.remove(this.label);
    }
}
