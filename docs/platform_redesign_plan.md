# Platform Redesign Plan

## Goal
Platforms zigzag up the mountain face with **progressive difficulty** — easy gaps at the bottom that gradually widen so bhopping speed naturally carries the player higher.

---

## Reference Sketch
- Platforms hug the mountain slope (not floating away from it)
- Zigzag left-right as height increases
- Gaps grow larger the higher you go
- Low vertical step between each platform (~3 units)

---

## Physics Budget

| State | Horizontal Speed | Jump Time | Max Range |
|---|---|---|---|
| Standing jump | 0 u/s | 0.73s | ~5 units |
| Running jump | 27 u/s | 0.73s | ~20 units |
| Bhop (medium) | 35 u/s | 0.73s | ~25 units |
| Bhop (fast) | 45 u/s | 0.73s | ~33 units |

---

## Spiral Layout

### Parameters
| Parameter | Value | Notes |
|---|---|---|
| `numStations` | 60 | More stations = smoother climb |
| `platSize` | 10×10 | Unchanged |
| `heightPerStep` | 3 units | Was ~5, lower = less vertical gap |
| `totalHeight` | 35 → 215 | 180 unit climb over 60 steps |
| `arcStep` | progressive (see below) | Increases with height |
| `pairHalfSpan` | 10 | Fixed lateral offset each side |

### Progressive Arc Step (gap between consecutive zigzag platforms)

The diagonal distance between alternating platforms is `sqrt(arcStep² + (2 * pairHalfSpan)²)`.
With `pairHalfSpan = 10`, lateral swing = 20 units.

| Zone | Stations | arcStep | Diagonal gap | Required |
|---|---|---|---|---|
| Bottom (easy) | 0–15 | 5 | ~21 units | Running jump |
| Middle | 16–35 | 10 | ~22 units | Clean bhop |
| Upper | 36–50 | 18 | ~27 units | Fast bhop |
| Top | 51–60 | 25 | ~32 units | Very fast bhop |

Formula: `arcStep(i) = 5 + (i / numStations) * 20`

### Platform Placement
- Keep `outwardR = r + 8` (closer to mountain face than current `+14`)
- Use `py = spiralY` (linear height, no terrain override — already fixed)
- Zigzag: `side = (i % 2 === 0) ? 1 : -1` (single platform per station)

---

## Mountain Changes
- **Increase mountain scale** so the climb feels tall and imposing
- Classic: change height formula constant from `350` → `420`
- Fuji: change from `350` → `420`
- This gives more vertical space and makes the spiral feel like a real climb

---

## Changes Required

### `Terrain.ts`
1. `numStations = 60`
2. `heightPerStep = 3` → `spiralY = 35 + i * 3` (not t-based)
3. `arcStep` computed per-station: `5 + (i / numStations) * 20`
4. `pairHalfSpan = 10`
5. `outwardR = r + 8`
6. Single platform per station, alternating side
7. Mountain height constant `350 → 420` in `getHeight()`

---

## What This Achieves
- Player walks onto first platform easily, no gap anxiety
- Each bhop naturally builds speed, unlocking the next platform
- Visual zigzag is clear — each hop crosses to the opposite side of the spiral
- Low vertical step (3 units) keeps the horizon visible and gaps feel fair
