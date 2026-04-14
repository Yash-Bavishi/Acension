import './style.css';
import * as THREE from 'three';
import { Terrain, MapType } from './Terrain';
import { Player } from './Player';

const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

let terrain: Terrain | null = null;
let player: Player | null = null;
const clock = new THREE.Clock();
let isStarted = false;

function startGame(mapType: MapType) {
    // Hide Main Menu organically
    document.getElementById('main-menu')!.style.display = 'none';
    
    // Un-hide in-game UI overlay
    document.getElementById('crosshair')!.style.display = 'block';
    document.getElementById('velocity-display')!.style.display = 'block';

    terrain = new Terrain(scene, mapType);
    player = new Player(scene);
    
    isStarted = true;
    animate();
    
    // Auto-lock controls after a brief moment so the DOM properly transitions
    setTimeout(() => {
        if (player && player.controls) {
            player.controls.lock();
        }
    }, 100);
}

// Bind Map Selection Cards
document.getElementById('btn-classic')?.addEventListener('click', () => startGame('classic'));
document.getElementById('btn-fuji')?.addEventListener('click', () => startGame('fuji'));

function animate() {
    if (!isStarted || !terrain || !player) return;
    requestAnimationFrame(animate);

    let delta = clock.getDelta();
    if (delta > 0.1) delta = 0.1;

    terrain.update(clock.getElapsedTime());
    player.update(delta, terrain);

    const velocityMeter = document.getElementById('velocity-display');
    if (velocityMeter) {
        velocityMeter.innerText = Math.round(player.getHorizontalSpeed()).toString() + ' u/s';
    }

    renderer.render(scene, player.camera);
}

// Wait for click event explicitly before updating resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (player) {
         player.camera.aspect = window.innerWidth / window.innerHeight;
         player.camera.updateProjectionMatrix();
    }
});
