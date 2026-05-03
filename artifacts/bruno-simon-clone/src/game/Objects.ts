import * as THREE from 'three/webgpu'
import { Game } from './Game'

export interface PhysicalDesc {
    type?: 'dynamic' | 'fixed' | 'kinematicPositionBased' | 'kinematicVelocityBased'
    position?: THREE.Vector3 | { x: number, y: number, z: number }
    rotation?: THREE.Quaternion
    mass?: number
    friction?: number
    restitution?: number
    frictionRule?: string
    canSleep?: boolean
    sleeping?: boolean
    enabled?: boolean
    linearDamping?: number
    angularDamping?: number
    waterGravityMultiplier?: number
    contactThreshold?: number
    collidersOverwrite?: Partial<ColliderDesc>
    onCollision?: (force: number, position: any) => void
    colliders: ColliderDesc[]
    category?: string
}

export interface ColliderDesc {
    shape: 'cuboid' | 'ball' | 'cylinder' | 'trimesh' | 'hull' | 'heightfield'
    parameters: any[]
    position?: { x: number, y: number, z: number }
    quaternion?: THREE.Quaternion
    mass?: number
    friction?: number
    restitution?: number
    category?: string
    centerOfMass?: { x: number, y: number, z: number }
}

export interface PhysicalObject {
    physical: any
    visual: THREE.Object3D | null
}

export class Objects {
    items: PhysicalObject[] = []

    constructor() {}

    add(visual: THREE.Object3D | null, physicalDesc: PhysicalDesc): PhysicalObject {
        const game = Game.getInstance()
        const physical = game.physics.getPhysical(physicalDesc)

        if (visual && physical) {
            visual.userData.physical = physical
        }

        const object: PhysicalObject = { physical, visual }
        this.items.push(object)

        if (physical?.body) {
            physical.body.userData = { object }
        }

        return object
    }

    resetAll() {
        for (const item of this.items) {
            if (!item.physical?.body) continue
            if (item.physical.type !== 'dynamic') continue

            const initial = item.physical.initialState
            if (!initial) continue

            item.physical.body.setTranslation(initial.position)
            item.physical.body.setRotation(initial.rotation)
            item.physical.body.setLinvel({ x: 0, y: 0, z: 0 })
            item.physical.body.setAngvel({ x: 0, y: 0, z: 0 })
            if (initial.sleeping) item.physical.body.sleep()
            else item.physical.body.wakeUp()
        }
    }
}
