import * as THREE from 'three/webgpu'
import CameraControls from 'camera-controls'
import { Game } from './Game'

CameraControls.install({ THREE: THREE as any })

export class View {
    static MODE_DEFAULT = 1
    static MODE_FREE = 2

    camera!: THREE.PerspectiveCamera
    defaultCamera!: THREE.PerspectiveCamera
    freeCamera!: THREE.PerspectiveCamera
    freeMode!: CameraControls
    mode: number = View.MODE_DEFAULT

    focusPoint: {
        trackedPosition: THREE.Vector3
        isTracking: boolean
        position: THREE.Vector3
        smoothedPosition: THREE.Vector3
        isEased: boolean
        easing: number
        magnet: { active: boolean, multiplier: number }
    }

    spherical: {
        phi: number
        theta: number
        radius: { edges: { min: number, max: number }, current: number, nonIdealRatioOffset: number }
        offset: THREE.Vector3
    }

    zoom: {
        baseRatio: number
        ratio: number
        smoothedRatio: number
        speedAmplitude: number
        sensitivity: number
    }

    roll: {
        value: number
        velocity: number
        speed: number
        damping: number
        pullStrength: number
        kickStrength: number
        kick: (strength?: number) => void
    }

    optimalArea: {
        position: THREE.Vector3
        basePosition: THREE.Vector3
        radius: number
        update: () => void
        needsUpdate: boolean
        nearDistance: number | null
        farDistance: number | null
    }

    ratioOverflow: number = 0
    idealRatio: number = 1920 / 1080

    private isDragging: boolean = false
    private lastMouseX: number = 0
    private lastMouseY: number = 0
    private pointerDelta: { x: number, y: number } = { x: 0, y: 0 }
    private pointerOffset: { x: number, y: number } = { x: 0, y: 0 }

    constructor() {
        const game = Game.getInstance()

        this.ratioOverflow = Math.max(1, this.idealRatio / game.viewport.ratio) - 1

        this.zoom = {
            baseRatio: 0.6,
            ratio: 0.6,
            smoothedRatio: 0.6,
            speedAmplitude: -0.4,
            sensitivity: 0.05
        }

        this.spherical = {
            phi: Math.PI * 0.31,
            theta: Math.PI * 0.25,
            radius: { edges: { min: 15, max: 30 }, current: 20, nonIdealRatioOffset: 9 },
            offset: new THREE.Vector3()
        }

        this.focusPoint = {
            trackedPosition: new THREE.Vector3(0, 0, 0),
            isTracking: true,
            position: new THREE.Vector3(),
            smoothedPosition: new THREE.Vector3(),
            isEased: true,
            easing: 1,
            magnet: { active: true, multiplier: 0.25 }
        }

        this.roll = {
            value: 0,
            velocity: 0,
            speed: 0,
            damping: 4,
            pullStrength: 100,
            kickStrength: 1,
            kick: (strength = 1) => {
                this.roll.speed = strength * this.roll.kickStrength * (Math.random() < 0.5 ? -1 : 1)
            }
        }

        this.optimalArea = {
            position: new THREE.Vector3(),
            basePosition: new THREE.Vector3(),
            radius: 20,
            needsUpdate: false,
            nearDistance: null,
            farDistance: null,
            update: () => { this.updateOptimalArea() }
        }

        this.setCameras()
        this.setFree()
        this.setupPointer(game.domElement)

        // Inputs
        game.inputs.addActions([
            { name: 'zoom', categories: ['wandering', 'racing'], keys: ['Wheel.roll'] },
        ])
        game.inputs.events.on('zoom', (action: any) => {
            this.zoom.baseRatio -= action.value * this.zoom.sensitivity
            this.zoom.baseRatio = Math.max(0, Math.min(1, this.zoom.baseRatio))
        })

        // Focus tracking actions
        const focusActionNames = ['forward', 'right', 'backward', 'left', 'boost', 'brake', 'respawn', 'suspensions']
        game.inputs.events.on('actionStart', (action: any) => {
            if (focusActionNames.includes(action.name))
                this.focusPoint.isTracking = true
        })

        game.ticker.events.on('tick', () => { this.update() }, 7)
        game.viewport.events.on('change', () => { this.resize() })
        game.viewport.events.on('throttleChange', () => { this.updateOptimalArea() })

        this.updateOptimalArea()
        this.update()
    }

    private setCameras() {
        const game = Game.getInstance()

        this.camera = new THREE.PerspectiveCamera(25, game.viewport.ratio, 0.1, 200)
        this.defaultCamera = this.camera.clone() as THREE.PerspectiveCamera
        this.freeCamera = this.camera.clone() as THREE.PerspectiveCamera

        const radius = this.spherical.radius.current
        this.camera.position.setFromSphericalCoords(radius, this.spherical.phi, this.spherical.theta)
        game.scene.add(this.camera, this.defaultCamera, this.freeCamera)
    }

