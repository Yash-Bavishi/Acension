import * as THREE from 'three';

export class Terrain {
    public mesh: THREE.Mesh;

    constructor(scene: THREE.Scene) {
        // Skybox & Fog
        scene.background = new THREE.Color(0x87ceeb); // Light Sky Blue
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

        // Generate Unified Terrain Mesh
        const terrainGeo = new THREE.PlaneGeometry(500, 500, 128, 128);
        terrainGeo.rotateX(-Math.PI / 2);

        const positions = terrainGeo.attributes.position;
        terrainGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(positions.count * 3), 3));
        const colors = terrainGeo.attributes.color;

        const colorSnow = new THREE.Color(0xffffff);
        const colorRock = new THREE.Color(0x6e6e6e);
        const colorGrass = new THREE.Color(0x3d8c40);
        const tempColor = new THREE.Color();

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            const y = this.getHeight(x, z);
            positions.setY(i, y);

            // Vertex colors based on elevation
            if (y > 35) {
                tempColor.lerpColors(colorRock, colorSnow, Math.min(1, (y - 35) / 10));
            } else if (y > 10) {
                tempColor.lerpColors(colorGrass, colorRock, Math.min(1, (y - 10) / 15));
            } else {
                tempColor.copy(colorGrass);
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
        
        // Lighting
        const dirLight = new THREE.DirectionalLight(0xffffe0, 1.5);
        dirLight.position.set(100, 200, 50);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        scene.add(dirLight, hemiLight);
    }

    public getHeight(x: number, z: number): number {
        const dist = Math.sqrt(x*x + z*z);
        
        // Base mountain shape (smooth Gaussian-like peak)
        let y = 60 * Math.exp(-(dist * dist) / 800); 
        
        // Add roughness (noise) to the mountain
        if (y > 2) {
           y += (Math.sin(x * 0.4) * Math.cos(z * 0.4)) * 3.0;
           y += (Math.sin(x * 1.2) * Math.cos(z * 1.2)) * 1.0;
           y += (Math.sin(x * -0.7) * Math.cos(z * -0.7)) * 2.0;
        }

        // Add rolling hills to the ground
        y += (Math.sin(x * 0.05) * Math.cos(z * 0.05)) * 3.0;
        
        return Math.max(0, y);
    }
}
