import * as THREE from 'three/webgpu'
import { Game } from './Game'

export class Rendering {
    renderer!: any
    postProcessing: any = null
    isWebGPU: boolean = false

    constructor() {}

    async setRenderer() {
        const game = Game.getInstance()

        const w = Math.max(game.viewport.width, 1)
        const h = Math.max(game.viewport.height, 1)
        game.canvasElement.width = w
        game.canvasElement.height = h

        // Always use WebGPURenderer — it handles both WebGPU and WebGL2 backends,
        // AND it properly compiles TSL NodeMaterials for both. Vanilla WebGLRenderer
        // does NOT support NodeMaterials so must never be used as fallback.

        // First attempt on the existing canvas
        try {
            const gpuRenderer = new THREE.WebGPURenderer({
                canvas: game.canvasElement as any,
                powerPreference: 'high-performance',
                antialias: game.viewport.pixelRatio < 2,
            } as any)

            gpuRenderer.setSize(w, h)
            gpuRenderer.setPixelRatio(game.viewport.pixelRatio)
            gpuRenderer.sortObjects = false
            gpuRenderer.shadowMap.enabled = true
            gpuRenderer.shadowMap.type = THREE.PCFSoftShadowMap

            await gpuRenderer.init()

            this.renderer = gpuRenderer
            this.isWebGPU = !!(gpuRenderer as any).backend?.isWebGPUBackend
            console.info('Renderer:', this.isWebGPU ? 'WebGPU' : 'WebGL2 (via WebGPURenderer)')
        } catch(e) {
            // First attempt failed — canvas may be poisoned by the failed WebGL context.
            // Swap to a FRESH canvas and retry once.
            console.warn('First WebGPURenderer attempt failed, retrying with fresh canvas:', (e as any)?.message)

            const freshCanvas = document.createElement('canvas')
            freshCanvas.className = 'js-canvas'
            freshCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;outline:none;'
            freshCanvas.width = w
            freshCanvas.height = h

            const parent = game.canvasElement.parentNode
            if (parent) parent.replaceChild(freshCanvas, game.canvasElement)
            else document.querySelector('.game')?.prepend(freshCanvas)
            game.canvasElement = freshCanvas

            try {
                const gpuRenderer2 = new THREE.WebGPURenderer({
                    canvas: freshCanvas as any,
                    powerPreference: 'high-performance',
                    antialias: game.viewport.pixelRatio < 2,
                } as any)

                gpuRenderer2.setSize(w, h)
                gpuRenderer2.setPixelRatio(game.viewport.pixelRatio)
                gpuRenderer2.sortObjects = false
                gpuRenderer2.shadowMap.enabled = true
                gpuRenderer2.shadowMap.type = THREE.PCFSoftShadowMap

                await gpuRenderer2.init()

                this.renderer = gpuRenderer2
                this.isWebGPU = !!(gpuRenderer2 as any).backend?.isWebGPUBackend
                console.info('Renderer (fresh canvas):', this.isWebGPU ? 'WebGPU' : 'WebGL2')
            } catch(e2) {
                // No WebGL available — run headless (game logic and audio still work)
                console.warn('No WebGL/WebGPU available — running headless:', (e2 as any)?.message)
                this.renderer = this.makeHeadlessRenderer()
            }
        }

        // Update renderer label in UI
        const rendererLabel = document.querySelector('.js-renderer-label')
        if (rendererLabel) rendererLabel.textContent = this.isWebGPU ? 'WebGPU' : 'WebGL'
        const tooltipEl = document.querySelector('.js-tooltip')
        if (tooltipEl) tooltipEl.textContent = this.isWebGPU ? 'Best performance' : 'WebGPU not available'

        this.renderer.setAnimationLoop((elapsedTime: number) => {
            game.ticker.update(elapsedTime)
        })
    }

    private makeHeadlessRenderer() {
        return {
            setAnimationLoop: (fn: (t: number) => void) => {
                const loop = (t: number) => { fn(t); requestAnimationFrame(loop) }
                requestAnimationFrame(loop)
            },
            render: () => {},
            setSize: () => {},
            setPixelRatio: () => {},
            info: { render: { calls: 0, triangles: 0 } },
            shadowMap: { enabled: false, type: 0 },
        }
    }

    setPostprocessing() {
        const game = Game.getInstance()
        if (!this.isWebGPU) return

        try {
            const THREE_GP = THREE as any
            if (!THREE_GP.RenderPipeline) return

            Promise.all([
                import('three/tsl'),
                import('three/addons/tsl/display/BloomNode.js'),
            ]).then(([tsl, bloomMod]: any[]) => {
                this.postProcessing = new THREE_GP.RenderPipeline(this.renderer)
                const scenePass = tsl.pass(game.scene, game.view.camera)
                const color = scenePass.getTextureNode('output')
                const bloomPass = bloomMod.bloom(color)
                bloomPass.threshold.value = 1
                bloomPass.strength.value = 0.25
                this.postProcessing.outputNode = color.add(bloomPass)
            }).catch(() => {})
        } catch(e) { this.postProcessing = null }
    }

    start() {
        const game = Game.getInstance()
        game.ticker.events.on('tick', () => { this.render() }, 998)
        game.viewport.events.on('change', () => { this.resize() })
    }

    resize() {
        const game = Game.getInstance()
        const w = Math.max(game.viewport.width, 1)
        const h = Math.max(game.viewport.height, 1)
        game.canvasElement.width = w
        game.canvasElement.height = h
        this.renderer.setSize?.(w, h)
        this.renderer.setPixelRatio?.(game.viewport.pixelRatio)
        if (game.view?.camera) {
            game.view.camera.aspect = w / h
            game.view.camera.updateProjectionMatrix()
        }
    }

    render() {
        const game = Game.getInstance()
        if (!game.view?.camera) return
        try {
            if (this.postProcessing) {
                this.postProcessing.render()
            } else {
                this.renderer.render(game.scene, game.view.camera)
            }
        } catch(e) {}
    }
}
