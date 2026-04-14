import * as THREE from 'three';

export interface Platform {
    mesh: THREE.Mesh;
    box: THREE.Box3;
    r: number;
    baseAngle: number;
    originY: number;
    prevX: number;
    prevZ: number;
}

export type MapType = 'classic' | 'fuji';

export class Terrain {
    public mesh: THREE.Mesh;
    public platforms: Platform[] = [];
    public type: MapType;

    constructor(scene: THREE.Scene, type: MapType = 'classic') {
        this.type = type;

        // Configuration based on map style
        let skyColor = 0x87ceeb;
        let fogDensity = 0.002;

        if (type === 'fuji') {
            skyColor = 0xffa8c0; // Sakura Pink Sunset
            fogDensity = 0.0020;
        }

        scene.background = new THREE.Color(skyColor);
        scene.fog = new THREE.FogExp2(skyColor, fogDensity);

        // Generate Massive Mountain Terrain
        const terrainGeo = new THREE.PlaneGeometry(1500, 1500, 256, 256);
        terrainGeo.rotateX(-Math.PI / 2);

        const positions = terrainGeo.attributes.position;
        terrainGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(positions.count * 3), 3));
        const colors = terrainGeo.attributes.color;

        const colorSnow = new THREE.Color(0xffffff);
        const colorRock = type === 'fuji' ? new THREE.Color(0x332d30) : new THREE.Color(0x6e6e6e);
        const colorGrass = type === 'fuji' ? new THREE.Color(0x4a8c50) : new THREE.Color(0x3d8c40);
        const tempColor = new THREE.Color();

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            const y = this.getHeight(x, z);
            positions.setY(i, y);

            if (type === 'fuji') {
                if (y > 200) {
                    tempColor.lerpColors(colorRock, colorSnow, Math.min(1, (y - 200) / 30));
                } else if (y > 35) {
                    tempColor.lerpColors(colorGrass, colorRock, Math.min(1, (y - 35) / 50));
                } else {
                    tempColor.copy(colorGrass);
                }
            } else {
                if (y > 180) {
                    tempColor.lerpColors(colorRock, colorSnow, Math.min(1, (y - 180) / 40));
                } else if (y > 40) {
                    tempColor.lerpColors(colorGrass, colorRock, Math.min(1, (y - 40) / 60));
                } else {
                    tempColor.copy(colorGrass);
                }
            }
            colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
        }
        terrainGeo.computeVertexNormals();

        const terrainMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: true,
            roughness: 0.9,
            metalness: 0.1
        });

        this.mesh = new THREE.Mesh(terrainGeo, terrainMat);
        scene.add(this.mesh);

        // Lights
        const dirLight = new THREE.DirectionalLight(0xffffe0, 1.5);
        dirLight.position.set(200, 400, 100);
        
        if (type === 'fuji') {
            dirLight.color.setHex(0xffe5b4); // Warmer sunset light
        }

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        scene.add(dirLight, hemiLight);

        this.generatePlatforms(scene, colorRock, colorSnow);
    }

    private generatePlatforms(scene: THREE.Scene, colorRock: THREE.Color, colorSnow: THREE.Color) {
        const numPlatforms = 160;
        const platformMat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.2 });

        const fujiWoodColor = new THREE.Color(0xffa8c0); 

        for (let i = 0; i < numPlatforms; i++) {
            const t = i / numPlatforms;
            const y = 35 + t * 270;

            let r = 0;
            if (this.type === 'fuji') {
                if (y < 350) {
                    r = Math.sqrt(-6000 * Math.log(y / 350));
                }
            } else {
                if (y < 350) {
                    r = Math.sqrt(-20000 * Math.log(y / 350));
                }
            }
            r += 18;

            const angle = t * Math.PI * 16;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            const size = 18 - (t * 10);
            const boxGeo = new THREE.BoxGeometry(size, 2, size);

            const pMat = platformMat.clone();
            
            if (this.type === 'fuji') {
                pMat.color.copy(fujiWoodColor);
            } else {
                if (y > 180) {
                    pMat.color.lerpColors(colorRock, colorSnow, Math.min(1, (y - 180) / 40));
                } else {
                    pMat.color.copy(colorRock);
                }
            }

            const pMesh = new THREE.Mesh(boxGeo, pMat);
            pMesh.position.set(x, y, z);
            scene.add(pMesh);

            const box = new THREE.Box3().setFromObject(pMesh);
            this.platforms.push({ mesh: pMesh, box: box, r: r, baseAngle: angle, originY: y, prevX: x, prevZ: z });
        }
    }

    public update(time: number) {
        for (let i = 0; i < this.platforms.length; i++) {
            const p = this.platforms[i];
            
            p.prevX = p.mesh.position.x;
            p.prevZ = p.mesh.position.z;

            const currentAngle = p.baseAngle + Math.sin(time * 0.3 + i) * 0.15; 
            p.mesh.position.x = Math.cos(currentAngle) * p.r;
            p.mesh.position.z = Math.sin(currentAngle) * p.r;
            
            p.mesh.updateMatrixWorld();
            p.box.setFromObject(p.mesh); 
        }
    }

    public getHeight(x: number, z: number): number {
        const dist = Math.sqrt(x * x + z * z);

        if (this.type === 'fuji') {
            let y = 350 * Math.exp(-(dist * dist) / 6000); // Sheer tight summit
            y += (Math.sin(x * 0.05) * Math.cos(z * 0.05)) * 1.5;
            return Math.max(0, y);
        }

        let y = 350 * Math.exp(-(dist * dist) / 20000);
        if (y > 2) {
            y += (Math.sin(x * 0.1) * Math.cos(z * 0.1)) * 3.0;
            y += (Math.sin(x * 0.3) * Math.cos(z * 0.3)) * 2.0;
            y += (Math.sin(x * -0.2) * Math.cos(z * -0.2)) * 3.0;
        }
        y += (Math.sin(x * 0.02) * Math.cos(z * 0.02)) * 6.0;

        return Math.max(0, y);
    }
}
