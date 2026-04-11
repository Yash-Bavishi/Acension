import './style.css';
import * as THREE from 'three';
import { Terrain } from './Terrain';
import { Player } from './Player';

const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const terrain = new Terrain(scene);
const player = new Player(scene);
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    let delta = clock.getDelta();
    if (delta > 0.1) delta = 0.1;

    player.update(delta, terrain);

    const velocityMeter = document.getElementById('velocity-display');
    if (velocityMeter) {
        velocityMeter.innerText = Math.round(player.getHorizontalSpeed()).toString() + ' u/s';
    }

    renderer.render(scene, player.camera);
}

animate();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    player.camera.aspect = window.innerWidth / window.innerHeight;
    player.camera.updateProjectionMatrix();
});
