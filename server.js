import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(express.static(join(__dirname, 'dist')));
app.get('/{*path}', (_req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));

const rooms = new Map();   // roomId -> Map<id, ws>
const playerHP = new Map(); // id -> hp
let nextId = 1;

wss.on('connection', (ws) => {
    const id = String(nextId++);
    let currentRoom = null;
    let playerIndex = 1;

    ws.on('message', (raw) => {
        const msg = JSON.parse(raw);

        if (msg.type === 'join') {
            currentRoom = msg.room;
            if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Map());
            const room = rooms.get(currentRoom);

            if (room.size >= 10) {
                ws.send(JSON.stringify({ type: 'room_full' }));
                console.log(`[${currentRoom}] ${msg.username} rejected — room full`);
                return;
            }

            playerIndex = room.size + 1;
            room.set(id, ws);
            playerHP.set(id, 3);

            ws.send(JSON.stringify({ type: 'joined', id, playerIndex }));
            broadcast(currentRoom, id, { type: 'player_joined', id, username: msg.username, playerIndex });
            console.log(`[${currentRoom}] ${msg.username} joined as P${playerIndex}`);
        }

        if (msg.type === 'state') {
            broadcast(currentRoom, id, { ...msg, id });
        }

        if (msg.type === 'hit' && currentRoom && rooms.has(currentRoom)) {
            const targetId = msg.targetId;
            const target = rooms.get(currentRoom).get(targetId);
            if (target?.readyState === 1) {
                const hp = Math.max(0, (playerHP.get(targetId) ?? 3) - 1);
                playerHP.set(targetId, hp <= 0 ? 3 : hp);
                target.send(JSON.stringify({ type: 'hit', hp }));
                // Tell everyone the peer's new HP for health bar update
                broadcast(currentRoom, targetId, { type: 'peer_hp', id: targetId, hp });
            }
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).delete(id);
            broadcast(currentRoom, id, { type: 'player_left', id });
            if (rooms.get(currentRoom).size === 0) rooms.delete(currentRoom);
        }
    });
});

function broadcast(room, senderId, msg) {
    if (!room || !rooms.has(room)) return;
    const data = JSON.stringify(msg);
    for (const [pid, client] of rooms.get(room)) {
        if (pid !== senderId && client.readyState === 1) client.send(data);
    }
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server on port ${PORT}`));
