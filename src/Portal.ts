import * as THREE from 'three';

export class Portal {
    private mesh: THREE.Group;
    public position: THREE.Vector3;
    private onEnter: () => void;
    private ring!: THREE.Mesh;
    private inner!: THREE.Mesh;
    private time = 0;
    private triggered = false;

    constructor(scene: THREE.Scene, position: THREE.Vector3, label: string, color: number, onEnter: () => void) {
        this.position = position.clone();
        this.onEnter = onEnter;
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);

        const ringGeo = new THREE.TorusGeometry(4, 0.45, 16, 64);
        const ringMat = new THREE.MeshStandardMaterial({
            color, emissive: new THREE.Color(color),
            emissiveIntensity: 2, roughness: 0.2, metalness: 0.8
        });
        this.ring = new THREE.Mesh(ringGeo, ringMat);
        this.mesh.add(this.ring);

        const innerGeo = new THREE.CircleGeometry(3.6, 64);
        const innerMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        this.inner = new THREE.Mesh(innerGeo, innerMat);
        this.mesh.add(this.inner);

        const light = new THREE.PointLight(color, 4, 30);
        this.mesh.add(light);

        // Label
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 100;
        const ctx = canvas.getContext('2d')!;
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 256, 50);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
        sprite.scale.set(14, 2.8, 1);
        sprite.position.set(0, 6.5, 0);
        this.mesh.add(sprite);

        scene.add(this.mesh);
    }

    public update(delta: number, playerPos: THREE.Vector3) {
        this.time += delta;
        (this.ring.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(this.time * 2.5) * 0.7;
        (this.inner.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(this.time * 1.8) * 0.12;

        if (!this.triggered && playerPos.distanceTo(this.position) < 5) {
            this.triggered = true;
            this.onEnter();
        }
    }
}
