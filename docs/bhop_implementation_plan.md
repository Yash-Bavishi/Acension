# Counter-Strike: Global Offensive BHOP Mechanics Implementation

This document outlines the architectural plan for implementing CS:GO/Source engine bunnyhopping (BHOP) physics inside this Three.js project.

## Goal Description
Implement true Source engine movement. This includes air-strafing (where turning the mouse while pressing A/D allows you to gain speed and change direction mid-air without losing momentum) and bunnyhopping (chaining jumps exactly when hitting the ground to completely bypass ground friction).

## Proposed Changes

### `src/main.ts`

- **State Changes**: Replace local `velocity` with `worldVelocity` to track absolute momentum.
- **Input Tracking**: Continue tracking `W A S D` and `Space`. 
- **Direction Vectors**: Pull `forward` and `right` vectors natively from the camera's world matrix every frame to calculate the global `wishDir`.
- **Source Physics Algorithms**:
  - `ApplyFriction()`: Applied only when touching the ground. Exponentially decays speed by applying friction.
  - `Accelerate()`: Ground acceleration function. Accelerates the player along `wishDir` but caps the *projection* of the velocity vector onto the wish direction rather than the absolute speed (this enables strafe physics).
  - `AirAccelerate()`: Air acceleration function. Similar to `Accelerate` but uses a much lower speed cap (typically 30 units/s) coupled with massive acceleration. *This specific math quirk is what enables air-strafing and speed-gain bunnyhopping.*
- **Jumping**:
  - `worldVelocity.y` handles gravity decoupled from horizontal mechanics.
  - Jumping applies an instant upward impulse if touching the ground.
  - Purely manual timing: Hitting the ground instantly applies friction unless the jump key is executed within the exact contact frame. Auto-bhop is omitted to mimic competitive CS:GO mechanics.
- **Camera Movement**: Replace native PointerLockControls relative movement (`moveForward`) with absolute world-space displacement by explicitly adding the `worldVelocity * delta` directly to the `camera.position`.
