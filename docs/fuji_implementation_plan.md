# Map Selection Menu & Mount Fuji Map Implementation

This plan outlines the steps required to introduce a stateful Main Menu to the game, allowing players to choose between the current "Classic" King of the Hill mountain and a brand-new "Mount Fuji" map variant.

## Goal Description
1. Create a modern, visually stunning user interface (Main Menu) that displays when the game loads.
2. Introduce a new Map Type architecture within the engine to construct multiple procedural domains seamlessly.
3. Add a "Mount Fuji" variant featuring a massive, ultra-smooth volcanic cone, cherry blossom/sunset themed atmospheric lighting, and a distinct pure white snowcap.

## User Review Required

> [!IMPORTANT]
> The Main Menu design will completely reshape the initial loading experience. I will implement a modern "glassmorphism" aesthetic with vibrant hover micro-animations and typography. Please confirm if you have a specific color palette preference for the menu background.

> [!NOTE]  
> The "Mount Fuji" generation formula will intentionally remove the highly chaotic/jagged base noise present in the Classic map. It will prioritize an extremely sheer, smooth parabolic slope all the way to a sharp snowy peak to emulate a recognizable stratovolcano structure.

## Proposed Changes

---

### Core Mechanics & Engine

#### [MODIFY] [Terrain.ts](file:///c:/Users/Yash/Documents/Projects/DADA/src/Terrain.ts)
- Update `constructor` to receive `mapType: 'classic' | 'fuji'`.
- Conditionalize the Scene Lighting and Skybox configuration based on `mapType` (e.g. `0xffa8c0` Sakura/Sunset fog for Fuji).
- Conditionalize the `vertexColor` assignment in the procedural generation loop to use vivid greens/pinks at the base, dark ash/gray in the middle, and deep white caps at the peak.
- Conditionalize the output of `getHeight(x, z)` to supply smooth, massive math without jagged base noise when rendering Fuji.

#### [MODIFY] [main.ts](file:///c:/Users/Yash/Documents/Projects/DADA/src/main.ts)
- Refactor the startup process to halt `Player` and `Terrain` generation until a map choice is finalized via the UI.
- Implement an initialization function `startGame(mapName)` that instantiates the exact scene configuration.

---

### User Interface & Aesthetics

#### [MODIFY] [index.html](file:///c:/Users/Yash/Documents/Projects/DADA/index.html)
- Extract the basic `#blocker` structure and embed a premium HTML5 Main Menu element featuring two primary map card selectors. Include elements for map titles ("Classic" / "Mount Fuji") and brief descriptions.

#### [MODIFY] [style.css](file:///c:/Users/Yash/Documents/Projects/DADA/style.css)
- Implement a complete CSS overhaul importing the `Inter` and `Outfit` premium Google Fonts.
- Apply high-fidelity UI techniques: blur backdrops, soft box-shadows, animated gradients, and 3D hover transition effects for the Map Selection cards.

## Open Questions
- Do you want the spiral jumping platforms on the Mount Fuji map to be textured like pure snow, Sakura wood, or Ash Rock? 

## Verification Plan

### Automated Tests
- Validate TypeScript compilation `npm run build` after restructuring the bootstrap sequence in `main.ts`.

### Manual Verification
- Boot `npm run dev`.
- Ensure the game does *not* instantly drop the player into the world, but presents the premium menu.
- Click "Mount Fuji" and verify the generated terrain perfectly mimics a massive, sheer, smooth volcano with dynamic platform spirals.
