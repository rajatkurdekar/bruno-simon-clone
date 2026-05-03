import * as THREE from 'three/webgpu'
import { Game } from '../Game'
import { Floor } from './Floor'
import { VisualVehicle } from './VisualVehicle'
import { Playground } from './Playground'
import { Scenery } from './Scenery'
import { Grid } from './Grid'
import { Intro } from './Intro'
import { ExplosiveCrates } from '../ExplosiveCrates'

export class World {
    floor!: Floor
    visualVehicle!: VisualVehicle
    playground!: Playground
    scenery!: Scenery
    explosiveCrates!: ExplosiveCrates
    grid!: Grid
    intro!: Intro

    constructor() {
        this.intro = new Intro()
    }

    async init() {
        const game = Game.getInstance()
        const STEPS = 7
        let step = STEPS

        game.intro.updateProgress(step--, STEPS)

        // Load terrain texture
        try {
            const tex = await new Promise<THREE.Texture>((resolve) => {
                new THREE.TextureLoader().load('/terrain/terrain.png', (t) => {
                    t.minFilter = THREE.NearestFilter
                    t.magFilter = THREE.NearestFilter
                    t.wrapS = THREE.ClampToEdgeWrapping
                    t.wrapT = THREE.ClampToEdgeWrapping
                    resolve(t)
                }, undefined, () => resolve(new THREE.Texture()))
            })
            game.terrain.setupNodes(tex)
        } catch(e) {}

        game.intro.updateProgress(step--, STEPS)

        // Load terrain GLB for physics heightfield
        try {
            const gltf = await new Promise<any>((resolve, reject) => {
                game.resources.getLoader('gltf').load(
                    '/terrain/terrain-compressed.glb', resolve, undefined,
                    () => game.resources.getLoader('gltf').load('/terrain/terrain.glb', resolve, undefined, reject)
                )
            })
            if (gltf?.scene?.children?.[0]?.geometry) {
                game.terrain.extractHeightData(gltf.scene.children[0].geometry)
            }
        } catch(e) {
            console.info('Terrain GLB not loaded, using flat floor')
        }

        game.intro.updateProgress(step--, STEPS)

        // Visual vehicle + floor
        this.visualVehicle = new VisualVehicle()
        await this.visualVehicle.init()
        this.floor = new Floor()
        await this.floor.init()

        game.intro.updateProgress(step--, STEPS)

        // Playground
        this.playground = new Playground()
        await this.playground.init()

        game.intro.updateProgress(step--, STEPS)

        // Explosive crates (dynamic physics objects)
        this.explosiveCrates = new ExplosiveCrates()
        this.explosiveCrates.init().catch(() => {})

        game.intro.updateProgress(step--, STEPS)

        // Respawns
        try {
            const gltf = await new Promise<any>((resolve, reject) => {
                game.resources.getLoader('gltf').load(
                    '/respawns/respawnsReferences-compressed.glb', resolve, undefined,
                    () => game.resources.getLoader('gltf').load('/respawns/respawnsReferences.glb', resolve, undefined, reject)
                )
            })
            game.respawns.parseFromModel(gltf)
        } catch(e) {
            console.info('Respawns not loaded, using default position')
        }

        game.intro.updateProgress(step--, STEPS)

        // Mark loading complete — shows "Press anywhere to start"
        game.intro.updateProgress(0, STEPS)

        // Spawn vehicle
        const respawn = game.respawns.getDefault()
        game.physicalVehicle.moveTo(respawn.position, respawn.rotation)

        // Grid (debug)
        this.grid = new Grid()
        this.grid.init()

        // Start scenery load non-blocking
        this.scenery = new Scenery()
        this.scenery.init().catch(() => {})

        await this.onReady()
    }

    async onReady() {
        const game = Game.getInstance()

        // Wait for user interaction
        await new Promise<void>((resolve) => {
            const start = (e: Event) => {
                const target = e.target as HTMLElement
                if (target.closest('.js-menu') || target.closest('.js-menu-trigger')) return
                document.removeEventListener('click', start)
                document.removeEventListener('touchend', start)
                resolve()
            }
            document.addEventListener('click', start)
            document.addEventListener('touchend', start)
        })

        game.intro.hide()
        await game.overlay.fadeOut(1.2, 0)
        game.audio?.playReveal?.()
        game.reveal.start()
    }
}
