# Bruno Simon Clone

A pixel-perfect clone of [bruno-simon.com](https://bruno-simon.com) — a 3D WebGL/WebGPU interactive portfolio where you drive a toy car through a miniature world.

## Tech Stack

- **Three.js WebGPU** (WebGL2 fallback) — toon shading, TSL node materials
- **Rapier Physics** — vehicle controller, trimesh colliders, heightfield terrain
- **Howler.js** — 15+ sound groups: engine, honk, hits, ambient, music
- **GSAP** — animations, transitions, notifications
- **TypeScript + Vite** — zero-framework frontend

## Features

- Drive a toy car through a miniature world
- Circuit racing with lap timer & best time
- Night mode toggle
- Jukebox music zones
- Whisper zone messages
- Speed lines effect at high speed
- Explosive crates that scatter on impact
- Instanced trees (birch, oak, cherry)
- 17 achievements
- 8-tab menu (home, options, controls, achievements, circuit, whispers, behind the scene, easter)

## Run Locally

```bash
pnpm install
pnpm --filter @workspace/bruno-simon-clone run dev
```

