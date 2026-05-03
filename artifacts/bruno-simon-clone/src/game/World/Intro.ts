import gsap from 'gsap'
import { Game } from '../Game'

export class Intro {
    private loadingEl: HTMLElement | null = null
    private progressEl: HTMLElement | null = null
    private progressBarEl: HTMLElement | null = null
    circle: { hide: (cb?: () => void) => void }

    constructor() {
        const game = Game.getInstance()

        // Create loading overlay
        this.createLoadingUI()

        this.circle = {
            hide: (cb?: () => void) => {
                gsap.to(this.loadingEl!, {
                    opacity: 0,
                    duration: 0.8,
                    ease: 'power2.inOut',
                    onComplete: () => {
                        if (this.loadingEl) this.loadingEl.style.display = 'none'
                        if (cb) cb()
                    }
                })
            }
        }
    }

    private createLoadingUI() {
        const existing = document.getElementById('loading-screen')
        if (existing) {
            this.loadingEl = existing
            this.progressBarEl = existing.querySelector('#loading-progress-bar') ?? existing.querySelector('.loading-progress-bar')
            this.progressEl = existing.querySelector('#loading-subtitle') ?? existing.querySelector('.loading-subtitle')
            return
        }

        this.loadingEl = document.createElement('div')
        this.loadingEl.id = 'loading-screen'
        this.loadingEl.innerHTML = `
            <div class="loading-inner">
                <div class="loading-title">Bruno's</div>
                <div class="loading-progress-container">
                    <div class="loading-progress-bar" id="loading-progress-bar"></div>
                </div>
                <div class="loading-subtitle" id="loading-subtitle">Loading...</div>
            </div>
        `
        document.querySelector('.game')?.appendChild(this.loadingEl)
        this.progressBarEl = document.getElementById('loading-progress-bar')
        this.progressEl = document.getElementById('loading-subtitle')
    }

    updateProgress(toLoad: number, total: number) {
        if (!this.progressBarEl || !this.progressEl) return
        const progress = total > 0 ? (total - toLoad) / total : 1
        this.progressBarEl.style.width = `${progress * 100}%`
        if (toLoad === 0) {
            this.progressEl.textContent = 'Press anywhere to start'
            this.progressEl.style.cursor = 'pointer'
        } else {
            this.progressEl.textContent = `Loading... ${Math.round(progress * 100)}%`
        }
    }

    hide() {
        this.circle.hide()
    }
}
