import gsap from 'gsap'
import { Game } from './Game'
import { Area } from './Areas'

export class Sections {
    element: HTMLElement | null = null
    titleEl: HTMLElement | null = null
    subtitleEl: HTMLElement | null = null
    dotEl: HTMLElement | null = null
    actionsEl: HTMLElement | null = null

    currentArea: Area | null = null
    isVisible: boolean = false

    constructor() {
        this.element = document.querySelector('.js-section-popup')
        this.titleEl = document.querySelector('.js-section-title')
        this.subtitleEl = document.querySelector('.js-section-subtitle')
        this.dotEl = document.querySelector('.js-section-dot')
        this.actionsEl = document.querySelector('.js-section-actions')

        if (!this.element) return

        // Close on click outside area
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide()
        })
    }

    updateNearest(area: Area | null) {
        if (area?.name === this.currentArea?.name) return

        if (!area) {
            this.hide()
            this.currentArea = null
            return
        }

        this.currentArea = area
        this.show(area)
    }

    show(area: Area) {
        if (!this.element) return

        if (this.titleEl) this.titleEl.textContent = area.label
        if (this.subtitleEl) this.subtitleEl.textContent = area.description
        if (this.dotEl) {
            this.dotEl.style.background = area.color
            this.dotEl.style.boxShadow = `0 0 8px ${area.color}`
        }

        // Update actions
        if (this.actionsEl) {
            this.actionsEl.innerHTML = ''
            if (area.link) {
                const btn = document.createElement('a')
                btn.className = 'section-action-btn'
                btn.href = area.link
                btn.target = '_blank'
                btn.rel = 'noopener'
                btn.innerHTML = `<img src="/ui/actions/actions-icon-open.webp" onerror="this.src='/ui/actions/actions-icon-open.png'" alt="open"> Open`
                this.actionsEl.appendChild(btn)
            }
        }

        if (!this.isVisible) {
            this.isVisible = true
            gsap.fromTo(this.element,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
            )
        }
    }

    hide() {
        if (!this.element || !this.isVisible) return
        this.isVisible = false

        gsap.to(this.element, {
            opacity: 0,
            y: 20,
            duration: 0.3,
            ease: 'power2.in'
        })
    }
}
