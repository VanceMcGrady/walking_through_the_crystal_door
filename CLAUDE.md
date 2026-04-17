# CLAUDE.md

Project-level guidance for Claude Code when working on this repository.

## Project Overview

This project is a **browser-based interactive music video** framed as a game. It is experienced once, for the duration of a single song. The player controls a wireframe human-like character on a white plane. As the character moves, the environment procedurally arises and shape-shifts around them. The objective is to find a **crystal door** somewhere in the field before the song ends.

This is a music video first, a game second. Visual cohesion, song-synchronization, and aesthetic intentionality matter more than traditional game design concerns (progression, difficulty curves, replayability systems).

## Core Constraints

- **Runtime is bounded by the song.** The song begins when the experience begins and the experience ends when the song ends.
- **The song is the clock.** All timing — animations, spawns, transitions, autoplay scripting — must derive from `audioContext.currentTime` or the Tone.js transport position, never from `requestAnimationFrame` timestamps or wall-clock time. A dropped frame should never cause desync.
- **Aesthetic: wireframe character on a white plane.** References include Vib-Ribbon, Rez, Thumper, Antichamber, the Radiohead "House of Cards" video. See `/references/` for curated image references; treat annotated filenames (e.g. `line_weight_goal.png`, `too_glossy_avoid.png`) as authoritative.
- **Three input modes must be supported:** keyboard, touch (mobile), and autoplay.
- **Controls are minimal:** movement (2D) + one `interact` action.

## Tech Stack