    private setFree() {
        const game = Game.getInstance()
        this.freeMode = new CameraControls(this.freeCamera, game.domElement)
        this.freeMode.enabled = false
        this.freeMode.smoothTime = 0.075
        this.freeMode.draggingSmoothTime = 0.075
    }

    private setupPointer(element: HTMLElement) {
        let startX = 0, startY = 0
        let isDown = false

        element.addEventListener('mousedown', (e) => {
            isDown = true
            startX = e.clientX
            startY = e.clientY
            this.lastMouseX = e.clientX
            this.lastMouseY = e.clientY
            this.isDragging = false
        })

        window.addEventListener('mousemove', (e) => {
            if (!isDown) return
            const dx = e.clientX - startX
            const dy = e.clientY - startY
            if (Math.hypot(dx, dy) > 3) this.isDragging = true

            if (this.isDragging && this.mode === View.MODE_DEFAULT) {
                const dxMove = e.clientX - this.lastMouseX
                const dyMove = e.clientY - this.lastMouseY
                this.pointerDelta.x += dxMove * 0.003
                this.pointerDelta.y += dyMove * 0.003
                this.focusPoint.isTracking = false
            }
            this.lastMouseX = e.clientX
            this.lastMouseY = e.clientY
        })

        window.addEventListener('mouseup', () => {
            isDown = false
            this.isDragging = false
        })
    }

    private updateOptimalArea() {
        const game = Game.getInstance()
        const radiusMax = this.spherical.radius.edges.max + this.ratioOverflow * this.spherical.radius.nonIdealRatioOffset

        const offset = new THREE.Vector3()
        offset.setFromSphericalCoords(radiusMax, this.spherical.phi, this.spherical.theta)
        this.optimalArea.radius = radiusMax * 0.6
        this.optimalArea.basePosition.set(0, 0, 0)
    }

    resize() {
        const game = Game.getInstance()
        this.ratioOverflow = Math.max(1, this.idealRatio / game.viewport.ratio) - 1
        const aspect = game.viewport.width / game.viewport.height

        this.camera.aspect = aspect
        this.camera.updateProjectionMatrix()
        this.defaultCamera.aspect = aspect
        this.defaultCamera.updateProjectionMatrix()
        this.freeCamera.aspect = aspect
        this.freeCamera.updateProjectionMatrix()
    }

    update() {
        const game = Game.getInstance()
        const dt = game.ticker.deltaScaled

        // Smooth zoom
        const zoomSpeed = this.zoom.baseRatio - this.zoom.smoothedRatio
        this.zoom.smoothedRatio += zoomSpeed * dt * 4
        this.zoom.ratio = this.zoom.smoothedRatio

        // Camera radius
        const { min, max } = this.spherical.radius.edges
        this.spherical.radius.current = min + (max - min) * (1 - this.zoom.smoothedRatio)

        // Update focus point from vehicle
        if (game.physicalVehicle && this.focusPoint.isTracking) {
            this.focusPoint.trackedPosition.copy(game.physicalVehicle.position)
            this.focusPoint.trackedPosition.y = 0
        }

        // Eased smoothing of focus point
        this.focusPoint.smoothedPosition.lerp(this.focusPoint.trackedPosition, dt * 4)
        this.focusPoint.position.copy(this.focusPoint.smoothedPosition)

        // Pointer offset for camera drag
        this.pointerOffset.x += (this.pointerDelta.x - this.pointerOffset.x) * 0.1
        this.pointerOffset.y += (this.pointerDelta.y - this.pointerOffset.y) * 0.1
        this.pointerDelta.x *= 0.95
        this.pointerDelta.y *= 0.95

        // Roll
        this.roll.velocity += (0 - this.roll.value) * this.roll.pullStrength * dt
        this.roll.velocity += this.roll.speed
        this.roll.speed *= Math.max(0, 1 - this.roll.damping * dt)
        this.roll.velocity *= Math.max(0, 1 - this.roll.damping * dt)
        this.roll.value += this.roll.velocity * dt

        // Speed lines strength from vehicle speed
        const sl = (this as any)._speedLines
        if (game.physicalVehicle && sl) {
            const speed = game.physicalVehicle.speed
            const targetStrength = Math.min(speed / 8, 1)
            sl.strength += (targetStrength - sl.strength) * dt * 3
        }

        // Update optimal area
        this.optimalArea.position.copy(this.focusPoint.smoothedPosition)

        // Camera position from spherical coords + focus
        const theta = this.spherical.theta + this.pointerOffset.x
        const phi = this.spherical.phi + this.pointerOffset.y

        const offset = new THREE.Vector3()
        offset.setFromSphericalCoords(this.spherical.radius.current, phi, theta)

        const target = this.focusPoint.smoothedPosition.clone()
        this.camera.position.copy(target).add(offset)
        this.camera.lookAt(target)
        this.camera.rotation.z = this.roll.value

        if (this.mode === View.MODE_FREE) {
            this.freeMode.update(dt)
            this.camera.position.copy(this.freeCamera.position)
            this.camera.quaternion.copy(this.freeCamera.quaternion)
        }
    }

    get speedLines(): { strength: number } | null {
        return null
    }
}
