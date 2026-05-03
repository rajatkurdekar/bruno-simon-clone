import * as THREE from 'three/webgpu'
import { Events } from './Events'
import { Game } from './Game'

export class Player {
    events: Events = new Events()

    accelerating: number = 0
    steering: number = 0
    boosting: number = 0
    braking: number = 0
    position: THREE.Vector3 = new THREE.Vector3()

    suspensions: ['low' | 'mid' | 'high', 'low' | 'mid' | 'high', 'low' | 'mid' | 'high', 'low' | 'mid' | 'high'] = ['low', 'low', 'low', 'low']

    private keyboard = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        boost: false,
        brake: false,
        jump: false,
        honk: false,
        respawn: false,
        map: false,
        suspensions: [false, false, false, false],
    }

    constructor() {
        const game = Game.getInstance()

        game.inputs.addActions([
            { name: 'forward', categories: ['wandering', 'racing'], keys: ['Keyboard.KeyW', 'Keyboard.ArrowUp'] },
            { name: 'backward', categories: ['wandering', 'racing'], keys: ['Keyboard.KeyS', 'Keyboard.ArrowDown'] },
            { name: 'left', categories: ['wandering', 'racing'], keys: ['Keyboard.KeyA', 'Keyboard.ArrowLeft'] },
            { name: 'right', categories: ['wandering', 'racing'], keys: ['Keyboard.KeyD', 'Keyboard.ArrowRight'] },
            { name: 'boost', categories: ['wandering', 'racing'], keys: ['Keyboard.ShiftLeft', 'Keyboard.ShiftRight'] },
            { name: 'brake', categories: ['wandering', 'racing'], keys: ['Keyboard.ControlLeft', 'Keyboard.KeyB'] },
            { name: 'jump', categories: ['wandering', 'racing'], keys: ['Keyboard.Space'] },
            { name: 'honk', categories: ['wandering', 'racing'], keys: ['Keyboard.KeyH'] },
            { name: 'respawn', categories: ['wandering', 'racing'], keys: ['Keyboard.KeyR'] },
            { name: 'map', categories: ['wandering', 'racing'], keys: ['Keyboard.KeyM'] },
            { name: 'susp1', categories: ['wandering', 'racing'], keys: ['Keyboard.Digit1', 'Keyboard.Numpad1'] },
            { name: 'susp2', categories: ['wandering', 'racing'], keys: ['Keyboard.Digit2', 'Keyboard.Numpad2'] },
            { name: 'susp3', categories: ['wandering', 'racing'], keys: ['Keyboard.Digit3', 'Keyboard.Numpad3'] },
            { name: 'susp4', categories: ['wandering', 'racing'], keys: ['Keyboard.Digit4', 'Keyboard.Numpad4'] },
        ])

        game.inputs.events.on('forward', (action: any) => { this.keyboard.forward = action.active })
        game.inputs.events.on('backward', (action: any) => { this.keyboard.backward = action.active })
        game.inputs.events.on('left', (action: any) => { this.keyboard.left = action.active })
        game.inputs.events.on('right', (action: any) => { this.keyboard.right = action.active })
        game.inputs.events.on('boost', (action: any) => { this.keyboard.boost = action.active })
        game.inputs.events.on('brake', (action: any) => { this.keyboard.brake = action.active })

        game.inputs.events.on('jump', (action: any) => {
            if (action.active && game.physicalVehicle) {
                if (game.physicalVehicle.wheels.inContactCount > 0) {
                    game.physicalVehicle.chassis.physical.body.applyImpulse({
                        x: 0, y: game.physicalVehicle.chassis.mass * 6, z: 0
                    })
                    game.view.roll.kick(1)
                } else {
                    game.physicalVehicle.flip.jump()
                }
                game.audio?.playSfx?.('jump')
            }
        })

        game.inputs.events.on('honk', (action: any) => {
            if (action.active) game.audio?.groups?.get('honk')?.playRandom?.()
        })

        game.inputs.events.on('respawn', (action: any) => {
            if (action.active && game.physicalVehicle) {
                const closest = game.respawns.getClosest(game.physicalVehicle.position)
                game.physicalVehicle.moveTo(closest.position, closest.rotation)
            }
        })

        game.inputs.events.on('map', (action: any) => {
            if (action.active) {
                const modal = document.querySelector('.js-modal[data-modal-name="map"]')
                if (modal) modal.classList.toggle('is-open')
            }
        })

        for (let i = 0; i < 4; i++) {
            game.inputs.events.on(`susp${i + 1}`, (action: any) => {
                this.keyboard.suspensions[i] = action.active
                this.updateSuspensions()
            })
        }

        // Respawn button
        document.querySelector('.js-respawn')?.addEventListener('click', () => {
            if (game.physicalVehicle) {
                const closest = game.respawns.getClosest(game.physicalVehicle.position)
                game.physicalVehicle.moveTo(closest.position, closest.rotation)
            }
        })

        game.ticker.events.on('tick', () => {
            this.update()
        }, 1)
    }

    private updateSuspensions() {
        for (let i = 0; i < 4; i++) {
            this.suspensions[i] = this.keyboard.suspensions[i] ? 'high' : 'low'
        }
    }

    update() {
        const game = Game.getInstance()

        // Keyboard input
        this.accelerating = 0
        if (this.keyboard.forward) this.accelerating += 1
        if (this.keyboard.backward) this.accelerating -= 1

        this.steering = 0
        if (this.keyboard.left) this.steering += 1
        if (this.keyboard.right) this.steering -= 1

        this.boosting = this.keyboard.boost ? 1 : 0
        this.braking = this.keyboard.brake ? 1 : 0

        // Touch/nipple input
        if (game.inputs.nipple.active && game.inputs.nipple.progress > 0.1) {
            const angle = game.inputs.nipple.smallestAngle
            const progress = game.inputs.nipple.progress

            this.accelerating = game.inputs.nipple.forward ? progress : -progress
            this.steering = -Math.sin(angle) * progress * (game.inputs.nipple.forward ? 1 : -1)
        }

        // Update position from physics
        if (game.physicalVehicle) {
            this.position.copy(game.physicalVehicle.position)
        }
    }

    respawnAtNearest() {
        const game = Game.getInstance()
        if (!game.physicalVehicle) return
        const closest = game.respawns.getClosest(game.physicalVehicle.position)
        game.physicalVehicle.moveTo(closest.position, closest.rotation)
    }
}