- **Language:** TypeScript
- **Build tool:** Vite
- **3D rendering:** Three.js (consider `react-three-fiber` only` if React is otherwise adopted)
- **Audio:** Tone.js (preferred for its transport/scheduler) or raw Web Audio API
- **Timeline animation:** GSAP, driven by song time (not wall time)
- **State:** Zustand or a hand-rolled state machine. Do not over-engineer — one song of runtime does not need Redux.
- **Touch joystick:** nipplejs, or a hand-rolled implementation
- **Seeded PRNG:** `mulberry32` or `alea` (determinism is required — see Procedural System)

Physics libraries (cannon-es, rapier) are **not** required. Character movement should be simple vector math on the plane.

## Architecture Principles

### The song is the source of truth for time

Every time-dependent subsystem reads from a single `SongClock` abstraction that wraps `audioContext.currentTime`. The game loop may use `requestAnimationFrame` for render pacing, but logical state advances as a function of song time.

### Input abstraction layer

An `InputManager` exposes a normalized input state:

```ts
interface InputState {
  movement: Vector2;       // normalized, magnitude 0..1
  interactPressed: boolean;
  interactJustPressed: boolean;
}
```

Three providers feed into it: `KeyboardProvider`, `TouchProvider`, `AutoplayProvider`. Only one is active at a time (user-selectable on entry). Game logic reads only from the abstraction.

### Deterministic procedural generation

All procedural content is seeded. Re-visiting a location produces the same content. Per-session randomness comes from a single top-level `songSeed` that combines with cell coordinates:

```
cellSeed = hash(cellX, cellY, songSeed)
```

Freezing `songSeed` to a chosen value yields a canonical, reproducible version of the experience — useful for a "definitive cut" of the video.

### Object pooling

Cells outside the active radius return their objects to a pool. No per-frame allocation of geometry. Prefer instanced rendering where shape families permit it.

## Procedural Environment System

The environment is a layered hybrid of procedural generation and song-authored direction. Neither pure procedural (feels directionless) nor fully scripted (feels like a cutscene).

### 1. Spatial substrate

- Plane divided into grid cells (default 10×10 world units).
- Cells within a radius of the character are active and populated.
- Distant cells recycle their contents to the object pool.
- Each cell has a deterministic seed; content is reproducible on revisit.

### 2. Shape generation

A curated palette of shape families. A cell's active preset (see Timeline) restricts which families may spawn:

- **Parametric primitives** — icosahedron, torus knot, helix, arch, spiral, superformula/superquadrics.
- **Noise-deformed meshes** — base mesh + 3D simplex displacement, varied by frequency/amplitude.
- **L-systems** — branching, skeletal, growing forms. Natural fit for the wireframe aesthetic.
- **Marching cubes over animated SDFs** — for blobby metamorphic moments.

### 3. Shape-shifting techniques

From cheapest to most expressive:

- **Vertex-shader deformation** — `time`, `audioLevel`, and seed passed as uniforms. Continuous breathing/undulation, essentially free.
- **Morph targets** — pre-baked target shapes blended via GSAP on the song timeline. Used for authored "cube melts into tree" moments.
- **Dissolve transitions** — shader-driven noise-threshold alpha for true topology changes; crossfade out old mesh, draw in new one.
- **Additive growth** — lines drawing themselves in, progressive vertex extrusion. Reads as "the world is being born."

Most objects idle on shader-driven breathing. Key moments promote to morph-target transformations. Section transitions trigger dissolve-and-replace at cell-region scale.

### 4. Audio-reactivity

`AnalyserNode` samples 3–4 frequency bands per frame:

- **Sub-bass → global pulse.** All active objects scale by `1 + k * bassLevel` (small k, ~0.05).
- **Mids → rotation + deformation amplitude.**
- **Highs → line shimmer / emissive flicker.**
- **Onsets → spawn triggers** in nearby cells.

Audio-reactivity is a **layer on top of** the procedural system, not the system itself. This keeps quiet passages coherent and makes loud moments feel earned.

### 5. Song timeline and style presets

Experience is authored via a JSON timeline that maps song time to style presets:

```json
[
  { "time": 0,    "section": "intro",   "preset": "sparse_calm",    "spawnRate": 0.2, "palette": "primitives" },
  { "time": 24.5, "section": "verse1",  "preset": "wandering",      "spawnRate": 0.5, "palette": "lsystem_sparse" },
  { "time": 51,   "section": "chorus",  "preset": "dense_swirl",    "spawnRate": 1.2, "palette": "mixed_morphing" },
  { "time": 94,   "section": "bridge",  "preset": "dissolution",    "spawnRate": 0.1, "palette": "dissolving_only" },
  { "time": 148,  "section": "final",   "preset": "convergent",     "spawnRate": 0.8, "palette": "crystalline" }
]
```

Each preset is a config bundle: allowed shape families, active morphing behaviors, audio-reactivity intensity, color/emission feel. The procedural engine reads from the currently-active preset; content stays varied while the *feel* tracks the song structure.

## The Crystal Door

The door is the narrative anchor and should feel distinct from the surrounding generative chaos.

- **Gradient toward the door.** The procedural system reads "distance to door" as an input. Far from the door: chaotic, ephemeral, fast-dissolving. Near the door: stable, sharp, crystalline, thicker lines. This is the primary navigation cue — no HUD is needed.
- **Distinct shape language near the door.** The immediate vicinity uses a structured grammar producing mathematical, architectural forms, contrasting with loose generative content elsewhere.
- **Door placement** may be fixed, randomized (by `songSeed`), or tied to a specific song moment. Decision pending.

## Controls

### Keyboard
- WASD or arrow keys for movement.
- `E` or `Space` for interact.

### Touch (mobile)
- Virtual thumbstick in bottom-left.
- Tap zone or button in bottom-right for interact.

### Autoplay
- Preferred implementation is **hybrid scripted/procedural**: the song timeline includes autoplay choreography beats (chorus = spin, bridge = drift toward door), with procedural motion between beats. The door-distance gradient provides a clean navigation signal.
- Autoplay is intended as the canonical "music video" viewing mode.

## Aesthetic Guidance for Generation Work

When generating visual assets or tuning rendering:

- Consult `/references/` first. Filenames encode intent.
- Key descriptors to get right: line weight (hairline vs. bold), hidden-line treatment, antialiasing, whether lines are pure black or slightly colored/glowing, plane treatment (pure white vs. subtle gradient/fog/grain), and how objects *arrive* (fade? draw-on? glitch?).
- When in doubt, favor restraint. The white plane should feel like negative space, not absence.

## Directory Conventions

```
/src
  /audio         Tone.js / Web Audio setup, SongClock, AnalyserNode pipeline
  /input         InputManager + providers (keyboard, touch, autoplay)
  /scene         Three.js scene root, camera, lighting, post-processing
  /character     Wireframe character rig + animation
  /procedural
    /cells       Spatial substrate, cell lifecycle, seeding
    /shapes      Shape family generators (primitives, lsystem, sdf, etc.)
    /morphing    Vertex shaders, morph targets, dissolve helpers
    /presets     Style preset definitions
  /timeline      Song timeline JSON loader + preset resolver
  /door          Crystal door + door-distance gradient
  /ui            Start screen, autoplay toggle, minimal HUD if any
/references      Curated aesthetic reference images (annotated filenames)
/assets
  /audio         Song file(s)
  /timelines     Song timeline JSON
```

## Non-Goals

- No progression systems, scoring, levels, or menus beyond start/autoplay selection.
- No physics engine.
- No multiplayer.
- No save system. Each session is self-contained.
- No analytics or telemetry.

## Open Questions

- Final song length and title.
- Door placement strategy (fixed / seeded / song-timed).
- Whether autoplay is the default or opt-in.
- Whether the experience loops, ends with a still frame, or fades to credits.