import * as THREE from 'three/webgpu'
import { color, float, Fn, mix, normalWorld, smoothstep, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import { Game } from './Game'

const NAME_COLOR_MAP: Record<string, string> = {
    tree: '#5a8a3c', birch: '#5a8a3c', oak: '#3d7a2e', cherry: '#c06090',
    leaf: '#4a9a30', leaves: '#4a9a30', bush: '#3a7a28', flower: '#e85070',
    grass: '#4a8030', ground: '#8b6840', dirt: '#9b7450', soil: '#8b7040',
    rock: '#8a8888', stone: '#8a8080', brick: '#aa5533', wall: '#9a7a60',
    wood: '#8b6030', fence: '#8b6030', bench: '#7a5828', log: '#7a5828',
    water: '#3060aa', lake: '#3060aa', river: '#3060aa', ocean: '#204070',
    road: '#888888', path: '#a08060', sand: '#c8b080',
    building: '#9a9090', house: '#c09080', roof: '#a05030',
    metal: '#888898', iron: '#787888',
    light: '#ffff88', lamp: '#ffcc44', lantern: '#ffcc44',
    white: '#e8e8e8', black: '#222222', red: '#cc3333', blue: '#3355cc',
    green: '#44aa44', yellow: '#cccc22', orange: '#cc6622', purple: '#8844cc',
}

function colorFromName(name: string): string {
    const lower = name.toLowerCase()
    for (const [key, col] of Object.entries(NAME_COLOR_MAP)) {
        if (lower.includes(key)) return col
    }
    return '#aaa090'
}

export class Materials {
    paletteTexture!: THREE.Texture
    items: globalThis.Map<string, THREE.NodeMaterial> = new globalThis.Map()

    directionUniform: any
    intensityUniform: any
    colorUniform: any
    shadowColorUniform: any
    bounceColorUniform: any
    coreShadowEdgeLow: any
    coreShadowEdgeHigh: any
    lightBounceEdgeLow: any
    lightBounceEdgeHigh: any

    constructor() {}

    async init() {
        this.paletteTexture = await new Promise<THREE.Texture>((resolve) => {
            new THREE.TextureLoader().load('/palette.png', (t) => {
                t.minFilter = THREE.NearestFilter
                t.magFilter = THREE.NearestFilter
                t.flipY = false
                resolve(t)
            }, undefined, () => {
                const canvas = document.createElement('canvas')
                canvas.width = 4; canvas.height = 4
                const ctx = canvas.getContext('2d')!
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, 4, 4)
                resolve(new THREE.CanvasTexture(canvas))
            })
        })

        this.directionUniform = uniform(new THREE.Vector3(0.5, 1, 0.5).normalize())
        this.intensityUniform = uniform(1.0)
        this.colorUniform = uniform(new THREE.Color('#ffffff'))
        this.shadowColorUniform = uniform(new THREE.Color('#2a1630'))
        this.bounceColorUniform = uniform(new THREE.Color('#82487f'))
        this.coreShadowEdgeLow = uniform(-0.1)
        this.coreShadowEdgeHigh = uniform(0.6)
        this.lightBounceEdgeLow = uniform(-0.8)
        this.lightBounceEdgeHigh = uniform(0.4)
    }

    createDefaultMaterial(options: {
        color?: string | THREE.Color
        colorNode?: any
        flatShading?: boolean
        wireframe?: boolean
    } = {}): THREE.MeshLambertNodeMaterial {
        const mat = new THREE.MeshLambertNodeMaterial()
        mat.shadowSide = THREE.FrontSide

        const hexColor = options.color instanceof THREE.Color
            ? '#' + options.color.getHexString()
            : (options.color ?? '#aaa090')

        const baseColor = options.colorNode ?? vec4(color(hexColor), 1)

        const lightDir = this.directionUniform
        const nDotL = normalWorld.dot(lightDir)

        const shadowMix = smoothstep(this.coreShadowEdgeLow, this.coreShadowEdgeHigh, nDotL)
        const shadowColor4 = vec4(color(this.shadowColorUniform.value), 1)
        const litColor = mix(shadowColor4, baseColor, shadowMix)

        const bounceMix = smoothstep(this.lightBounceEdgeLow, this.lightBounceEdgeHigh, nDotL.negate())
        const bounceColor4 = vec4(color(this.bounceColorUniform.value), 1)
        const finalColor = mix(litColor, bounceColor4, bounceMix.mul(0.35))

        mat.colorNode = finalColor
        if (options.wireframe) mat.wireframe = true
        return mat
    }

    createGradient(name: string, colorA: string, colorB: string): THREE.MeshLambertNodeMaterial {
        const canvas = document.createElement('canvas')
        canvas.width = 1; canvas.height = 64
        const ctx = canvas.getContext('2d')!
        const grad = ctx.createLinearGradient(0, 0, 0, 64)
        grad.addColorStop(0, colorA)
        grad.addColorStop(1, colorB)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, 1, 64)

        const gradTex = new THREE.CanvasTexture(canvas)
        gradTex.colorSpace = THREE.SRGBColorSpace
        gradTex.minFilter = THREE.NearestFilter

        const mat = new THREE.MeshLambertNodeMaterial()
        mat.colorNode = texture(gradTex, vec2(float(0), normalWorld.y.mul(0.5).add(0.5)))
        this.items.set(name, mat)
        return mat
    }

    getFromName(name: string): THREE.NodeMaterial | undefined {
        return this.items.get(name)
    }

    updateObject(object: THREE.Object3D) {
        object.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return

            const objectName = (child.name || child.parent?.name || '').toLowerCase()
            const mat = child.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]
            let hexColor = colorFromName(objectName)

            if (!objectName || objectName === 'mesh' || objectName === '') {
                const firstMat = Array.isArray(mat) ? mat[0] : mat
                if (firstMat && (firstMat as any).color) {
                    const orig = (firstMat as any).color as THREE.Color
                    if (orig.r !== 1 || orig.g !== 1 || orig.b !== 1) {
                        hexColor = '#' + orig.getHexString()
                    }
                }
            } else {
                const firstMat = Array.isArray(mat) ? mat[0] : mat
                if (firstMat && (firstMat as any).color) {
                    const orig = (firstMat as any).color as THREE.Color
                    const lum = orig.r * 0.299 + orig.g * 0.587 + orig.b * 0.114
                    if (lum > 0.05 && !(orig.r === 1 && orig.g === 1 && orig.b === 1)) {
                        hexColor = '#' + orig.getHexString()
                    }
                }
            }

            const newMat = this.createDefaultMaterial({ color: hexColor })

            if (child.receiveShadow) newMat.shadowSide = THREE.FrontSide
            if (Array.isArray(child.material)) {
                child.material = child.material.map(() => newMat.clone())
            } else {
                child.material = newMat
            }
        })
    }
}
