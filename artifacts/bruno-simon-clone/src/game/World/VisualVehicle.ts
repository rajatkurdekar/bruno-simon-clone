import * as THREE from 'three/webgpu'
import { Game } from '../Game'

export class VisualVehicle {
    model!: any
    chassis!: THREE.Object3D
    wheels!: THREE.Object3D[]
    antenna: THREE.Object3D | null = null
    wheelRadius: number = 0.4

    constructor() {}

    async init() {
        const game = Game.getInstance()

        try {
            this.model = await new Promise((resolve, reject) => {
                game.resources.getLoader('gltf').load(
                    '/vehicle/default-compressed.glb', resolve, undefined,
                    () => game.resources.getLoader('gltf').load('/vehicle/default.glb', resolve, undefined, reject)
                )
            })

            this.chassis = this.model.scene
            this.chassis.castShadow = true
            game.materials.updateObject(this.chassis)
            game.scene.add(this.chassis)

            // Find wheels
            this.wheels = []
            this.chassis.traverse((child) => {
                const n = child.name.toLowerCase()
                if (n.includes('wheel') || n.includes('tyre') || n.includes('tire')) {
                    this.wheels.push(child)
                }
            })
            this.wheels = this.wheels.slice(0, 4)

            // Load antenna model
            this.loadAntenna()

        } catch(e) {
            this.buildFallback(game)
        }

        game.ticker.events.on('tick', () => { this.update() }, 6)
    }

    private async loadAntenna() {
        const game = Game.getInstance()
        try {
            const gltf: any = await new Promise((resolve, reject) => {
                game.resources.getLoader('gltf').load(
                    '/vehicle/defaultAntenna-compressed.glb', resolve, undefined,
                    () => game.resources.getLoader('gltf').load('/vehicle/defaultAntenna.glb', resolve, undefined, reject)
                )
            })
            this.antenna = gltf.scene
            game.materials.updateObject(this.antenna!)
            this.chassis.add(this.antenna!)
        } catch(e) {}
    }

    private buildFallback(game: any) {
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 0.8, 1.7),
            new THREE.MeshLambertMaterial({ color: 0xe44444 })
        )
        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.6, 1.3),
            new THREE.MeshLambertMaterial({ color: 0xe44444 })
        )
        roof.position.y = 0.7

        this.chassis = new THREE.Group()
        ;(this.chassis as THREE.Group).add(body, roof)

        const wheelGeo = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 0.3, 16)
        wheelGeo.rotateZ(Math.PI / 2)
        this.wheels = []
        const positions = [[0.9, -0.15, 0.75], [0.9, -0.15, -0.75], [-0.9, -0.15, 0.75], [-0.9, -0.15, -0.75]]
        for (const pos of positions) {
            const w = new THREE.Mesh(wheelGeo, new THREE.MeshLambertMaterial({ color: 0x222222 }))
            w.position.set(pos[0], pos[1], pos[2])
            ;(this.chassis as THREE.Group).add(w)
            this.wheels.push(w)
        }
        game.scene.add(this.chassis)
    }

    update() {
        const game = Game.getInstance()
        if (!game.physicalVehicle || !this.chassis) return

        const vehicle = game.physicalVehicle
        const body = vehicle.chassis.physical.body
        const pos = body.translation()
        const rot = body.rotation()

        this.chassis.position.set(pos.x, pos.y, pos.z)
        this.chassis.quaternion.set(rot.x, rot.y, rot.z, rot.w)

        if (this.wheels.length > 0 && vehicle.controller) {
            const offsets = [[0.9, 0.75], [0.9, -0.75], [-0.9, 0.75], [-0.9, -0.75]]
            for (let i = 0; i < Math.min(4, this.wheels.length); i++) {
                const susp = vehicle.controller.wheelSuspensionLength(i)
                if (susp !== null && susp !== undefined) {
                    const steer = i < 2 ? (vehicle.controller.wheelSteering(i) ?? 0) : 0
                    if (offsets[i]) {
                        this.wheels[i].position.x = offsets[i][0]
                        this.wheels[i].position.y = -susp - 0.15
                        this.wheels[i].position.z = offsets[i][1]
                    }
                    if (i < 2) this.wheels[i].rotation.y = steer
                }
            }

            const speed = vehicle.xzSpeed
            const spinDelta = speed * game.ticker.deltaScaled * (1 / (2 * Math.PI * this.wheelRadius)) * Math.PI * 2 * 0.12
            for (const wheel of this.wheels) {
                wheel.rotation.z -= spinDelta
            }
        }
    }
}
