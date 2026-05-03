import { Game } from './Game'

export class SpeedLines {
    private element: HTMLElement | null = null
    private strength: number = 0

    constructor() {
        this.element = document.querySelector('.js-speed-lines')

        const game = Game.getInstance()
        game.ticker.events.on('tick', () => {
            this.update()
        }, 8)
    }

    update() {
        const game = Game.getInstance()
        if (!this.element) return

        const speed = game.physicalVehicle?.speed ?? 0
        const targetStrength = Math.max(0, Math.min(1, (speed - 6) / 8))
        const dt = game.ticker.deltaScaled

        this.strength += (targetStrength - this.strength) * Math.min(1, dt * 5)

        if (this.strength > 0.005) {
            this.element.style.opacity = String(this.strength)
            this.element.classList.add('is-active')
        } else {
            this.element.classList.remove('is-active')
            this.element.style.opacity = '0'
        }
    }
}
