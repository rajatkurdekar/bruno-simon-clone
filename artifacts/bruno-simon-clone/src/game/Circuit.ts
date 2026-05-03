import { Events } from './Events'
import { Game } from './Game'

interface CircuitRecord {
    ms: number
    formatted: string
}

export class Circuit {
    events: Events = new Events()

    isActive: boolean = false
    isRunning: boolean = false
    startTime: number = 0
    elapsed: number = 0
    bestRecord: CircuitRecord | null = null
    lastRecord: CircuitRecord | null = null

    private timerEl: HTMLElement | null = null
    private overlayEl: HTMLElement | null = null
    private countdownEl: HTMLElement | null = null
    private menuBestEl: HTMLElement | null = null
    private menuLastEl: HTMLElement | null = null

    constructor() {
        try {
            const saved = localStorage.getItem('circuit-best')
            if (saved) {
                const ms = parseInt(saved)
                if (!isNaN(ms) && ms > 0) {
                    this.bestRecord = { ms, formatted: this.fmt(ms) }
                }
            }
        } catch(e) {}

        this.setupUI()
        this.setupEvents()
    }

    private setupUI() {
        this.overlayEl = document.querySelector('.js-circuit')
        this.timerEl = document.querySelector('.js-circuit-timer')
        this.countdownEl = document.querySelector('.js-circuit-countdown')
        this.menuBestEl = document.querySelector('.js-circuit-menu-best')
        this.menuLastEl = document.querySelector('.js-circuit-menu-last')
        this.updateMenuDisplay()
    }

    private setupEvents() {
        const game = Game.getInstance()

        game.ticker.events.on('tick', () => {
            if (!this.isRunning) return
            this.elapsed = Date.now() - this.startTime
            if (this.timerEl) this.timerEl.textContent = this.fmt(this.elapsed)
        }, 4)
    }

    onAreaEnter(areaName: string) {
        if (!areaName.toLowerCase().includes('circuit')) return
        if (this.isActive) {
            this.finish()
        } else {
            this.enter()
        }
    }

    onAreaLeave(areaName: string) {
        if (!areaName.toLowerCase().includes('circuit')) return
        if (this.isRunning) this.finish()
        else if (this.isActive) this.abandon()
    }

    enter() {
        if (this.isActive) return
        const game = Game.getInstance()
        this.isActive = true
        this.overlayEl?.classList.add('is-visible')
        game.notifications?.show({ title: 'Circuit zone!', text: 'Race begins soon…' })
        this.startCountdown()
    }

    private startCountdown() {
        const game = Game.getInstance()
        game.audio?.groups?.get('circuitCountdown')?.playRandom?.()

        let count = 3
        const tick = () => {
            if (!this.countdownEl) return
            if (count > 0) {
                this.countdownEl.textContent = String(count)
                this.countdownEl.classList.add('is-visible', 'is-pop')
                setTimeout(() => this.countdownEl?.classList.remove('is-pop'), 350)
                count--
                setTimeout(tick, 1000)
            } else {
                this.countdownEl.textContent = 'GO!'
                this.countdownEl.classList.add('is-go', 'is-pop')
                this.startTimer()
                setTimeout(() => {
                    this.countdownEl?.classList.remove('is-visible', 'is-go', 'is-pop')
                }, 900)
            }
        }
        tick()
    }

    private startTimer() {
        this.isRunning = true
        this.startTime = Date.now()
        this.elapsed = 0
        if (this.timerEl) this.timerEl.textContent = this.fmt(0)
    }

    finish() {
        if (!this.isRunning) {
            if (this.isActive) this.abandon()
            return
        }
        const game = Game.getInstance()

        const finalMs = Date.now() - this.startTime
        this.isRunning = false

        if (finalMs <= 0) { this.abandon(); return }

        this.lastRecord = { ms: finalMs, formatted: this.fmt(finalMs) }
        const isNewBest = !this.bestRecord || finalMs < this.bestRecord.ms

        if (isNewBest) {
            this.bestRecord = { ...this.lastRecord }
            try { localStorage.setItem('circuit-best', String(finalMs)) } catch(e) {}
            game.achievements?.unlock('visitCircuit')
            game.notifications?.show({ title: `New best! ${this.bestRecord.formatted}`, icon: '/ui/flag.svg' })
        } else {
            game.notifications?.show({ title: `Finished: ${this.lastRecord.formatted}` })
        }

        game.audio?.groups?.get('circuitFinish')?.playRandom?.()
        setTimeout(() => game.audio?.groups?.get('circuitApplause')?.playRandom?.(), 700)

        this.updateMenuDisplay()
        this.events.trigger('finish', [this.lastRecord, isNewBest])

        setTimeout(() => {
            this.isActive = false
            this.overlayEl?.classList.remove('is-visible')
        }, 4000)
    }

    abandon() {
        this.isRunning = false
        this.isActive = false
        this.overlayEl?.classList.remove('is-visible')
        this.countdownEl?.classList.remove('is-visible', 'is-go', 'is-pop')
    }

    private updateMenuDisplay() {
        if (this.menuBestEl) {
            this.menuBestEl.textContent = this.bestRecord ? this.bestRecord.formatted : '--:--.--'
        }
        if (this.menuLastEl) {
            this.menuLastEl.textContent = this.lastRecord ? this.lastRecord.formatted : '--:--.--'
        }
    }

    fmt(ms: number): string {
        const m = Math.floor(ms / 60000)
        const s = Math.floor((ms % 60000) / 1000)
        const cs = Math.floor((ms % 1000) / 10)
        return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
    }
}
