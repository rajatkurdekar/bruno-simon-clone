import * as THREE from 'three/webgpu'
import { Game } from '../Game'
import type { PhysicalDesc, ColliderDesc } from '../Objects'

export class Physics {
    world!: any
    eventQueue!: any
    physicals: any[] = []

    groups = {
        all: 0b0000000000000001,
        object: 0b0000000000000010,
        bumper: 0b0000000000000100
    }

    categories: { [key: string]: number } = {}
    frictionRules: { [key: string]: any } = {}

    constructor() {
        const game = Game.getInstance()
        const RAPIER = game.RAPIER

        this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 })
        this.eventQueue = new RAPIER.EventQueue(true)

        this.categories = {
            floor: (this.groups.all) << 16 | (this.groups.all),
            object: (this.groups.all | this.groups.object) << 16 | (this.groups.all | this.groups.bumper),
            bumper: (this.groups.bumper) << 16 | this.groups.object,
        }

        this.frictionRules = {
            average: RAPIER.CoefficientCombineRule.Average,
            min: RAPIER.CoefficientCombineRule.Min,
            max: RAPIER.CoefficientCombineRule.Max,
            multiply: RAPIER.CoefficientCombineRule.Multiply,
        }

        game.ticker.events.on('tick', () => {
            this.update()
        }, 3)
    }

    getPhysical(desc: PhysicalDesc): any {
        const game = Game.getInstance()
        const RAPIER = game.RAPIER

        const physical: any = {}
        physical.waterGravityMultiplier = desc.waterGravityMultiplier ?? -1.5
        physical.linearDamping = desc.linearDamping ?? 0.1
        physical.angularDamping = desc.angularDamping ?? 0.1

        let bodyDesc: any

        if (desc.type === 'fixed') {
            bodyDesc = RAPIER.RigidBodyDesc.fixed()
        } else if (desc.type === 'kinematicPositionBased') {
            bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        } else if (desc.type === 'kinematicVelocityBased') {
            bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
        } else {
            bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            physical.type = 'dynamic'
        }

        if (desc.type === 'fixed') physical.type = 'fixed'
        else if (desc.type === 'kinematicPositionBased') physical.type = 'kinematicPositionBased'
        else if (desc.type === 'kinematicVelocityBased') physical.type = 'kinematicVelocityBased'

        if (desc.position) {
            const p = desc.position as any
            bodyDesc.setTranslation(p.x, p.y, p.z)
        }

        if (desc.rotation) bodyDesc.setRotation(desc.rotation)
        if (desc.canSleep !== undefined) bodyDesc.setCanSleep(desc.canSleep)
        if (desc.sleeping !== undefined) bodyDesc.setSleeping(desc.sleeping)
        if (desc.enabled !== undefined) bodyDesc.setEnabled(desc.enabled)

        bodyDesc.setLinearDamping(physical.linearDamping)
        bodyDesc.setAngularDamping(physical.angularDamping)

        physical.body = this.world.createRigidBody(bodyDesc)

        const collidersOverwrite = desc.collidersOverwrite ?? {}

        physical.colliders = []
        for (let _colliderDesc of desc.colliders) {
            _colliderDesc = { ..._colliderDesc, ...collidersOverwrite }

            let colliderDesc: any
            const { shape, parameters } = _colliderDesc

            if (shape === 'cuboid') colliderDesc = (RAPIER.ColliderDesc.cuboid as any)(...parameters)
            else if (shape === 'ball') colliderDesc = (RAPIER.ColliderDesc.ball as any)(...parameters)
            else if (shape === 'cylinder') colliderDesc = (RAPIER.ColliderDesc.cylinder as any)(...parameters)
            else if (shape === 'trimesh') colliderDesc = (RAPIER.ColliderDesc.trimesh as any)(...parameters)
            else if (shape === 'hull') colliderDesc = (RAPIER.ColliderDesc.convexHull as any)(...parameters)
            else if (shape === 'heightfield') colliderDesc = (RAPIER.ColliderDesc.heightfield as any)(...parameters)
            else colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)

            if (_colliderDesc.position)
                colliderDesc.setTranslation(_colliderDesc.position.x, _colliderDesc.position.y, _colliderDesc.position.z)

            if (_colliderDesc.quaternion)
                colliderDesc.setRotation(_colliderDesc.quaternion)

            colliderDesc.setDensity(0.1)

            if (typeof _colliderDesc.mass !== 'undefined') {
                if (_colliderDesc.centerOfMass) {
                    colliderDesc.setMassProperties(
                        _colliderDesc.mass,
                        _colliderDesc.centerOfMass,
                        { x: 1, y: 1, z: 1 },
                        new THREE.Quaternion()
                    )
                } else {
                    colliderDesc.setMass(_colliderDesc.mass)
                }
            } else if (typeof desc.mass !== 'undefined') {
                colliderDesc.setMass(desc.mass / desc.colliders.length)
            }

            if (desc.friction !== undefined) colliderDesc.setFriction(desc.friction)
            else if (_colliderDesc.friction !== undefined) colliderDesc.setFriction(_colliderDesc.friction)
            else colliderDesc.setFriction(0.2)

            if (desc.frictionRule) colliderDesc.setFrictionCombineRule(this.frictionRules[desc.frictionRule])

            if (desc.restitution !== undefined) colliderDesc.setRestitution(desc.restitution)
            else if (_colliderDesc.restitution !== undefined) colliderDesc.setRestitution(_colliderDesc.restitution)
            else colliderDesc.setRestitution(0.15)

            let category = 'object'
            if (desc.category) category = desc.category
            else if (_colliderDesc.category) category = _colliderDesc.category

            if (this.categories[category]) {
                colliderDesc.setCollisionGroups(this.categories[category])
            }

            if (typeof desc.onCollision === 'function' || typeof desc.contactThreshold !== 'undefined') {
                colliderDesc.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
                colliderDesc.setContactForceEventThreshold(desc.contactThreshold ?? 15)
                if (typeof desc.onCollision === 'function') {
                    physical.onCollision = desc.onCollision
                }
            }

            const collider = this.world.createCollider(colliderDesc, physical.body)
            physical.colliders.push(collider)
        }

        physical.initialState = {
            position: {
                x: physical.body.translation().x,
                y: physical.body.translation().y,
                z: physical.body.translation().z,
            },
            rotation: physical.body.rotation(),
            sleeping: physical.body.isSleeping()
        }

        this.physicals.push(physical)
        return physical
    }

    update() {
        const game = Game.getInstance()
        this.world.timestep = game.ticker.deltaScaled

        for (const physical of this.physicals) {
            const waterDepth = Math.max(-physical.body.translation().y, game.water.surfaceElevation)
            if (waterDepth > 0) {
                physical.body.setLinearDamping(1)
                physical.body.setAngularDamping(1)
            } else {
                physical.body.setLinearDamping(physical.linearDamping)
                physical.body.setAngularDamping(physical.angularDamping)
            }
        }

        this.world.step(this.eventQueue)

        this.eventQueue.drainContactForceEvents((event: any) => {
            const collider1 = this.world.getCollider(event.collider1())
            const collider2 = this.world.getCollider(event.collider2())
            const body1 = collider1.parent()
            const body2 = collider2.parent()
            const callback1 = body1.userData?.object?.physical?.onCollision
            const callback2 = body2.userData?.object?.physical?.onCollision

            if (typeof callback1 === 'function' || typeof callback2 === 'function') {
                const mass1 = body1.mass()
                const mass2 = body2.mass()
                const force = event.maxForceMagnitude() / (mass1 + mass2)
                const position1 = body1.translation()
                const position2 = body2.translation()
                const bodyPosition = (position1.x === 0 && position1.y === 0 && position1.z === 0) ? position2 : position1
                if (typeof callback1 === 'function') callback1(force, bodyPosition)
                if (typeof callback2 === 'function') callback2(force, bodyPosition)
            }
        })
    }
}
