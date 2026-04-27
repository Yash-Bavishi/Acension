import * as THREE from 'three';

interface Peer {
    mesh: THREE.Mesh;
    mat: THREE.MeshStandardMaterial;
    baseColor: THREE.Color;
    targetPos: THREE.Vector3;
    targetYaw: number;
    hp: number;
    healthBar: THREE.Sprite;
    hitFlash: number;
}

export class Multiplayer {
    private ws!: WebSocket;
    private peers = new Map<string, Peer>();
    private scene: THREE.Scene;
    private sendTimer = 0;
    private readonly SEND_RATE = 1 / 20;
    public myId = '';
    public myPlayerIndex = 1;
    private hp = 3;
    public onDeath: (() => void) | null = null;
    public onHit: ((hp: number) => void) | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    private setStatus(text: string) {
        const el = document.getElementById('mp-status');
        if (el) { el.style.display = 'block'; el.innerText = text; }
    }

    public getPeerMeshes(): { id: string; mesh: THREE.Mesh }[] {
        return [...this.peers.entries()].map(([id, p]) => ({ id, mesh: p.mesh }));
    }

    public sendHit(targetId: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'hit', targetId }));
        }
    }

    public flashPeer(peerId: string) {
        const peer = this.peers.get(peerId);
        if (peer) peer.hitFlash = 0.18;
    }

    public connect(room: string, username: string) {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${proto}//${location.host}`);

        this.ws.onopen = () => {
            this.setStatus('🟢 Connected — joining room...');
            this.ws.send(JSON.stringify({ type: 'join', room, username }));
        };

        this.ws.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            if (msg.type === 'joined') {
                this.myId = msg.id;
                this.myPlayerIndex = msg.playerIndex;
                this.setStatus(`🟢 Room: ${room} | You: P${msg.playerIndex}`);
            } else if (msg.type === 'state') {
                this.updatePeer(msg);
                this.setStatus(`🟢 Room: ${room} | You: P${this.myPlayerIndex} | Players: ${this.peers.size + 1}`);
            } else if (msg.type === 'player_left') {
                this.removePeer(msg.id);
                this.setStatus(`🟢 Room: ${room} | You: P${this.myPlayerIndex} | Players: ${this.peers.size + 1}`);
            } else if (msg.type === 'player_joined') {
                this.setStatus(`🟢 Room: ${room} | You: P${this.myPlayerIndex} | Players: ${this.peers.size + 1}`);
            } else if (msg.type === 'hit') {
                this.hp = msg.hp;
                this.onHit?.(this.hp);
                if (this.hp <= 0) {
                    this.hp = 3;
                    this.onDeath?.();
                }
            } else if (msg.type === 'peer_hp') {
                const peer = this.peers.get(msg.id);
                if (peer) {
                    peer.hp = msg.hp;
                    peer.hitFlash = 0.18;
                    this.updateHealthBar(peer);
                }
            } else if (msg.type === 'room_full') {
                alert('Room is full! Max 10 players per room.');
                location.reload();
            }
        };

        this.ws.onerror = () => this.setStatus('🔴 Connection error');
        this.ws.onclose = () => this.setStatus('🔴 Disconnected');
    }

    private makeHealthBar(hp: number): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 120; canvas.height = 20;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 120, 20);
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < hp ? '#ff3333' : '#333';
            ctx.fillRect(i * 42 + 2, 2, 36, 16);
        }
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
        sprite.scale.set(4, 0.7, 1);
        sprite.position.set(0, 5.2, 0);
        return sprite;
    }

    private updateHealthBar(peer: Peer) {
        const canvas = document.createElement('canvas');
        canvas.width = 120; canvas.height = 20;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 120, 20);
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < peer.hp ? '#ff3333' : '#333';
            ctx.fillRect(i * 42 + 2, 2, 36, 16);
        }
        (peer.healthBar.material as THREE.SpriteMaterial).map!.image = canvas;
        (peer.healthBar.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }

    private getColor(playerIndex: number): THREE.Color {
        return playerIndex === 1
            ? new THREE.Color(0.2, 0.5, 1.0)
            : new THREE.Color(1.0, 0.2, 0.2);
    }

    private updatePeer(data: { id: string; x: number; y: number; z: number; yaw: number; username: string; playerIndex: number }) {
        if (!this.peers.has(data.id)) {
            const baseColor = this.getColor(data.playerIndex);
            const mat = new THREE.MeshStandardMaterial({
                color: baseColor.clone(),
                emissive: baseColor.clone().multiplyScalar(0.15),
                roughness: 0.6,
                metalness: 0.2
            });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5, 1.8), mat);

            // Username label
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 64;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(data.username || 'Player', 128, 44);
            const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
            label.scale.set(5, 1.2, 1);
            label.position.set(0, 4, 0);
            mesh.add(label);

            const healthBar = this.makeHealthBar(3);
            mesh.add(healthBar);

            this.scene.add(mesh);
            this.peers.set(data.id, {
                mesh, mat, baseColor,
                targetPos: new THREE.Vector3(data.x, data.y - 3, data.z),
                targetYaw: data.yaw,
                hp: 3, healthBar, hitFlash: 0
            });
        }

        const peer = this.peers.get(data.id)!;
        peer.targetPos.set(data.x, data.y - 3, data.z);
        peer.targetYaw = data.yaw;
    }

    private removePeer(id: string) {
        const peer = this.peers.get(id);
        if (peer) { this.scene.remove(peer.mesh); this.peers.delete(id); }
    }

    public update(delta: number, camera: THREE.Camera, username: string) {
        for (const peer of this.peers.values()) {
            peer.mesh.position.lerp(peer.targetPos, Math.min(1, 12 * delta));
            peer.mesh.rotation.y += (peer.targetYaw - peer.mesh.rotation.y) * Math.min(1, 12 * delta);

            // Hit flash
            if (peer.hitFlash > 0) {
                peer.hitFlash -= delta;
                peer.mat.color.set(peer.hitFlash > 0 ? 0xffffff : peer.baseColor);
                peer.mat.emissive.set(peer.hitFlash > 0 ? 0xff0000 : peer.baseColor.clone().multiplyScalar(0.15));
            } else {
                peer.mat.color.copy(peer.baseColor);
            }
        }

        this.sendTimer += delta;
        if (this.sendTimer >= this.SEND_RATE) {
            this.sendTimer = 0;
            if (this.ws?.readyState === WebSocket.OPEN && this.myId) {
                this.ws.send(JSON.stringify({
                    type: 'state',
                    x: camera.position.x,
                    y: camera.position.y,
                    z: camera.position.z,
                    yaw: camera.rotation.y,
                    username,
                    playerIndex: this.myPlayerIndex
                }));
            }
        }
    }
}
