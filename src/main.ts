import './style.css';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

camera.position.set(0, 5, 120);

// Skybox & Fog
scene.background = new THREE.Color(0x87ceeb); // Light Sky Blue
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

// Terrain Generation Math
function getTerrainHeight(x: number, z: number): number {
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
    const y = getTerrainHeight(x, z);
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
const terrain = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrain);

// Lighting
const dirLight = new THREE.DirectionalLight(0xffffe0, 1.5);
dirLight.position.set(100, 200, 50);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(dirLight, hemiLight);

// Controls
const controls = new PointerLockControls(camera, document.body);

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

if (instructions && blocker) {
  blocker.addEventListener('click', () => {
    controls.lock();
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && !controls.isLocked) {
      controls.lock();
    }
  });

  controls.addEventListener('lock', () => {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
  });

  controls.addEventListener('unlock', () => {
    blocker.style.display = 'flex';
    instructions.style.display = '';
  });
}
scene.add(camera);

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

const onKeyDown = (event: KeyboardEvent) => {
  const code = event.code;
  const key = event.key.toLowerCase();

  if (code === 'ArrowUp' || code === 'KeyW' || key === 'w') moveForward = true;
  if (code === 'ArrowLeft' || code === 'KeyA' || key === 'a') moveLeft = true;
  if (code === 'ArrowDown' || code === 'KeyS' || key === 's') moveBackward = true;
  if (code === 'ArrowRight' || code === 'KeyD' || key === 'd') moveRight = true;
  
  if (code === 'Space' || key === ' ') {
    if (canJump === true) {
      velocity.y += 150;
      canJump = false;
    }
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  const code = event.code;
  const key = event.key.toLowerCase();

  if (code === 'ArrowUp' || code === 'KeyW' || key === 'w') moveForward = false;
  if (code === 'ArrowLeft' || code === 'KeyA' || key === 'a') moveLeft = false;
  if (code === 'ArrowDown' || code === 'KeyS' || key === 's') moveBackward = false;
  if (code === 'ArrowRight' || code === 'KeyD' || key === 'd') moveRight = false;
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

const PLAYER_HEIGHT = 5;

function animate() {
  requestAnimationFrame(animate);

  let delta = clock.getDelta();
  if (delta > 0.1) delta = 0.1;

  if (controls.isLocked === true) {
    // Apply friction to x and z
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    // Apply gravity
    velocity.y -= 9.8 * 50.0 * delta;

    // Movement directions
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); 

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Apply vertical velocity to camera position
    camera.position.y += velocity.y * delta;

    // Collision Detection & exact terrain height mathematical calculation
    const floorY = getTerrainHeight(camera.position.x, camera.position.z);

    if (camera.position.y < floorY + PLAYER_HEIGHT) {
      velocity.y = 0;
      camera.position.y = floorY + PLAYER_HEIGHT;
      canJump = true;
    }
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
