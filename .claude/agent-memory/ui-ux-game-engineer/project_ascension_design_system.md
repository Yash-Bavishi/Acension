---
name: Ascension Design System
description: Core visual conventions, z-index layers, palette, and component patterns for the Ascension BHOP climbing game UI
type: project
---

Game title: Ascension :: King of the Hill — a Three.js BHOP climbing/multiplayer game.

**Primary palette**
- Brand gradient: `linear-gradient(135deg, #00f2fe, #4facfe)` — used on logo, active buttons, winner name
- Background dark: `#050510`
- Muted text: `#8a90a5` / `rgba(138,144,165,1)`
- Danger / HP: `#ff3333`
- Speed accent: `rgba(0,242,254,1)` (cyan) — bhop counter, velocity display, milestone banner glow

**Typography**
- Display / UI labels: `Outfit` (weights 700, 900) — letter-spacing 2–10px, uppercase
- Body / HUD: `Inter` (weights 400, 600, 800)
- Monospace readouts: `Outfit, monospace`

**Z-index layer stack**
- Canvas: base
- HUD elements (crosshair, velocity, bhop, ammo, HP): z-index 4–6
- Hit marker: z-index 10
- Pause overlay (`#blocker`): z-index 10
- Main menu (`#main-menu`): z-index 20
- Winner screen (`#winner-screen`): z-index 50

**Primary button style** (mirrors `.toggle-btn.active`)
- Background: `linear-gradient(135deg, #00f2fe, #4facfe)`
- Color: `#000`
- Border-radius: 50px
- Font: Outfit 900, letter-spacing 2–3px
- Hover: `transform: scale(1.05)` + boosted `box-shadow` glow in cyan

**Existing keyframe animations**
- `pulse` — opacity 0.8→1→0.8, scale 1→1.02→1, defined globally; reused by pause menu and winner crown
- `milestone-pop` — scale + fade for banner popups
- `shake` — horizontal shake for invalid input

**UI tech stack**
- Three.js rendered to `#canvas` (fixed, full viewport)
- Vite + TypeScript (`src/main.ts` entry)
- All overlays are plain HTML/CSS siblings of `#canvas` inside `#div#app`
- Custom events dispatched on `window` for cross-module game signals (e.g. `summit-reached`)
- Pointer lock via `player.controls.lock()` / `.unlock()`

**How to apply:** When adding new overlays, follow the z-index stack above. New buttons should match the `.toggle-btn.active` gradient style. Glow effects use `box-shadow` with `rgba(0,242,254,...)` at ~0.3–0.6 opacity.
