# Bruno Simon Portfolio Clone

A faithful clone of [bruno-simon.com](https://bruno-simon.com) — a full 3D WebGL/WebGPU portfolio where users drive a toy car through a miniature world. Built from the open-source folio-2025 codebase with maximum fidelity.

## Stack

- **Frontend**: Vanilla TypeScript + Vite (no React) — `artifacts/bruno-simon-clone`
- **3D Renderer**: Three.js `three/webgpu` (WebGPU with WebGL2 fallback, never vanilla WebGLRenderer)
- **Physics**: `@dimforge/rapier3d-compat` — full vehicle controller, trimesh colliders, heightfield terrain
- **Audio**: Howler.js — engine pitch curves, honk, collision sounds, rolling, ambient birds/crickets/wind, 15+ sound groups
- **Animation**: GSAP — loading fade, reveal sweep, UI transitions, notification toasts
- **Camera**: Custom spherical + drag + zoom with roll effect

## Artifact

| Artifact | Kind | Preview Path |
|----------|------|-------------|
| Bruno Simon Portfolio Clone | web | `/` |
| API Server | api | `/api` |

## Architecture

```
artifacts/bruno-simon-clone/
├── index.html                  — Full Bruno-style DOM (canvas, menu, modals, section popup, touch buttons,
│                                  circuit overlay, whisper bubble, speed lines div, all 8 nav tabs)
├── src/
│   ├── main.ts                 — Entry: new Game()
│   ├── index.css               — Complete Bruno Simon CSS (all UI states, circuit, whisper, speed lines)
│   └── game/
│       ├── Game.ts             — Singleton: orchestrates all systems in init order
│       ├── Events.ts           — Typed event emitter
│       ├── Ticker.ts           — Animation frame loop with delta/scaling
│       ├── Viewport.ts         — Responsive width/height/pixelRatio tracking
│       ├── Inputs.ts           — Keyboard, gamepad, touch/nipple inputs
│       ├── Resources.ts        — GLTF/KTX2/DRACO asset loader
│       ├── Rendering.ts        — WebGPURenderer with WebGL2 backend fallback
│       ├── View.ts             — Spherical camera + drag + zoom + roll
│       ├── Materials.ts        — Toon/palette NodeMaterial (TSL shaders), bounceColorUniform, name-based colors
│       ├── Lighting.ts         — Directional + ambient, follows player
│       ├── Terrain.ts          — Heightfield extraction + TSL displacement node
│       ├── Respawns.ts         — Spawn points from GLB references
│       ├── Water.ts            — Animated TSL wave mesh (time-based sine displacement)
│       ├── Fog.ts              — Scene fog + TSL fog uniforms
│       ├── Player.ts           — Input→vehicle bridge (WASD/gamepad/touch)
│       ├── Audio.ts            — Full Howler.js: engine (pitch/volume curves), honk,
│       │                          hits (defaults/bricks/metal), rolling, wind, reveal,
│       │                          ambient birds/crickets, achievements jingle, circuit,
│       │                          music (Baguira/Boy/Sudo), explosions, click, magic,
│       │                          campfire, springs, whispers + playSfx/playReveal helpers
│       ├── Overlay.ts          — GSAP fade-in/out black overlay
│       ├── Menu.ts             — All 8 tabs: home/options/controls/achievements/circuit/
│       │                          whispers/behindTheScene/easter + night mode toggle + respawn
│       ├── Reveal.ts           — GSAP reveal animation on game start
│       ├── Notifications.ts    — Toast notification system (GSAP animated)
│       ├── Achievements.ts     — 17 achievements with unlock events + menu list rendering
│       ├── Areas.ts            — World zones (areas-compressed.glb), proximity detection,
│       │                          enter/leave events, triggers achievements
│       ├── Sections.ts         — Zone info popup (bottom bar) - title, color dot, actions
│       ├── Map.ts              — Map modal (map-day.webp) + real-time player dot tracking
│       ├── Objects.ts          — Physics object factory
│       ├── Circuit.ts          — Racing circuit: countdown, lap timer, best time (localStorage),
│       │                          overlay, notifications, area enter/leave wiring
│       ├── Whispers.ts         — Spatial zone messages: text bubble positioned in 3D, menu list
│       ├── SpeedLines.ts       — CSS radial speed-lines overlay (throttle + speed threshold)
│       ├── ExplosiveCrates.ts  — Dynamic physics crates loaded from GLB, scatter on impact
│       ├── NightMode.ts        — Day/night GSAP color transitions (fog, ambient, bounce, directional)
│       ├── Jukebox.ts          — Music zone: track selection, play/pause, achievement unlock
│       ├── Physics/
│       │   ├── Physics.ts      — Rapier World + collider creation
│       │   └── PhysicsVehicle.ts — Rapier vehicle controller (4-wheel, steering, suspension)
│       └── World/
│           ├── World.ts        — Orchestrates terrain/vehicle/playground/respawns/crates loading,
│           │                      7-step progress bar ending with "Press anywhere to start"
│           ├── VisualVehicle.ts — Three.js vehicle mesh synced to physics + antenna model
│           ├── Floor.ts        — Infinite floor plane with terrain gradient colorNode
│           ├── Playground.ts   — Playground visual + physics trimesh
│           ├── Scenery.ts      — Instanced birch/oak/cherry trees (refs+visual GLBs), benches,
│           │                      lanterns (PointLights), pole lights, static objects
│           ├── Grid.ts         — Debug grid
│           └── Intro.ts        — Loading screen with progress bar
```

## Init Order (Game.ts)

```
Ticker → Viewport → Inputs → Scene → Rapier → Rendering → Resources →
Water → Objects → Physics → PhysicsVehicle → Materials → Lighting →
Terrain → Respawns → Player → Audio → View → postprocessing/start →
Overlay → Menu → Reveal → Notifications → Fog →
World.init() [terrain → floor → vehicle → playground → respawns → scenery] →
Achievements → Areas → Sections → Map →
Circuit → Whispers → SpeedLines → NightMode → Jukebox
(area events wired: areas.events.on('enter'/'leave') → circuit + whispers)
```

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Drive |
| Shift | Boost |
| Ctrl / B | Brake |
| Space | Jump |
| H | Honk |
| R | Respawn |
| M | Map |
| 1-4 / Numpad | Hydraulics |
| Drag | Rotate camera |
| Scroll | Zoom |

## Zones / Areas

Areas loaded from `/areas/areas-compressed.glb`. Each area triggers:
- `enter`/`leave` events on `game.areas`
- Section popup at bottom with area name, color dot, optional link
- Achievement unlock (first visit)
- Circuit timer when entering/leaving `circuit` zone
- Whisper bubble when near named zones

Default areas (fallback if GLB missing): home, about, works, contact, circuit, jukebox

## Menu Tabs (8 total)

| Tab | Slug | Content |
|-----|------|---------|
| Home | `home` | Intro text + drive button |
| Options | `options` | Night mode toggle, audio mute |
| Controls | `controls` | Key/gamepad reference |
| Achievements | `achievements` | Unlocked/locked list |
| Circuit | `circuit` | Best time + last time |
| Whispers | `whispers` | Zone message log |
| Behind the Scene | `behindTheScene` | Tech credits |
| Easter | `easter` | Secret hints |

## Achievements (17 total)

On The Road, Upside Down, Beep Beep!, Jump!, Stuck, Back Again, Home Sweet Home, Getting To Know Me, Portfolio Explorer, Stay In Touch, Racer, DJ, Pedal To The Metal, Explorer, Curious, Gravity Defier, ??? (secret)

## Key Implementation Notes

- `bounceColorUniform` lives on `Materials` — referenced by `NightMode.ts` for day/night color transitions
- `game.lighting.light` (DirectionalLight) and `game.lighting.ambientLight` referenced by `NightMode.ts`
- Circuit uses area `enter`/`leave` events: enter → start countdown, leave → finish race
- Whispers: 16 zone messages mapped to area names; bubble positioned via 3D→2D projection
- SpeedLines: CSS `clip-path` radial lines revealed when `speed > 8 m/s` and throttle active
- Instanced trees: `birchTreesReferences.glb` children = instance transforms, `birchTreesVisual.glb` = mesh
- `Map` class (Map.ts) shadows built-in JS `Map` — imports use `import { Map } from './Map'`

## Static Assets (public/)

All assets from the original folio-2025 repo:
- `vehicle/default.glb` — toy car model
- `terrain/terrain-compressed.glb` + `terrain.png` — landscape  
- `playground/playgroundVisual-compressed.glb` + `playgroundPhysical-compressed.glb`
- `respawns/respawnsReferences-compressed.glb`
- `scenery/`, `birchTrees/`, `oakTrees/`, `cherryTrees/`, `flowers/`, `bushes/`, `bricks/`, `fences/`
- `areas/areas-compressed.glb` — zone detection geometry
- `sounds/` — full set: engine, honk, hits, rolling, reveal, birds, crickets, wind, achievements, circuit, music, magic, campfire, springs, whispers
- `fonts/` — Pally-Regular/Medium/Bold woff2/woff
- `ui/` — SVG icons, map (map-day.webp, player.webp), achievement rewards, controls images
- `palette.png` — toon shading palette
- `favicons/` — site favicon

## Renderer Notes

Uses `three/webgpu` (WebGPU renderer). Falls back to WebGL2 backend when GPU WebGPU is unavailable. Never uses vanilla WebGLRenderer (doesn't support NodeMaterials). In headless environments (no GPU), runs headless mode.

## Design Tokens

- **Background**: `radial-gradient(#251f2b, #1d1721)` (dark purple)
- **Accent**: `#e885ff` (purple glow)
- **Text**: `#e8d5c4` (warm cream)
- **Fonts**: Pally-Regular/Medium/Bold (local), Amatic SC + Nunito (Google)
