import * as THREE from 'three/webgpu'
import { texture, Fn, vec2, vec4, positionWorld } from 'three/tsl'
import { Game } from '../Game'

export class Floor {
    mesh!: THREE.Mesh
    physics: any = null
    size: number = 50
    cellSize: number = 1.5

    constructor() {}

    async init() {
        const game = Game.getInstance()
        this.setVisual()
        this.setPhysical()

        game.ticker.events.on('tick', () => {
            this.update()
        }, 10)
    }

    setVisual() {
        const game = Game.getInstance()
        this.size = Math.round(game.view.optimalArea.radius * 2) + 1
        const segments = Math.round(this.size / this.cellSize)

        const geometry = new THREE.PlaneGeometry(this.size, this.size, segments, segments)
        geometry.rotateX(-Math.PI * 0.5)

        const mat = new THREE.MeshLambertNodeMaterial()

        // Color node: sample gradient texture based on world height if available,
        // otherwise use a solid teal toon color matching Bruno Simon's palette
        if (game.terrain?.gradientTexture && game.terrain?.terrainTexture) {
            mat.colorNode = Fn(() => {
                const worldPos = positionWorld
                // Map world XZ to terrain UV
                const uv = worldPos.xz.div(game.terrain.subdivision * 1.5).add(0.5)
                const terrainData = texture(game.terrain.terrainTexture, uv)
                // Use blue channel (height) to sample the gradient
                const col = texture(game.terrain.gradientTexture!, vec2(0, terrainData.b.oneMinus()))
                return vec4(col.rgb, 1)
            })()
        } else {
            // Solid toon floor color — the warm teal from Bruno Simon's palette
            mat.colorNode = vec4(0.36, 0.76, 0.72, 1)
        }

        this.mesh = new THREE.Mesh(geometry, mat as any)
        this.mesh.receiveShadow = true
        game.scene.add(this.mesh)
    }

    setPhysical() {
        const game = Game.getInstance()

        if (!game.terrain.heights || game.terrain.heights.length === 0) {
            const floorObject = game.objects.add(null, {
                type: 'fixed',
                position: new THREE.Vector3(0, 0, 0),
                colliders: [{ shape: 'cuboid', parameters: [100, 0.1, 100] }]
            })
            this.physics = floorObject.physical
            return
        }

        const rowsCount = game.terrain.rowsCount
        const heights = game.terrain.heights

        if (rowsCount > 1 && heights.length > 0) {
            try {
                const terrainSize = game.terrain.size
                const floorObject = game.objects.add(null, {
                    type: 'fixed',
                    colliders: [{
                        shape: 'heightfield',
                        parameters: [
                            rowsCount - 1,
                            rowsCount - 1,
                            heights,
                            { x: terrainSize, y: 1, z: terrainSize }
                        ],
                        category: 'floor'
                    }]
                })
                this.physics = floorObject.physical
                return
            } catch(e) {}
        }

        // Flat fallback
        const floorObject = game.objects.add(null, {
            type: 'fixed',
            position: new THREE.Vector3(0, 0, 0),
            colliders: [{ shape: 'cuboid', parameters: [100, 0.1, 100] }]
        })
        this.physics = floorObject.physical
    }

    update() {
        const game = Game.getInstance()
        if (!this.mesh || !game.physicalVehicle) return

        // Infinite floor follows vehicle
        this.mesh.position.x = Math.round(game.physicalVehicle.position.x / this.cellSize) * this.cellSize
        this.mesh.position.z = Math.round(game.physicalVehicle.position.z / this.cellSize) * this.cellSize

        // Auto-respawn if car falls off
        if (game.physicalVehicle.position.y < -20) {
            const closest = game.respawns.getClosest(game.physicalVehicle.position)
            game.physicalVehicle.moveTo(closest.position, closest.rotation)
        }
    }
}
