import gsap from 'gsap'
import { Events } from './Events'
import { Game } from './Game'

export class Menu {
    events: Events = new Events()
    isOpen: boolean = false
    currentSection: string | null = null

    private element: HTMLElement | null
    private trigger: HTMLElement | null
    private closeButton: HTMLElement | null
    private navItems: NodeListOf<HTMLElement>
    private previews: HTMLElement[]
    private contents: HTMLElement[]

    constructor() {
        this.element = document.querySelector('.js-menu')
        this.trigger = document.querySelector('.js-menu-trigger')
        this.closeButton = this.element?.querySelector('.js-close') ?? null
        this.navItems = document.querySelectorAll('.js-navigation-item')
        this.previews = Array.from(document.querySelectorAll('.js-preview'))
        this.contents = Array.from(document.querySelectorAll('.js-content'))

        this.setupTrigger()
        this.setupNavigation()
        this.setupOptions()
    }

    private setupTrigger() {
        this.trigger?.addEventListener('click', () => {
            if (this.isOpen) this.close()
            else this.open('home')
        })
        this.closeButton?.addEventListener('click', () => this.close())
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close()
        })
    }

    private setupNavigation() {
        this.navItems.forEach((item) => {
            const name = item.dataset.name
            if (!name) return

            item.addEventListener('click', () => {
                if (this.currentSection === name && this.isOpen) this.close()
                else this.open(name)
            })

            item.addEventListener('mouseenter', () => {
                if (!this.isOpen) this.showPreview(name)
            })
            item.addEventListener('mouseleave', () => {
                if (!this.isOpen) this.hidePreview(name)
            })
        })
    }

    private setupOptions() {
        const game = Game.getInstance()

        document.querySelector('.js-audio-toggle')?.addEventListener('click', () => {
            game.audio?.toggle?.()
            game.audio?.playSfx('clicks')
        })

        document.querySelector('.js-night-mode-toggle')?.addEventListener('click', () => {
            game.nightMode?.toggle?.()
            game.audio?.playSfx('clicks')
        })

        document.querySelector('.js-quality-toggle')?.addEventListener('click', () => {
            // Quality toggle hook
            game.audio?.playSfx('clicks')
        })

        document.querySelector('.js-respawn')?.addEventListener('click', () => {
            if (game.physicalVehicle && game.respawns) {
                const closest = game.respawns.getClosest(game.physicalVehicle.position)
                game.physicalVehicle.moveTo(closest.position, closest.rotation)
                this.close()
            }
        })

        // Renderer info update
        setTimeout(() => {
            const rendererLabel = document.querySelector('.js-renderer-label')
            const rendererBtn = document.querySelector('.js-renderer')
            const tooltip = document.querySelector('.js-tooltip')
            if (rendererLabel && game.rendering) {
                const isWebGPU = (game.rendering as any).isWebGPU ?? false
                rendererLabel.textContent = isWebGPU ? 'WebGPU' : 'WebGL2'
                rendererBtn?.classList.add('is-success')
                rendererBtn?.classList.remove('is-disabled')
                if (tooltip) tooltip.textContent = isWebGPU ? 'Running on WebGPU' : 'Running on WebGL2 backend'
            }
        }, 2000)
    }

    open(section: string) {
        this.isOpen = true
        this.currentSection = section
        this.element?.classList.add('is-open')

        this.navItems.forEach((item) => {
            item.classList.toggle('is-active', item.dataset.name === section)
        })
        this.previews.forEach((el) => {
            el.classList.toggle('is-active', el.classList.contains(`${section}-preview`))
        })
        this.contents.forEach((el) => {
            el.classList.toggle('is-active', el.classList.contains(`${section}-content`))
        })

        this.events.trigger('open', [{ section }])

        const game = Game.getInstance()
        game.audio?.playSfx('clicks')
    }

    close() {
        this.isOpen = false
        this.currentSection = null
        this.element?.classList.remove('is-open')
        this.navItems.forEach((item) => item.classList.remove('is-active'))
        this.previews.forEach((el) => el.classList.remove('is-active'))
        this.contents.forEach((el) => el.classList.remove('is-active'))
        this.events.trigger('close')
    }

    showPreview(name: string) {
        this.element?.querySelector(`.${name}-preview`)?.classList.add('is-hover')
    }

    hidePreview(name: string) {
        this.element?.querySelector(`.${name}-preview`)?.classList.remove('is-hover')
    }
}
