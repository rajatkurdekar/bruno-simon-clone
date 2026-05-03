import * as THREE from 'three/webgpu'
import gsap from 'gsap'
import { Events } from './Events'
import { Game } from './Game'

export class NightMode {
    events: Events = new Events()
    isNight: boolean = false

    private readonly dayColors = {
        bg: '#1d1721',
        fog: 0x1b1923,
        ambient: 0x2a1630,
        shadow: '#2a1630',
        bounce: '#82487f',
        directional: 0xffffff,
        directionalIntensity: 5
    }

    private readonly nightColors = {
        bg: '#060914',
        fog: 0x060914,
        ambient: 0x0a0d24,
        shadow: '#050820',
        bounce: '#080f36',
        directional: 0x223366,
        directionalIntensity: 1.5
    }

    constructor() {
        try {
            const saved = localStorage.getItem('night-mode')
            if (saved === 'true') {
                this.isNight = true
                this.apply(false)
            }
        } catch(e) {}
    }

    toggle() {
        this.isNight = !this.isNight
        try { localStorage.setItem('night-mode', String(this.isNight)) } catch(e) {}
        this.apply(true)
        this.events.trigger('change', [this.isNight])

        const label = document.querySelector('.js-night-mode-label')
        if (label) label.textContent = this.isNight ? 'Night' : 'Day'
        document.documentElement.classList.toggle('is-night', this.isNight)
    }

    apply(animated: boolean = true) {
        const game = Game.getInstance()
        const cols = this.isNight ? this.nightColors : this.dayColors
        const dur = animated ? 1.5 : 0

        document.documentElement.classList.toggle('is-night', this.isNight)

        if (game.scene?.fog && (game.scene.fog as any).color) {
            const fc = new THREE.Color(cols.fog)
            if (animated) {
                gsap.to((game.scene.fog as any).color, { r: fc.r, g: fc.g, b: fc.b, duration: dur })
            } else {
                (game.scene.fog as any).color.set(cols.fog)
            }
        }

        if (game.lighting?.ambientLight) {
            const ac = new THREE.Color(cols.ambient)
            if (animated) {
                gsap.to(game.lighting.ambientLight.color, { r: ac.r, g: ac.g, b: ac.b, duration: dur })
            } else {
                game.lighting.ambientLight.color.set(cols.ambient)
            }
        }

        if (game.lighting?.light) {
            const dc = new THREE.Color(cols.directional)
            if (animated) {
                gsap.to(game.lighting.light.color, { r: dc.r, g: dc.g, b: dc.b, duration: dur })
                gsap.to(game.lighting.light, { intensity: cols.directionalIntensity, duration: dur })
            } else {
                game.lighting.light.color.set(cols.directional)
                game.lighting.light.intensity = cols.directionalIntensity
            }
        }

        if (game.materials?.shadowColorUniform) {
            const sc = new THREE.Color(cols.shadow)
            if (animated) {
                gsap.to(game.materials.shadowColorUniform.value, { r: sc.r, g: sc.g, b: sc.b, duration: dur })
            } else {
                game.materials.shadowColorUniform.value.set(cols.shadow)
            }
        }

        if (game.materials?.bounceColorUniform) {
            const bc = new THREE.Color(cols.bounce)
            if (animated) {
                gsap.to(game.materials.bounceColorUniform.value, { r: bc.r, g: bc.g, b: bc.b, duration: dur })
            } else {
                game.materials.bounceColorUniform.value.set(cols.bounce)
            }
        }

        const label = document.querySelector('.js-night-mode-label')
        if (label) label.textContent = this.isNight ? 'Night' : 'Day'
    }
}
