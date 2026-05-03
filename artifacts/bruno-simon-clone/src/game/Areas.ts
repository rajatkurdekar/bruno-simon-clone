import * as THREE from 'three/webgpu'
import { Events } from './Events'
import { Game } from './Game'

export interface Area {
    name: string
    position: THREE.Vector3
    halfExtents: THREE.Vector3
    active: boolean
    distance: number
    label: string
    description: string
    color: string
    link?: string
    achievementName?: string
}

export class Areas {
    events: Events = new Events()
    items: Map<string, Area> = new Map()

    private areaLabels: { [key: string]: { label: string, description: string, color: string, link?: string, achievementName?: string } } = {
        home:       { label: 'Home',        description: 'Welcome to my portfolio!',          color: '#e8d5c4', achievementName: 'visitHome' },
        about:      { label: 'About',       description: 'Learn more about me',               color: '#a8d8ea', achievementName: 'visitAbout' },
        works:      { label: 'Works',       description: 'Check out my projects',             color: '#ffd700', achievementName: 'visitWorks', link: 'https://github.com/brunosimon' },
        contact:    { label: 'Contact',     description: 'Get in touch with me',              color: '#90ee90', achievementName: 'visitContact', link: 'mailto:contact@bruno-simon.com' },
        circuit:    { label: 'Circuit',     description: 'Try the racing circuit!',           color: '#ff9944', achievementName: 'visitCircuit' },
        jukebox:    { label: 'Jukebox',     description: 'Listen to some music',              color: '#e885ff', achievementName: 'visitJukebox' },
        playground: { label: 'Playground',  description: 'The physics playground',            color: '#ff6b6b' },
        camping:    { label: 'Camping',     description: 'A peaceful camping spot',           color: '#90ee90' },
        town:       { label: 'Town',        description: 'Explore the town',                  color: '#e8d5c4' },
        forest:     { label: 'Forest',      description: 'Wander through the trees',          color: '#4caf50' },
    }

    constructor() {}

    async init() {
        const game = Game.getInstance()

        try {
            const gltf = await new Promise<any>((resolve, reject) => {
                game.resources.getLoader('gltf').load(
                    '/areas/areas-compressed.glb', resolve, undefined,
                    () => game.resources.getLoader('gltf').load('/areas/areas.glb', resolve, undefined, reject)
                )
            })

            for (const child of gltf.scene.children) {
                let name = child.name.replace(/^area(.+)$/i, '$1')
                name = name.charAt(0).toLowerCase() + name.slice(1)

                const info = this.areaLabels[name] ?? {
                    label: name.charAt(0).toUpperCase() + name.slice(1),
                    description: `Area: ${name}`,
                    color: '#e8d5c4'
                }

                const halfExtents = new THREE.Vector3(
                    child.scale.x || 5,
                    child.scale.y || 5,
                    child.scale.z || 5
                )

                const area: Area = {
                    name,
                    position: child.position.clone(),
                    halfExtents,
                    active: false,
                    distance: Infinity,
                    ...info
                }

                this.items.set(name, area)
            }
        } catch(e) {
            // Add default areas for gameplay when GLB not available
            this.addDefaultAreas()
        }

        // Proximity detection
        game.ticker.events.on('tick', () => {
            this.update()
        }, 12)
    }

    private addDefaultAreas() {
        const defaults: Omit<Area, 'active' | 'distance'>[] = [
            { name: 'home',     position: new THREE.Vector3(-20, 0, -20), halfExtents: new THREE.Vector3(8, 5, 8),  label: 'Home',     description: 'Welcome!',            color: '#e8d5c4', achievementName: 'visitHome' },
            { name: 'about',    position: new THREE.Vector3( 20, 0, -20), halfExtents: new THREE.Vector3(8, 5, 8),  label: 'About',    description: 'About me',            color: '#a8d8ea', achievementName: 'visitAbout' },
            { name: 'works',    position: new THREE.Vector3( 20, 0,  20), halfExtents: new THREE.Vector3(8, 5, 8),  label: 'Works',    description: 'My projects',         color: '#ffd700', achievementName: 'visitWorks' },
            { name: 'contact',  position: new THREE.Vector3(-20, 0,  20), halfExtents: new THREE.Vector3(8, 5, 8),  label: 'Contact',  description: 'Get in touch',        color: '#90ee90', achievementName: 'visitContact' },
            { name: 'circuit',  position: new THREE.Vector3(  0, 0,  50), halfExtents: new THREE.Vector3(15, 5, 15), label: 'Circuit', description: 'Racing circuit!',     color: '#ff9944', achievementName: 'visitCircuit' },
            { name: 'jukebox',  position: new THREE.Vector3(  0, 0,  30), halfExtents: new THREE.Vector3(5, 5, 5),  label: 'Jukebox', description: 'Listen to music',     color: '#e885ff', achievementName: 'visitJukebox' },
        ]
        for (const d of defaults) {
            this.items.set(d.name, { ...d, active: false, distance: Infinity })
        }
    }

    private update() {
        const game = Game.getInstance()
        if (!game.physicalVehicle) return

        const carPos = game.physicalVehicle.position

        for (const [name, area] of this.items) {
            const dx = Math.abs(carPos.x - area.position.x)
            const dz = Math.abs(carPos.z - area.position.z)
            area.distance = Math.hypot(carPos.x - area.position.x, carPos.z - area.position.z)

            const radius = Math.max(area.halfExtents.x, area.halfExtents.z) * 1.2
            const inArea = dx < area.halfExtents.x * 1.2 && dz < area.halfExtents.z * 1.2

            if (inArea && !area.active) {
                area.active = true
                this.events.trigger('enter', [area])

                // Achievement
                if (area.achievementName) {
                    game.achievements?.unlock(area.achievementName)
                }
            } else if (!inArea && area.active) {
                area.active = false
                this.events.trigger('leave', [area])
            }
        }

        // Find nearest area for UI
        let nearest: Area | null = null
        let nearestDist = Infinity
        const SHOW_RADIUS = 30

        for (const [, area] of this.items) {
            if (area.distance < nearestDist && area.distance < SHOW_RADIUS) {
                nearestDist = area.distance
                nearest = area
            }
        }

        game.sections?.updateNearest(nearest)
    }

    getActive(): Area[] {
        return Array.from(this.items.values()).filter(a => a.active)
    }
}
