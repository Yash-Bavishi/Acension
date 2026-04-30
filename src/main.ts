import './style.css';
import * as THREE from 'three';
import { Terrain, MapType } from './Terrain';
import { Player } from './Player';
import { PacerBot } from './PacerBot';
import { Multiplayer } from './Multiplayer';
import { Portal } from './Portal';

const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

let terrain: Terrain | null = null;
let player: Player | null = null;
let pacerBot: PacerBot | null = null;
let multiplayer: Multiplayer | null = null;
let currentUsername = '';
const clock = new THREE.Clock();
let isStarted = false;
let bhopMode: 'auto' | 'manual' = 'auto';
let summitReached = false;
const portals: Portal[] = [];

// Parse portal entry params
const urlParams = new URLSearchParams(window.location.search);
const isPortalEntry = urlParams.get('portal') === 'true';
const portalRef = urlParams.get('ref') || '';
const portalUsername = urlParams.get('username') || '';

// Auto-start if arriving from a portal (no loading screen)
if (isPortalEntry) {
    const input = document.getElementById('username-input') as HTMLInputElement;
    if (input) input.value = portalUsername || 'Visitor';
    document.getElementById('main-menu')!.style.display = 'none';
    window.addEventListener('DOMContentLoaded', () => startGame('classic'), { once: true });
    // Fallback if DOMContentLoaded already fired
    if (document.readyState !== 'loading') startGame('classic');
}

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

    document.getElementById('main-menu')!.style.display = 'none';

    document.getElementById('crosshair')!.style.display = 'block';
    document.getElementById('velocity-display')!.style.display = 'block';

    const usernameDisplay = document.getElementById('username-display')!;
    usernameDisplay.innerText = username;
    usernameDisplay.style.display = 'block';
    currentUsername = username;

    const roomInput = document.getElementById('room-input') as HTMLInputElement;
    const room = roomInput.value.trim() || 'default';
    multiplayer = new Multiplayer(scene);
    multiplayer.connect(room, username);

    const updateHPDisplay = (hp: number) => {
        for (let i = 1; i <= 3; i++) {
            document.getElementById(`hp-${i}`)?.classList.toggle('lost', i > hp);
        }
    };

    multiplayer.onHit = (hp: number) => {
        updateHPDisplay(hp);
        const flash = document.getElementById('fall-flash')!;
        flash.style.opacity = '0.6';
        setTimeout(() => { flash.style.opacity = '0'; }, 300);
    };
    multiplayer.onDeath = () => {
        updateHPDisplay(3);
        if (player && terrain) {
            player.worldVelocity.set(0, 0, 0);
            player.camera.position.copy(terrain.spawnPoint);
        }
    };

    terrain = new Terrain(scene, mapType);
    player = new Player(scene, bhopMode);
    player.setSpawn(terrain.spawnPoint, terrain.spawnAngleY);
    pacerBot = new PacerBot(scene, terrain, 0.75);

    const hpDisplay = document.getElementById('hp-display')!;
    hpDisplay.style.display = 'flex';
    const hitMarker = document.getElementById('hit-marker')!;
    hitMarker.style.display = 'block';
    updateHPDisplay(3);

    player.onHitConfirm = () => {
        hitMarker.style.opacity = '1';
        setTimeout(() => { hitMarker.style.opacity = '0'; }, 180);
    };

    const bhopDisplay = document.getElementById('bhop-display')!;
    const bhopCount = document.getElementById('bhop-count')!;
    bhopDisplay.style.display = 'flex';

    const ammoDisplay = document.getElementById('ammo-display')!;
    const ammoCount = document.getElementById('ammo-count')!;
    ammoDisplay.style.display = 'flex';
    player.onAmmoChange = (ammo) => {
        ammoCount.innerText = ammo.toString();
        ammoCount.style.color = ammo <= 3 ? '#ff4444' : '#ffffff';
    };
    let bhopFlashTimeout: ReturnType<typeof setTimeout> | null = null;

    const milestoneBanner = document.getElementById('milestone-banner')!;
    const milestones: Record<number, string> = { 5: 'STREAKING', 10: 'ON FIRE', 25: 'INSANE', 50: 'GODLIKE' };
    let milestoneTimeout: ReturnType<typeof setTimeout> | null = null;

    player.onBhop = (chain: number) => {
        bhopCount.innerText = chain.toString();
        bhopDisplay.classList.add('flash');
        if (bhopFlashTimeout) clearTimeout(bhopFlashTimeout);
        bhopFlashTimeout = setTimeout(() => bhopDisplay.classList.remove('flash'), 120);

        if (milestones[chain]) {
            milestoneBanner.textContent = milestones[chain];
            milestoneBanner.classList.remove('show');
            void milestoneBanner.offsetWidth;
            milestoneBanner.classList.add('show');
            if (milestoneTimeout) clearTimeout(milestoneTimeout);
            milestoneTimeout = setTimeout(() => milestoneBanner.classList.remove('show'), 1400);
        }
    };

    // --- Portals ---
    const sp = terrain.spawnPoint;
    const playerColor = 'blue'; // default; multiplayer updates after connect

    // Portals — side by side, right next to spawn, grounded
    const epx = sp.x - 5, epz1 = sp.z - 8, epz2 = sp.z + 8;
    const exitPortalPos = new THREE.Vector3(epx, terrain.getHeight(epx, epz1) + 5, epz1);
    portals.push(new Portal(scene, exitPortalPos, '🌀 Vibe Jam 2026', 0xaa44ff, () => {
        const url = new URL('https://vibejam.cc/portal/2026');
        url.searchParams.set('username', currentUsername || 'Visitor');
        url.searchParams.set('ref', window.location.origin);
        url.searchParams.set('speed', player ? Math.round(player.getHorizontalSpeed()).toString() : '0');
        url.searchParams.set('color', playerColor);
        if (player) {
            url.searchParams.set('rotation_y', player.camera.rotation.y.toFixed(3));
        }
        window.location.href = url.toString();
    }));

    // Return portal → back to previous game (only if player arrived from a portal)
    if (portalRef) {
        const returnPortalPos = new THREE.Vector3(epx, terrain.getHeight(epx, epz2) + 5, epz2);
        portals.push(new Portal(scene, returnPortalPos, '↩ Return Portal', 0x00f2fe, () => {
            const base = portalRef.startsWith('http') ? portalRef : `https://${portalRef}`;
            const url = new URL(base);
            url.searchParams.set('portal', 'true');
            url.searchParams.set('username', currentUsername || 'Visitor');
            url.searchParams.set('ref', window.location.origin);
            url.searchParams.set('speed', player ? Math.round(player.getHorizontalSpeed()).toString() : '0');
            url.searchParams.set('color', playerColor);
            window.location.href = url.toString();
        }));
    }

    isStarted = true;

    window.addEventListener('summit-reached', (e: Event) => {
        const username = (e as CustomEvent).detail.username;
        const screen = document.getElementById('winner-screen')!;
        document.getElementById('winner-name')!.innerText = username;
        screen.style.display = 'flex';
        if (player) player.controls.unlock();
    });
    document.getElementById('winner-restart')?.addEventListener('click', () => location.reload());

    animate();

    setTimeout(() => {
        if (player && player.controls) {
            player.controls.lock();
        }
    }, 100);
}

