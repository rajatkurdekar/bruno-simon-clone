import gsap from 'gsap'
import { Game } from './Game'

interface NotificationOptions {
    icon?: string
    title: string
    text?: string
    duration?: number
}

export class Notifications {
    container: HTMLElement | null = null

    constructor() {
        this.container = document.querySelector('.js-notifications')
    }

    show(options: NotificationOptions) {
        if (!this.container) return

        const el = document.createElement('div')
        el.className = 'notification'

        el.innerHTML = `
            ${options.icon ? `<div class="notification-icon"><img src="${options.icon}" alt=""></div>` : ''}
            <div class="notification-content">
                <div class="notification-title">${options.title}</div>
                ${options.text ? `<div class="notification-text">${options.text}</div>` : ''}
            </div>
        `

        this.container.appendChild(el)

        // Animate in
        gsap.fromTo(el,
            { opacity: 0, y: 20, scale: 0.92 },
            { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.5)' }
        )

        // Auto-remove
        const duration = options.duration ?? 3500
        setTimeout(() => {
            gsap.to(el, {
                opacity: 0,
                y: -10,
                scale: 0.92,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => el.remove()
            })
        }, duration)
    }

    showAchievement(name: string, description: string, reward?: string) {
        const game = Game.getInstance()

        const rewardSrc = reward ? `/ui/achievements/rewards/${reward}.webp` : '/ui/achievements/rewards/white.webp'

        this.show({
            icon: rewardSrc,
            title: `Achievement: ${name}`,
            text: description,
            duration: 4500
        })

        // Play achievement sound
        game.audio?.groups?.get('achievements')?.playRandom?.()
    }
}
