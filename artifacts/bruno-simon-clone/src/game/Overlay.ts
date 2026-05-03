import gsap from 'gsap'
import { Game } from './Game'

export class Overlay {
    element: HTMLElement | null = null
    tween: gsap.core.Tween | null = null

    constructor() {
        this.element = document.querySelector('.js-overlay-fade')
        if (this.element) {
            this.element.style.opacity = '1'
        }
    }

    fadeIn(duration: number = 0.5, delay: number = 0): Promise<void> {
        return new Promise((resolve) => {
            if (!this.element) { resolve(); return }
            if (this.tween) this.tween.kill()
            this.tween = gsap.to(this.element, {
                opacity: 1,
                duration,
                delay,
                ease: 'power2.inOut',
                onComplete: resolve
            })
        })
    }

    fadeOut(duration: number = 0.5, delay: number = 0): Promise<void> {
        return new Promise((resolve) => {
            if (!this.element) { resolve(); return }
            if (this.tween) this.tween.kill()
            this.tween = gsap.to(this.element, {
                opacity: 0,
                duration,
                delay,
                ease: 'power2.inOut',
                onComplete: resolve
            })
        })
    }

    show() {
        if (this.element) {
            this.element.style.opacity = '1'
            this.element.style.display = 'block'
        }
    }

    hide() {
        if (this.element) {
            this.element.style.opacity = '0'
        }
    }
}