// Generate random room code
document.getElementById('btn-generate-room')?.addEventListener('click', () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    (document.getElementById('room-input') as HTMLInputElement).value = code;
});

// Bind Map Selection Cards
document.getElementById('btn-classic')?.addEventListener('click', () => startGame('classic'));
document.getElementById('btn-fuji')?.addEventListener('click', () => startGame('fuji'));

function onSummitReached(username: string) {
    summitReached = true;
    window.dispatchEvent(new CustomEvent('summit-reached', { detail: { username } }));
}

function animate() {
    if (!isStarted || !terrain || !player) return;
    requestAnimationFrame(animate);

    let delta = clock.getDelta();
    if (delta > 0.1) delta = 0.1;

    terrain.update(clock.getElapsedTime());
    multiplayer?.update(delta, player.camera, currentUsername);
    if (multiplayer) {
        player.setPeerMeshes(multiplayer.getPeerMeshes());
        player.onHitPeer = (peerId) => { multiplayer!.sendHit(peerId); multiplayer!.flashPeer(peerId); };
    }
    player.update(delta, terrain);
    pacerBot?.update(delta, terrain);
    if (player) portals.forEach(p => p.update(delta, player!.camera.position));

    // Summit win detection
    if (!summitReached) {
        const px = player.camera.position.x;
        const pz = player.camera.position.z;
        const xzDist = Math.sqrt(px * px + pz * pz);
        if (xzDist < 5 && player.camera.position.y > terrain.summitY - 8) {
            onSummitReached(currentUsername);
        }
    }

    const spd = player.getHorizontalSpeed();
    const velocityMeter = document.getElementById('velocity-display');
    if (velocityMeter) velocityMeter.innerText = Math.round(spd).toString() + ' u/s';
    const vignette = document.getElementById('speed-vignette');
    if (vignette) vignette.style.opacity = Math.min(1, spd / 120).toFixed(3);

    renderer.render(scene, player.camera);
}

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (player) {
        player.camera.aspect = window.innerWidth / window.innerHeight;
        player.camera.updateProjectionMatrix();
    }
});
