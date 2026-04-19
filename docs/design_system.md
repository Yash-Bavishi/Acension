# ASCENSION — Design System

The goal of this document is to define the visual language of ASCENSION so every future element — menus, HUD, weapons, bots, UI screens — feels like it belongs to the same world.

---

## The Vibe

**Dark. Clean. Fast. Arcadey.**

ASCENSION is not a realistic military shooter. It is a skill-based movement game. The aesthetic should feel like a premium mobile game or a stylized indie FPS — think low-poly geometry, neon-on-dark color, smooth glass UI. Nothing should feel out of place or overly detailed.

> If an element looks like it belongs in a AAA realistic FPS, it is wrong for this game.

---

## Color Palette

| Role | Color | Hex |
|---|---|---|
| Background / void | Near-black navy | `rgba(5, 5, 16, 1)` |
| Primary accent | Electric cyan | `rgba(0, 242, 254, 1)` |
| Secondary accent | Soft blue | `rgba(79, 172, 254, 1)` |
| Velocity / speed | Neon teal | `rgba(0, 255, 204, 1)` |
| Danger / damage | Hot red | `rgba(255, 34, 34, 1)` |
| Neutral text | Muted blue-gray | `rgba(138, 144, 165, 1)` |
| Disabled / hint | Dark slate | `rgba(80, 85, 101, 1)` |
| Surface glass | White 5% opacity | `rgba(255, 255, 255, 0.05)` |

The primary gradient (used for logos, active states, highlights):
```css
linear-gradient(135deg, rgba(0, 242, 254, 1) 0%, rgba(79, 172, 254, 1) 100%)
```

---

## Typography

| Use | Font | Weight | Style |
|---|---|---|---|
| Logo / titles | Outfit | 900 | All caps, wide letter-spacing |
| Headings | Outfit | 700–800 | |
| Body / labels | Inter | 400–600 | |
| HUD numbers | Outfit | 800 | Monospace feel |
| Hints / small labels | Monospace / Inter | 600 | Wide letter-spacing, uppercase |

Letter spacing: labels and hints use `2–6px` spacing to feel technical and precise.

---

## UI Components

### Glass Panels
All menus, cards, and overlays use a glass-morphism style:
```css
background: rgba(5, 5, 10, 0.7–0.85);
backdrop-filter: blur(10–25px);
border: 1px solid rgba(255,255,255,0.05–0.12);
border-radius: 12–20px;
```

### Buttons
- Pill-shaped (`border-radius: 50px`)
- Default: transparent with subtle border
- Active/selected: cyan gradient fill, dark text
- Hover: slight lift (`translateY(-2px)`) + glow shadow

### Input Fields
- Pill-shaped, same glass style as buttons
- Focus: cyan border glow
- Error state: red border + shake animation
- Placeholder: dark slate (`#404558`)

### Map Cards
- Large portrait cards (320×440px)
- Full-bleed background image with radial vignette overlay
- Content fades up from bottom on hover
- Hover: lifts + scale(1.02) + glow

---

## HUD

The HUD should be minimal. Information only when needed.

| Element | Position | Style |
|---|---|---|
| Crosshair | Center | 6px white dot, subtle shadow |
| Speed meter | Bottom-left | Neon teal, large Outfit 800, glass pill |
| Username | Top-right | Muted white, small uppercase, no background |
| Kill feed (future) | Top-right below username | Fades out after 3s |
| Health (future) | Bottom-right | Same glass pill style as speed |

HUD elements should **never** have heavy backgrounds or borders. Keep them lightweight — the world is the focus.

---

## 3D World Aesthetic

### Geometry
- Low-poly, flat-shaded where possible (`flatShading: true`)
- No normal maps or PBR detail textures
- Platforms: matte rock/snow colored boxes — simple and readable

### Weapons
The Desert Eagle is wrong for this game. The weapon should be:
- **Low-poly / stylized** — blocky, clean geometry, not photorealistic
- **Color-coded** — use game palette colors, not real metal textures
- **Fast-feeling** — wide FOV, close to screen center
- Options to explore:
  - Custom low-poly pistol or SMG mesh
  - Stylized energy/plasma weapon
  - No model at all — crosshair + particle muzzle flash only (cleanest option)

### Bots / Players
- Simple humanoid box geometry (current bot approach is correct)
- Color distinguishes team/enemy: blue body `#2255cc`, skin head `#ffcc99`
- Hit flash: full red `#ff2222` for 120ms
- No detailed character models — keep it readable and performant

### Effects
- Muzzle flash: warm point light `#ffaa33`, 80ms duration
- Bullet tracers: thin `#ffee88` lines, fade over 120ms
- Future: simple particle pops on hit, no complex VFX

---

## Animation Principles

- **Easing**: `cubic-bezier(0.2, 0.8, 0.2, 1)` for all UI transitions (fast out, smooth settle)
- **Duration**: 200–400ms for UI, never longer
- **Hover**: always lift + glow, never just color change alone
- **Feedback**: every interaction has a visual response (shake on error, flash on hit, glow on hover)

---

## What Doesn't Belong

- Realistic textures or PBR materials on weapons/characters
- Heavy drop shadows or harsh borders
- Serif fonts
- Warm/brown/earthy color palette on UI (that's the terrain, not the UI)
- Complex particle systems or post-processing (keep it light)
- Cluttered HUD — if it's not needed every second, it shouldn't be on screen

---

## Future Screens to Design

| Screen | Notes |
|---|---|
| Death screen | Minimal, fast — show killer name, respawn countdown |
| Win / summit reached | Celebratory but clean — time, speed stats |
| Leaderboard | Dark glass table, cyan accent on top row |
| Settings menu | Same glass panel style, toggle switches |
| Multiplayer lobby | Room code prominent, player list minimal |
