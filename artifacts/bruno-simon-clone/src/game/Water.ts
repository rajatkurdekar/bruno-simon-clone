import * as THREE from 'three/webgpu'
import { Fn, sin, cos, vec3, vec4, color, uniform, positionLocal, normalWorld, mix } from 'three/tsl'
import { Game } from './Game'

export class Water {
    surfaceElevation: number = -2
    surfaceThickness: number = 0.1
    depthElevation: number = -10
    surfaceElevationUniform: any
    surfaceThicknessUniform: any

    private mesh: THREE.Mesh | null = null
    private timeUniform: any
    private waveAmplitude: number = 0.12
    private waveSpeed: number = 0.8

    constructor() {
        this.surfaceElevationUniform = { value: this.surfaceElevation }
        this.surfaceThicknessUniform = { value: this.surfaceThickness }
    }

    init() {
        const game = Game.getInstance()
        this.timeUniform = uniform(0)

        const geometry = new THREE.PlaneGeometry(200, 200, 64, 64)
        geometry.rotateX(-Math.PI * 0.5)

        const mat = new THREE.MeshLambertNodeMaterial()

        mat.positionNode = Fn(() => {
            const t = this.timeUniform
            const wave =
                sin(positionLocal.x.mul(0.35).add(t.mul(this.waveSpeed))).mul(this.waveAmplitude)
                .add(sin(positionLocal.z.mul(0.28).add(t.mul(this.waveSpeed * 1.3))).mul(this.waveAmplitude * 0.7))
                .add(cos(positionLocal.x.mul(0.18).add(positionLocal.z.mul(0.22)).add(t.mul(this.waveSpeed * 0.7))).mul(this.waveAmplitude * 0.5))
            return vec3(positionLocal.x, positionLocal.y.add(wave), positionLocal.z)
        })()

        const deepColor = color('#1a3060')
        const shallowColor = color('#3070aa')
        const foamColor = color('#88aacc')

        const nDotUp = normalWorld.y.clamp(0, 1)
        const waterColor = mix(deepColor, mix(shallowColor, foamColor, nDotUp.smoothstep(0.7, 1.0)), nDotUp)
        mat.colorNode = vec4(waterColor, 1)
        mat.transparent = true
        mat.opacity = 0.82

        this.mesh = new THREE.Mesh(geometry, mat as any)
        this.mesh.position.y = this.surfaceElevation
        this.mesh.receiveShadow = true
        game.scene.add(this.mesh)

        game.ticker.events.on('tick', () => {
            this.timeUniform.value += game.ticker.deltaScaled * this.waveSpeed
        }, 11)
    }
}
