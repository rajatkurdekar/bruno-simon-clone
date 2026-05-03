import * as THREE from 'three/webgpu'
import { Game } from '../Game'
import { Events } from '../Events'

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
function smallestAngle(a: number, b: number): number {
    let diff = b - a
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    return diff
}

export class PhysicsVehicle {
    events: Events = new Events()

    steeringAmplitude: number = 0.5
    engineForceAmplitude: number = 300
    boostMultiplier: number = 2
    topSpeed: number = 5
    topSpeedBoost: number = 40
    brakeAmplitude: number = 35
    idleBrake: number = 0.06
    reverseBrake: number = 0.4

    sideward: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
    upward: THREE.Vector3 = new THREE.Vector3(0, 1, 0)
    forward: THREE.Vector3 = new THREE.Vector3(1, 0, 0)
    position: THREE.Vector3 = new THREE.Vector3(0, 4, 0)
    quaternion: THREE.Quaternion = new THREE.Quaternion()
    velocity: THREE.Vector3 = new THREE.Vector3()
    direction: THREE.Vector3 = new THREE.Vector3(1, 0, 0)
    speed: number = 0
    xzSpeed: number = 0
    forwardSpeed: number = 0
    forwardRatio: number = 0
    goingForward: boolean = true
    xRotation: number = 0
    yRotation: number = 0
    zRotation: number = 0

    suspensionsHeights = { low: 0.88, mid: 1.23, high: 1.63 }
    suspensionsStiffness = { low: 20, mid: 30, high: 40 }

    chassis!: { physical: any, mass: number }
    controller!: any
    wheels!: {
        inContactCount: number
        justTouchedCount: number
        items: any[]
        settings: any
        perimeter: number
        updateSettings: () => void
    }

    stop!: { active: boolean, lowThreshold: number, highThreshold: number, test: () => void }
    upsideDown!: { active: boolean, ratio: number, threshold: number, test: () => void }
    stuck!: { durationTest: number, durationSaved: number, savedItems: any[], distance: number, distanceThreshold: number, active: boolean, accumulate: (d: number, t: number) => void, test: () => void }
    flip!: { force: number, test: () => void, jump: () => void }

    constructor() {
        this.setChassis()
        this.controller = Game.getInstance().physics.world.createVehicleController(this.chassis.physical.body)
        this.setWheels()
        this.setStop()
        this.setUpsideDown()
        this.setStuck()
        this.setFlip()

        const game = Game.getInstance()
        game.ticker.events.on('tick', () => { this.updatePrePhysics() }, 2)
        game.ticker.events.on('tick', () => { this.updatePostPhysics() }, 5)
    }

    setChassis() {
        const game = Game.getInstance()
        const object = game.objects.add(null, {
            type: 'dynamic',
            position: this.position,
            friction: 0.4,
            rotation: new THREE.Quaternion(),
            colliders: [
                { shape: 'cuboid', mass: 2.5, parameters: [1.3, 0.4, 0.85], position: { x: 0, y: -0.1, z: 0 }, centerOfMass: { x: 0, y: -0.5, z: 0 } },
                { shape: 'cuboid', mass: 0, parameters: [0.5, 0.15, 0.65], position: { x: 0, y: 0.4, z: 0 } },
                { shape: 'cuboid', mass: 0, parameters: [1.5, 0.5, 0.9], position: { x: 0.1, y: -0.2, z: 0 }, category: 'bumper' },
            ],
            canSleep: false,
            waterGravityMultiplier: 0,
            onCollision: (force, position) => {
                const g = game.audio.groups?.get('hitDefault')
                if (g) g.playRandomNext(force)
            }
        })
        this.chassis = {
            physical: object.physical,
            mass: object.physical.body.mass()
        }
    }

