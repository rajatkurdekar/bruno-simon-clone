import * as THREE from 'three/webgpu'
import { color, uniform, vec3 } from 'three/tsl'
import { Game } from './Game'

export class Fog {
    // TSL nodes for use in materials
    strength: any
    color: any

    constructor() {
        const game = Game.getInstance()

        // Simple fog - distant objects fade to background color
        this.strength = uniform(0)
        this.color = uniform(color('#1b1923'))

        // Add basic Three.js scene fog
        game.scene.fog = new THREE.FogExp2(0x1b1923, 0.008)

        game.ticker.events.on('tick', () => {
            this.update()
        }, 10)
    }

    update() {
        const game = Game.getInstance()
        if (!game.physicalVehicle) return

        // Distance-based fog intensity - minimal for gameplay clarity
        const dist = game.physicalVehicle.position.length()
        const fogStrength = Math.min(dist / 200, 0.3)
        this.strength.value = fogStrength
    }
}
