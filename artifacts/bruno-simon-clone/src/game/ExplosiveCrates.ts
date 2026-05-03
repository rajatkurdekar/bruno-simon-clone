import * as THREE from 'three/webgpu'
import { Events } from './Events'
import { Game } from './Game'

interface Crate {
    visual: THREE.Object3D
    originalPos: THREE.Vector3
    originalRot: THREE.Quaternion
    body: any
}

export class ExplosiveCrates {
    events: Events = new Events()
    crates: Crate[] = []

    constructor() {}

    async init() {
        const game = Game.getInstance()

        try {
            const gltf = await new Promise<any>((resolve, reject) => {
                game.resources.getLoader('gltf').load(
                    '/explosiveCrates/explosiveCrates-compressed.glb',
                    resolve, undefined,
                    () => game.resources.getLoader('gltf').load(
                        '/explosiveCrates/explosiveCrates.glb', resolve, undefined, reject
                    )
                )
            })

            const scene = gltf.scene
            scene.updateMatrixWorld(true)

            const meshes: THREE.Mesh[] = []
            scene.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) meshes.push(child)
            })

            for (const mesh of meshes) {
                const geo = mesh.geometry as THREE.BufferGeometry
                if (!geo?.attributes?.position) continue

                geo.computeBoundingBox()
                const box = geo.boundingBox!
                const halfW = (box.max.x - box.min.x) * 0.5
                const halfH = (box.max.y - box.min.y) * 0.5
                const halfD = (box.max.z - box.min.z) * 0.5

                const pos = new THREE.Vector3()
                const rot = new THREE.Quaternion()
                const scale = new THREE.Vector3()
                mesh.matrixWorld.decompose(pos, rot, scale)

                game.materials.updateObject(mesh)
                mesh.matrixWorld.identity()
                game.scene.add(mesh)

                try {
                    const physObj = game.objects.add(mesh, {
                        type: 'dynamic',
                        position: pos,
                        rotation: rot,
                        mass: 3,
                        colliders: [{
                            shape: 'cuboid',
                            parameters: [
                                halfW * scale.x,
                                halfH * scale.y,
                                halfD * scale.z
                            ]
                        }]
                    })

                    this.crates.push({
                        visual: mesh,
                        originalPos: pos.clone(),
                        originalRot: rot.clone(),
                        body: physObj.physical.body
                    })
                } catch(e) {}
            }

            game.ticker.events.on('tick', () => { this.update() }, 5)

            game.physicalVehicle?.events.on('flip', () => {
                game.audio?.groups?.get('explosions')?.playRandom?.()
            })

        } catch(e) {
            console.info('ExplosiveCrates: skipping (asset not loaded)')
        }
    }

    update() {
        for (const crate of this.crates) {
            if (!crate.body || !crate.visual) continue
            try {
                const t = crate.body.translation()
                const r = crate.body.rotation()
                crate.visual.position.set(t.x, t.y, t.z)
                crate.visual.quaternion.set(r.x, r.y, r.z, r.w)
            } catch(e) {}
        }
    }

    reset() {
        for (const crate of this.crates) {
            if (!crate.body) continue
            try {
                crate.body.setTranslation(crate.originalPos, true)
                crate.body.setRotation(crate.originalRot, true)
                crate.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
                crate.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
            } catch(e) {}
        }
    }
}