    setWheels() {
        this.wheels = {
            inContactCount: 0,
            justTouchedCount: 0,
            items: [],
            settings: {
                offset: { x: 0.90, y: 0, z: 0.75 },
                radius: 0.4,
                directionCs: { x: 0, y: -1, z: 0 },
                axleCs: { x: 0, y: 0, z: 1 },
                frictionSlip: 0.9,
                maxSuspensionForce: 150,
                maxSuspensionTravel: 2,
                sideFrictionStiffness: 3,
                suspensionCompression: 10,
                suspensionRelaxation: 2.7,
                suspensionStiffness: 25,
            },
            perimeter: 0,
            updateSettings: () => this.updateWheelSettings()
        }

        for (let i = 0; i < 4; i++) {
            const wheel: any = {
                inContact: false,
                contactPoint: null,
                suspensionLength: null,
                suspensionState: 'low',
                lastTouchTime: 0,
                basePosition: new THREE.Vector3()
            }
            this.controller.addWheel(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), 1, 1)
            this.wheels.items.push(wheel)
        }

        this.wheels.updateSettings()
    }

    updateWheelSettings() {
        const s = this.wheels.settings
        this.wheels.perimeter = s.radius * Math.PI * 2

        const positions = [
            new THREE.Vector3( s.offset.x, s.offset.y,  s.offset.z),
            new THREE.Vector3( s.offset.x, s.offset.y, -s.offset.z),
            new THREE.Vector3(-s.offset.x, s.offset.y,  s.offset.z),
            new THREE.Vector3(-s.offset.x, s.offset.y, -s.offset.z),
        ]

        let i = 0
        for (const wheel of this.wheels.items) {
            wheel.basePosition.copy(positions[i])
            this.controller.setWheelDirectionCs(i, s.directionCs)
            this.controller.setWheelAxleCs(i, s.axleCs)
            this.controller.setWheelRadius(i, s.radius)
            this.controller.setWheelChassisConnectionPointCs(i, wheel.basePosition)
            this.controller.setWheelFrictionSlip(i, s.frictionSlip)
            this.controller.setWheelMaxSuspensionForce(i, s.maxSuspensionForce)
            this.controller.setWheelMaxSuspensionTravel(i, s.maxSuspensionTravel)
            this.controller.setWheelSideFrictionStiffness(i, s.sideFrictionStiffness)
            this.controller.setWheelSuspensionCompression(i, s.suspensionCompression)
            this.controller.setWheelSuspensionRelaxation(i, s.suspensionRelaxation)
            i++
        }
    }

    setStop() {
        this.stop = {
            active: true,
            lowThreshold: 0.04,
            highThreshold: 0.7,
            test: () => {
                if (this.speed < this.stop.lowThreshold) {
                    if (!this.stop.active) { this.stop.active = true; this.events.trigger('stop') }
                } else if (this.speed > this.stop.highThreshold) {
                    if (this.stop.active) { this.stop.active = false; this.events.trigger('start') }
                }
            }
        }
    }

    setUpsideDown() {
        this.upsideDown = {
            active: false,
            ratio: 0,
            threshold: 0.3,
            test: () => {
                this.upsideDown.ratio = this.upward.dot(new THREE.Vector3(0, -1, 0)) * 0.5 + 0.5
                if (this.upsideDown.ratio > this.upsideDown.threshold) {
                    if (!this.upsideDown.active) {
                        this.upsideDown.active = true
                        this.events.trigger('upsideDown', [this.upsideDown.ratio])
                    }
                } else {
                    if (this.upsideDown.active) {
                        this.upsideDown.active = false
                        this.events.trigger('rightSideUp')
                    }
                }
            }
        }
    }

    setStuck() {
        this.stuck = {
            durationTest: 3,
            durationSaved: 0,
            savedItems: [],
            distance: 0,
            distanceThreshold: 0.5,
            active: false,
            accumulate: (traveled, time) => {
                this.stuck.savedItems.unshift([traveled, time])
                this.stuck.distance = 0
                this.stuck.durationSaved = 0
                for (let i = 0; i < this.stuck.savedItems.length; i++) {
                    const item = this.stuck.savedItems[i]
                    if (this.stuck.durationSaved >= this.stuck.durationTest) {
                        this.stuck.savedItems.splice(i)
                        break
                    } else {
                        this.stuck.distance += item[0]
                        this.stuck.durationSaved += item[1]
                    }
                }
            },
            test: () => {
                if (this.stuck.durationSaved >= this.stuck.durationTest && this.stuck.distance < this.stuck.distanceThreshold) {
                    if (!this.stuck.active) { this.stuck.active = true; this.events.trigger('stuck') }
                } else {
                    if (this.stuck.active) { this.stuck.active = false; this.events.trigger('unstuck') }
                }
            }
        }
    }

    setFlip() {
        const flipForce = 5
        let inAir = false
        let previousXAngle = 0, accumulatedXAngle = 0
        let previousZAngle = 0, accumulatedZAngle = 0

        this.flip = {
            force: flipForce,
            test: () => {
                if (this.wheels.inContactCount === 0) {
                    if (!inAir) {
                        inAir = true
                        previousXAngle = this.xRotation
                        accumulatedXAngle = 0
                        previousZAngle = this.zRotation
                        accumulatedZAngle = 0
                    }
                }
                if (this.wheels.inContactCount >= 4) {
                    if (inAir) {
                        inAir = false
                        if (Math.abs(accumulatedXAngle) < 1 && Math.abs(accumulatedZAngle) > 5) {
                            this.events.trigger('flip', [Math.sign(accumulatedZAngle)])
                        }
                    }
                } else if (inAir) {
                    accumulatedXAngle += smallestAngle(previousXAngle, this.xRotation)
                    previousXAngle = this.xRotation
                    accumulatedZAngle += smallestAngle(previousZAngle, this.zRotation)
                    previousZAngle = this.zRotation
                }
            },
            jump: () => {
                accumulatedXAngle = 0
                accumulatedZAngle = 0
                const up = new THREE.Vector3(0, 1, 0)
                const sidewardDot = up.dot(this.sideward)
                const forwardDot = up.dot(this.forward)
                const upwardDot = up.dot(this.upward)
                const sidewardAbs = Math.abs(sidewardDot)
                const forwardAbs = Math.abs(forwardDot)
                const upwardAbs = Math.abs(upwardDot)
                const impulse = new THREE.Vector3(0, 1, 0).multiplyScalar(this.flip.force * this.chassis.mass)
                this.chassis.physical.body.applyImpulse(impulse)
                if (upwardAbs > sidewardAbs && upwardAbs > forwardAbs) {
                    const torque = new THREE.Vector3(0.8 * this.chassis.mass, 0, 0)
                    torque.applyQuaternion(this.chassis.physical.body.rotation())
                    this.chassis.physical.body.applyTorqueImpulse(torque)
                } else {
                    const torque = new THREE.Vector3(sidewardDot * 0.4 * this.chassis.mass, 0, -forwardDot * 0.8 * this.chassis.mass)
                    torque.applyQuaternion(this.chassis.physical.body.rotation())
                    this.chassis.physical.body.applyTorqueImpulse(torque)
                }
            }
        }
    }

    moveTo(position: THREE.Vector3 | { x: number, y: number, z: number }, rotation: number = 0) {
        const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation)
        this.chassis.physical.body.setTranslation(position)
        this.chassis.physical.body.setRotation(quaternion)
        this.chassis.physical.body.setLinvel({ x: 0, y: 0, z: 0 })
        this.chassis.physical.body.setAngvel({ x: 0, y: 0, z: 0 })
        const p = position as any
        this.position.set(p.x, p.y, p.z)
    }

    updatePrePhysics() {
        const game = Game.getInstance()
        const player = game.player
        if (!player) return

        const topSpeed = lerp(this.topSpeed, this.topSpeedBoost, player.boosting)
        const overflowSpeed = Math.max(0, this.speed - topSpeed)
        let engineForce = (player.accelerating * (1 + player.boosting * this.boostMultiplier)) * this.engineForceAmplitude / (1 + overflowSpeed) * game.ticker.deltaScaled

        let brake = player.braking
        if (!player.braking && Math.abs(player.accelerating) < 0.1) brake = this.idleBrake

        if (this.speed > 0.5 &&
            ((player.accelerating > 0 && !this.goingForward) ||
             (player.accelerating < 0 && this.goingForward))) {
            brake = this.reverseBrake
            engineForce = 0
        }

        brake *= this.brakeAmplitude * game.ticker.deltaScaled
        const steer = player.steering * this.steeringAmplitude

        this.controller.setWheelSteering(0, steer)
        this.controller.setWheelSteering(1, steer)

        for (let i = 0; i < 4; i++) {
            this.controller.setWheelBrake(i, brake)
            this.controller.setWheelEngineForce(i, engineForce)
            this.controller.setWheelSuspensionRestLength(i, this.suspensionsHeights[player.suspensions[i] as keyof typeof this.suspensionsHeights])
            this.controller.setWheelSuspensionStiffness(i, this.suspensionsStiffness[player.suspensions[i] as keyof typeof this.suspensionsStiffness])
        }

        const delta = Math.min(1/60, game.ticker.deltaAverage)
        this.controller.updateVehicle(delta)
    }

    updatePostPhysics() {
        const game = Game.getInstance()
        if (!game.player) return

        const newPosition = new THREE.Vector3().copy(this.chassis.physical.body.translation() as any)
        this.velocity = newPosition.clone().sub(this.position)
        this.direction = this.velocity.clone().normalize()
        this.position.copy(newPosition)
        this.quaternion.copy(this.chassis.physical.body.rotation() as any)
        this.sideward.set(0, 0, 1).applyQuaternion(this.quaternion)
        this.upward.set(0, 1, 0).applyQuaternion(this.quaternion)
        this.forward.set(1, 0, 0).applyQuaternion(this.quaternion)

        this.speed = this.velocity.length() / game.ticker.deltaScaled
        this.xzSpeed = Math.hypot(this.velocity.x, this.velocity.z) / game.ticker.deltaScaled
        this.forwardRatio = this.direction.dot(this.forward)
        this.goingForward = this.forwardRatio > 0.5
        this.forwardSpeed = this.speed * this.forwardRatio

        const euler = new THREE.Euler().setFromQuaternion(this.quaternion, 'XYZ')
        this.xRotation = euler.x
        const eulerY = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ')
        this.yRotation = eulerY.y
        const eulerZ = new THREE.Euler().setFromQuaternion(this.quaternion, 'ZYX')
        this.zRotation = eulerZ.z

        if (Math.abs(game.player.accelerating) > 0.5)
            this.stuck.accumulate(this.velocity.length(), game.ticker.deltaScaled)

        let inContactCount = 0
        for (let i = 0; i < 4; i++) {
            const wheel = this.wheels.items[i]
            const inContact = this.controller.wheelIsInContact(i)
            if (inContact && !wheel.inContact) {
                wheel.lastTouchTime = game.ticker.elapsed
            }
            wheel.inContact = inContact
            wheel.contactPoint = this.controller.wheelContactPoint(i)
            wheel.suspensionLength = this.controller.wheelSuspensionLength(i)
            if (wheel.inContact) inContactCount++
        }

        let justTouchedCount = 0
        if (inContactCount > this.wheels.inContactCount) {
            for (const wheel of this.wheels.items) {
                if (wheel.lastTouchTime > game.ticker.elapsed - 0.2) justTouchedCount++
            }
        }

        this.wheels.inContactCount = inContactCount
        this.wheels.justTouchedCount = justTouchedCount

        this.stop.test()
        this.upsideDown.test()
        this.stuck.test()
        this.flip.test()
    }

    activate() {
        this.chassis.physical.body.setLinvel({ x: 0, y: 0, z: 0 })
        this.chassis.physical.body.setAngvel({ x: 0, y: 0, z: 0 })
        this.chassis.physical.body.setEnabled(true)
    }

    deactivate() {
        this.chassis.physical.body.setEnabled(false)
    }
}
