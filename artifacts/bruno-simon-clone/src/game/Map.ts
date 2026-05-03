import { Game } from './Game'

export class Map {
    element: HTMLElement | null = null
    trigger: HTMLElement | null = null
    closeButton: HTMLElement | null = null
    textureEl: HTMLImageElement | null = null
    playerDot: HTMLElement | null = null
    isOpen: boolean = false

    // Terrain bounds for coordinate mapping
    terrainHalfSize: number = 96

    constructor() {
        this.element = document.querySelector('.js-modal[data-modal-name="map"]')
        this.trigger = document.querySelector('.js-map-trigger')
        this.closeButton = this.element?.querySelector('.js-close') ?? null
        this.textureEl = this.element?.querySelector('.js-texture') as HTMLImageElement ?? null
        this.playerDot = this.element?.querySelector('.js-player') ?? null

        this.loadMapImage()
        this.setupEvents()

        const game = Game.getInstance()
        game.ticker.events.on('tick', () => {
            if (this.isOpen) this.updatePlayerDot()
        }, 15)
    }

    private loadMapImage() {
        if (!this.textureEl) return

        // Try WebP first, fallback to PNG
        const img = new Image()
        img.onload = () => {
            if (this.textureEl) this.textureEl.src = '/ui/map/map-day.webp'
        }
        img.onerror = () => {
            if (this.textureEl) this.textureEl.src = '/ui/map/map-day.png'
        }
        img.src = '/ui/map/map-day.webp'
    }

    private setupEvents() {
        this.trigger?.addEventListener('click', () => {
            this.toggle()
        })

        this.closeButton?.addEventListener('click', () => {
            this.close()
        })

        // M key
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyM') this.toggle()
            if (e.key === 'Escape' && this.isOpen) this.close()
        })

        // Click backdrop
        this.element?.addEventListener('click', (e) => {
            if (e.target === this.element) this.close()
        })
    }

    toggle() {
        if (this.isOpen) this.close()
        else this.open()
    }

    open() {
        this.isOpen = true
        this.element?.classList.add('is-open')
        this.updatePlayerDot()
    }

    close() {
        this.isOpen = false
        this.element?.classList.remove('is-open')
    }

    private updatePlayerDot() {
        const game = Game.getInstance()
        if (!this.playerDot || !game.physicalVehicle) return

        const pos = game.physicalVehicle.position
        const container = this.element?.querySelector('.js-map-container') as HTMLElement
        if (!container) return

        // Map 3D world coords → 2D map UV coords
        // Terrain is centered at 0,0 with size = terrainHalfSize*2
        const u = (pos.x / (this.terrainHalfSize * 2)) + 0.5
        const v = (pos.z / (this.terrainHalfSize * 2)) + 0.5

        const clampedU = Math.max(0.02, Math.min(0.98, u))
        const clampedV = Math.max(0.02, Math.min(0.98, v))

        this.playerDot.style.left = `${clampedU * 100}%`
        this.playerDot.style.top = `${clampedV * 100}%`

        // Rotate dot by vehicle heading
        const angle = game.physicalVehicle.yRotation
        this.playerDot.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`
    }
}
