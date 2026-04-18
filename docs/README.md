# ASCENSION — King of the Hill

A first-person bunnyhopping game built with Three.js and TypeScript. Players climb procedurally-generated mountains using Source engine-style movement physics: bunnyhopping, air-strafing, and precise platform jumps.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (ES2022) |
| 3D Rendering | Three.js v0.183.2 |
| Build Tool | Vite v6.3 |
| Input | Pointer Lock API |
| Fonts | Google Fonts (Inter, Outfit) |

---

## Project Structure

```
DADA/
├── src/
│   ├── main.ts        # Bootstrap, game loop, scene setup
│   ├── Player.ts      # FPS controller, physics, collision
│   └── Terrain.ts     # Procedural map generation, platforms
├── public/
│   ├── classic.png    # Classic Peak menu card image
│   └── fuji.png       # Mount Fuji menu card image
├── docs/              # Design and implementation documents
├── index.html         # Entry point, main menu overlay
└── src/style.css      # HUD, menu, and UI styling
```

---

## Maps

### Classic Peak
A chaotic, jagged mountain with multi-layered fractal noise. Light blue sky, gray rock, 160 spiral platforms that shrink from size 18 at the base to 8 near the summit.

### Mount Fuji
A smooth stratovolcano with a Gaussian height curve. Sakura pink sunset sky, dark ash rock, white snow cap, pink-tinted platforms. Tight vertical compression makes the summit feel imposing.

---

## Movement Physics

ASCENSION replicates Source engine movement mechanics exactly.

### Constants

| Parameter | Value |
|---|---|
| Gravity | 80.0 u/s² |
| Ground friction | 4.0 |
| Max ground speed | 27.0 u/s |
| Air acceleration | 12.0 |
| Max air gain per tick | 3.0 u/s |
| Jump velocity | 29.0 u/s |
| Jump buffer window | 150 ms |

### Bunnyhopping
Jump at the exact frame of landing to bypass ground friction and chain movement speed across multiple jumps. No auto-bhop — timing is manual and skill-dependent.

### Air-Strafing
Hold A or D while moving the mouse in the same direction mid-air. The air acceleration cap (3 u/s) is applied per-tick, but each strafe direction change accumulates speed, allowing velocity well above the ground cap.

### Jump Buffering
Pressing space up to 150 ms before landing queues the jump so it fires on the first grounded frame. This makes bhop timing more forgiving without removing the skill ceiling.

---

## Collision System

- **3D AABB** sweep detection against all 160 platforms each frame
- **Platform displacement** — player inherits platform velocity when standing on a moving platform
- **Head bonk** — upward velocity inverted on ceiling contact
- **Wall push-off** — 50% velocity damping on lateral collision

---

## Physics Pipeline (per frame)

1. Clamp delta time to 0.1 s max
2. Animate platforms (sine-wave sway)
3. Detect grounding and platform collisions
4. Apply jump buffer; fire jump if queued and grounded
5. Apply gravity if airborne
6. Apply friction if grounded
7. Calculate wish-direction from camera orientation + WASD
8. Apply ground or air acceleration toward wish-direction
9. Integrate velocity → update camera position

---

## HUD

- **Velocity meter** — bottom-left, shows horizontal speed in cyan
- **Crosshair** — centered dot
- **Pause overlay** — click to release pointer lock; pulsing animation

---

## Controls

| Key / Input | Action |
|---|---|
| W A S D | Move |
| Space | Jump |
| Mouse | Look |
| Click | Lock pointer / resume |
| Escape | Pause |

---

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, select a map, click to lock the pointer, and start climbing.

---

## Design Documents

- [bhop_implementation_plan.md](bhop_implementation_plan.md) — Source engine physics architecture
- [fuji_implementation_plan.md](fuji_implementation_plan.md) — Mount Fuji map and map-selection system
