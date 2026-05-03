import * as THREE from 'three/webgpu'
import { texture, uniform, vec2, Fn } from 'three/tsl'
import { Game } from './Game'

export class Terrain {
    size: number = 192
    subdivision: number = 128

    terrainTexture!: THREE.Texture
    heightData: Float32Array | null = null
    vertexCount: number = 0
    rowsCount: number = 0

    tracksDelta: any
    terrainNode: any
    colorNode: any
    gradientTexture: THREE.Texture | null = null

    // Gradient colors
    colors = [
        { stop: 0.1, value: '#ffa94e' },
        { stop: 0.3, value: '#5bc2b9' },
        { stop: 0.9, value: '#13375f' },
    ]

    constructor() {
        const game = Game.getInstance()
        this.tracksDelta = uniform(vec2(0, 0))
        this.createGradientTexture()

        game.ticker.events.on('tick', () => {
            this.update()
        }, 10)
    }

    createGradientTexture() {
        const height = 16
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = height
        const context = canvas.getContext('2d')!

        this.gradientTexture = new THREE.Texture(canvas)
        this.gradientTexture.colorSpace = THREE.SRGBColorSpace

        this.updateGradient(context, height)
    }

    private updateGradient(context: CanvasRenderingContext2D, height: number) {
        const gradient = context.createLinearGradient(0, 0, 0, height)
        for (const c of this.colors)
            gradient.addColorStop(c.stop, c.value)
        context.fillStyle = gradient
        context.fillRect(0, 0, 1, height)
        if (this.gradientTexture) this.gradientTexture.needsUpdate = true
    }

    setupNodes(terrainTexture: THREE.Texture) {
        this.terrainTexture = terrainTexture
        this.terrainTexture.flipY = false

        const worldPositionToUvNode = Fn(([position]: any[]) => {
            return (position as any).div(this.subdivision).div(1.5).add(0.5)
        })

        this.terrainNode = Fn(([position]: any[]) => {
            const textureUv = worldPositionToUvNode(position)
            return texture(this.terrainTexture, textureUv)
        })

        this.colorNode = Fn(([terrainData]: any[]) => {
            const baseColor = texture(this.gradientTexture!, vec2(0, terrainData.b.oneMinus()))
            return baseColor.rgb
        })
    }

    extractHeightData(geometry: THREE.BufferGeometry) {
        const positionAttribute = geometry.attributes.position
        const totalCount = positionAttribute.count
        this.rowsCount = Math.round(Math.sqrt(totalCount))
        this.heights = new Float32Array(totalCount)
        const halfExtent = this.size / 2

        for (let i = 0; i < totalCount; i++) {
            const x = positionAttribute.array[i * 3 + 0]
            const z = positionAttribute.array[i * 3 + 2]
            const y = positionAttribute.array[i * 3 + 1]

            const indexX = Math.round(((x / (halfExtent * 2)) + 0.5) * (this.rowsCount - 1))
            const indexZ = Math.round(((z / (halfExtent * 2)) + 0.5) * (this.rowsCount - 1))
            const index = indexZ + indexX * this.rowsCount

            if (index >= 0 && index < totalCount) this.heights[index] = y
        }

        this.heightData = this.heights
        this.vertexCount = totalCount
    }

    heights: Float32Array = new Float32Array(0)

    update() {
        const game = Game.getInstance()
        if (!game.physicalVehicle) return
        const p = game.physicalVehicle.position
        this.tracksDelta.value.set(p.x, p.z)
    }
}
