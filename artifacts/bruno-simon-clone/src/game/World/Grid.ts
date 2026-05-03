import * as THREE from 'three/webgpu'
import { Game } from '../Game'

export class Grid {
    mesh!: THREE.Mesh

    constructor() {}

    init() {
        const game = Game.getInstance()

        const geometry = new THREE.PlaneGeometry(100, 100)
        geometry.rotateX(-Math.PI * 0.5)

        const material = new THREE.MeshBasicMaterial({
            color: 0x1b191f,
            wireframe: false,
            transparent: true,
            opacity: 0,
        })

        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.position.y = 0.01

        const defaultRespawn = game.respawns.getDefault()
        this.mesh.position.x = defaultRespawn.position.x
        this.mesh.position.z = defaultRespawn.position.z

        game.scene.add(this.mesh)
    }

    show() {
        if (!this.mesh) return
        const material = this.mesh.material as THREE.MeshBasicMaterial
        material.opacity = 1
    }

    hide() {
        if (!this.mesh) return
        const material = this.mesh.material as THREE.MeshBasicMaterial
        material.opacity = 0
    }
}
