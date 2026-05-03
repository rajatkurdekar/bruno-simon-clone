import { Events } from './Events'

export class Viewport {
    width: number
    height: number
    ratio: number
    pixelRatio: number
    events: Events = new Events()
    private resizeTimeout: ReturnType<typeof setTimeout> | null = null

    constructor(private container: HTMLElement) {
        this.width = container.clientWidth
        this.height = container.clientHeight
        this.ratio = this.width / this.height
        this.pixelRatio = Math.min(window.devicePixelRatio, 2)

        window.addEventListener('resize', this.onResize.bind(this))
    }

    private onResize() {
        this.width = this.container.clientWidth
        this.height = this.container.clientHeight
        this.ratio = this.width / this.height
        this.pixelRatio = Math.min(window.devicePixelRatio, 2)
        this.events.trigger('change')

        if (this.resizeTimeout) clearTimeout(this.resizeTimeout)
        this.resizeTimeout = setTimeout(() => {
            this.events.trigger('throttleChange')
        }, 250)
    }
}
