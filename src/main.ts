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
let bhopMode: 'auto' | 'manual' = 'auto';

// Bhop mode toggle
document.getElementById('mode-auto')?.addEventListener('click', () => {
    bhopMode = 'auto';
    document.getElementById('mode-auto')!.classList.add('active');
    document.getElementById('mode-manual')!.classList.remove('active');
});
document.getElementById('mode-manual')?.addEventListener('click', () => {
    bhopMode = 'manual';
    document.getElementById('mode-manual')!.classList.add('active');
    document.getElementById('mode-auto')!.classList.remove('active');
});

function startGame(mapType: MapType) {
    const input = document.getElementById('username-input') as HTMLInputElement;
    const username = input.value.trim();
    if (!username) {
        input.classList.add('shake');
        input.placeholder = 'Name required!';
        setTimeout(() => {
            input.classList.remove('shake');
            input.placeholder = 'Enter your name';
        }, 600);
        return;
    }

    // Hide Main Menu organically
    document.getElementById('main-menu')!.style.display = 'none';

    // Un-hide in-game UI overlay
    document.getElementById('crosshair')!.style.display = 'block';
    document.getElementById('velocity-display')!.style.display = 'block';

    const usernameDisplay = document.getElementById('username-display')!;
    usernameDisplay.innerText = username;
    usernameDisplay.style.display = 'block';

    terrain = new Terrain(scene, mapType);
    player = new Player(scene, bhopMode);
    player.setSpawn(terrain.spawnPoint, terrain.spawnAngleY);

    
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
