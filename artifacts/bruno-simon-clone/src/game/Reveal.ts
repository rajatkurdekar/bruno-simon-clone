import gsap from 'gsap'
import * as THREE from 'three/webgpu'
import { uniform, vec2 } from 'three/tsl'
import { Game } from './Game'

export class Reveal {
    position2Uniform: any
    distance: any
    thickness: any
    step: number = -1

    constructor() {
        const game = Game.getInstance()

        const respawn = game.respawns.getDefault()
        const pos = respawn.position

        this.position2Uniform = uniform(vec2(pos.x, pos.z))
        this.distance = uniform(0)
        this.thickness = uniform(0.05)
    }

    start() {
        const game = Game.getInstance()
        const respawn = game.respawns.getDefault()

        gsap.to(this.distance, {
            value: 100,
            ease: 'power1.out',
            duration: 3,
        })

        this.step = 0
    }

    update() {}
}
