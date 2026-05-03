import * as THREE from 'three/webgpu'
import { Game } from '../Game'

export class Playground {
    visualMesh: THREE.Object3D | null = null
    physicsMesh: THREE.Object3D | null = null

    constructor() {}

    async init() {
        const game = Game.getInstance()

        await Promise.all([
            this.loadVisual(),
            this.loadPhysical(),
        ])
    }

    async loadVisual() {
        const game = Game.getInstance()
        try {
            const gltf = await new Promise<any>((resolve, reject) => {
                game.resources.getLoader('gltf').load('/playground/playgroundVisual-compressed.glb', resolve, undefined, () => {
                    game.resources.getLoader('gltf').load('/playground/playgroundVisual.glb', resolve, undefined, reject)
                })
            })
            this.visualMesh = gltf.scene as THREE.Object3D
            game.materials.updateObject(this.visualMesh)
            game.scene.add(this.visualMesh)
        } catch(e) {
            console.warn('Playground visual model not found')
        }
    }

    async loadPhysical() {
        const game = Game.getInstance()
        try {
            const gltf = await new Promise<any>((resolve, reject) => {
                game.resources.getLoader('gltf').load('/playground/playgroundPhysical-compressed.glb', resolve, undefined, () => {
                    game.resources.getLoader('gltf').load('/playground/playgroundPhysical.glb', resolve, undefined, reject)
                })
            })

            this.physicsMesh = gltf.scene as THREE.Object3D

            // Add physics for each mesh in the playground
            this.physicsMesh.traverse((child) => {
                if (!(child instanceof THREE.Mesh)) return
                const geo = child.geometry as THREE.BufferGeometry
                if (!geo) return

                const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
                const indexAttr = geo.index

                if (!posAttr) return

                const vertices = new Float32Array(posAttr.array)
                let indices: Uint32Array

                if (indexAttr) {
                    indices = new Uint32Array(indexAttr.array)
                } else {
                    indices = new Uint32Array(vertices.length / 3)
                    for (let i = 0; i < indices.length; i++) indices[i] = i
                }

                // Apply world matrix to vertices
                const worldMatrix = child.matrixWorld
                for (let i = 0; i < vertices.length; i += 3) {
                    const v = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2])
                    v.applyMatrix4(worldMatrix)
                    vertices[i] = v.x
                    vertices[i + 1] = v.y
                    vertices[i + 2] = v.z
                }

                try {
                    game.objects.add(null, {
                        type: 'fixed',
                        friction: 0.5,
                        restitution: 0.2,
                        colliders: [
                            { shape: 'trimesh', parameters: [vertices, indices], category: 'floor' }
                        ]
                    })
                } catch(e) {
                    console.warn('Failed to add playground physics:', e)
                }
            })
        } catch(e) {
            console.warn('Playground physical model not found')
        }
    }
}
