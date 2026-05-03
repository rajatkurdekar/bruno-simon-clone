import * as THREE from 'three/webgpu'
import { Game } from './Game'

export class Lighting {
    light!: THREE.DirectionalLight
    ambientLight!: THREE.AmbientLight

    phi: number = 0.63
    theta: number = 0.72
    spherical: THREE.Spherical

    constructor() {
        const game = Game.getInstance()

        this.spherical = new THREE.Spherical(30, this.phi, this.theta)

        this.setAmbient()
        this.setDirectional()

        game.ticker.events.on('tick', () => {
            this.update()
        }, 9)
    }

    setAmbient() {
        const game = Game.getInstance()
        this.ambientLight = new THREE.AmbientLight(0x2a1630, 2)
        game.scene.add(this.ambientLight)
    }

    setDirectional() {
        const game = Game.getInstance()

        this.light = new THREE.DirectionalLight(0xffffff, 5)
        this.light.castShadow = true
        this.light.shadow.mapSize.width = 2048
        this.light.shadow.mapSize.height = 2048
        this.light.shadow.camera.near = 0.1
        this.light.shadow.camera.far = 60
        this.light.shadow.camera.left = -25
        this.light.shadow.camera.right = 25
        this.light.shadow.camera.top = 25
        this.light.shadow.camera.bottom = -25
        this.light.shadow.bias = -0.001
        this.light.shadow.normalBias = 0.1
        this.light.shadow.radius = 3

        this.updateDirection()

        game.scene.add(this.light)
        game.scene.add(this.light.target)

        // Sync with materials
        game.ticker.events.on('tick', () => {
            if (game.materials?.directionUniform) {
                game.materials.directionUniform.value.copy(
                    new THREE.Vector3().setFromSphericalCoords(1, this.phi, this.theta).normalize()
                )
            }
        }, 9)
    }

    updateDirection() {
        const dir = new THREE.Vector3().setFromSpherical(this.spherical)
        this.light.position.copy(dir.multiplyScalar(20))
        this.light.target.position.set(0, 0, 0)
    }

    update() {
        const game = Game.getInstance()
        // Follow player with shadow camera
        if (game.physicalVehicle) {
            const p = game.physicalVehicle.position
            this.light.position.x = p.x + new THREE.Vector3().setFromSpherical(this.spherical).x
            this.light.position.z = p.z + new THREE.Vector3().setFromSpherical(this.spherical).z
            this.light.target.position.x = p.x
            this.light.target.position.z = p.z
        }
    }
}
