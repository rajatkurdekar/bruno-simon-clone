import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { Game } from './Game'

export type ResourceMap = { [key: string]: any }

export class Resources {
    private gltfLoader: GLTFLoader
    private textureLoader: THREE.TextureLoader
    private ktx2Loader: KTX2Loader | null = null

    constructor() {
        const game = Game.getInstance()

        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

        this.gltfLoader = new GLTFLoader()
        this.gltfLoader.setDRACOLoader(dracoLoader)

        this.textureLoader = new THREE.TextureLoader()

        try {
            this.ktx2Loader = new KTX2Loader()
            this.ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.166.0/examples/jsm/libs/basis/')
            if (game.rendering?.renderer) {
                this.ktx2Loader.detectSupport(game.rendering.renderer)
                this.gltfLoader.setKTX2Loader(this.ktx2Loader)
            }
        } catch(e) {
            console.warn('KTX2Loader not available')
        }
    }

    async loadGLTF(path: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(path, resolve, undefined, reject)
        })
    }

    async loadTexture(path: string, onLoad?: (t: THREE.Texture) => void): Promise<THREE.Texture> {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(path, (texture) => {
                if (onLoad) onLoad(texture)
                resolve(texture)
            }, undefined, () => {
                console.warn(`Failed to load texture: ${path}`)
                const fallback = new THREE.Texture()
                resolve(fallback)
            })
        })
    }

    async load(
        items: [string, string, string, ((r: any) => void)?][],
        onProgress?: (toLoad: number, total: number) => void
    ): Promise<ResourceMap> {
        const result: ResourceMap = {}
        const total = items.length
        let loaded = 0

        if (onProgress) onProgress(total, total)

        const promises = items.map(async ([key, path, type, callback]) => {
            try {
                let resource: any
                if (type === 'gltf') {
                    resource = await this.loadGLTF(path)
                } else if (type === 'texture' || type === 'textureKtx') {
                    resource = await this.loadTexture(path, callback)
                } else {
                    resource = await this.loadGLTF(path)
                }

                if (callback && type !== 'texture' && type !== 'textureKtx') callback(resource)
                result[key] = resource
            } catch(e) {
                console.warn(`Failed to load ${key}: ${path}`, e)
                result[key] = null
            }

            loaded++
            if (onProgress) onProgress(total - loaded, total)
        })

        await Promise.all(promises)
        return result
    }

    getLoader(type: string) {
        if (type === 'gltf') return this.gltfLoader
        if (type === 'texture' || type === 'textureKtx') return this.textureLoader
        return this.gltfLoader
    }
}
