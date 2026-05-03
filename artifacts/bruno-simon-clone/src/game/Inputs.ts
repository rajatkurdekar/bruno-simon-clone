import { Events } from './Events'

interface Action {
    name: string
    categories: string[]
    keys: string[]
    active: boolean
    value: number
}

export class Inputs {
    static MODE_KEYBOARD = 'keyboard'
    static MODE_GAMEPAD = 'gamepad'
    static MODE_TOUCH = 'touch'

    events: Events = new Events()
    actions: Map<string, Action> = new Map()
    filters: Set<string> = new Set()
    mode: string = Inputs.MODE_KEYBOARD
    gamepad: { joysticks: { left: { active: boolean, safeX: number, safeY: number } }, type: string, events: Events }
    nipple: { active: boolean, progress: number, forward: boolean, smallestAngle: number, forwardAmplitude: number, events: Events, jump: () => void }
    interactiveButtons: { events: Events, addItems: (names: string[]) => void, removeItems: (names: string[]) => void, clearItems: () => void }

    private pressedKeys: Set<string> = new Set()
    private domElement: HTMLElement

    constructor(initialCategories: string[] = [], defaultFilters: string[] = ['wandering']) {
        this.domElement = document.body

        this.gamepad = {
            joysticks: { left: { active: false, safeX: 0, safeY: 0 } },
            type: 'default',
            events: new Events()
        }

        this.nipple = {
            active: false,
            progress: 0,
            forward: true,
            smallestAngle: 0,
            forwardAmplitude: Math.PI * 0.5,
            events: new Events(),
            jump: () => {}
        }

        this.interactiveButtons = {
            events: new Events(),
            addItems: (names: string[]) => {
                for (const name of names) {
                    this.interactiveButtons.events.trigger(name)
                }
            },
            removeItems: (names: string[]) => {},
            clearItems: () => {}
        }

        for (const f of defaultFilters) this.filters.add(f)

        this.setupKeyboard()
        this.setupTouch()
    }

    addActions(actions: { name: string, categories: string[], keys: string[] }[]) {
        for (const def of actions) {
            if (!this.actions.has(def.name)) {
                this.actions.set(def.name, {
                    name: def.name,
                    categories: def.categories,
                    keys: def.keys,
                    active: false,
                    value: 0
                })
            } else {
                const existing = this.actions.get(def.name)!
                existing.categories = [...new Set([...existing.categories, ...def.categories])]
                existing.keys = [...new Set([...existing.keys, ...def.keys])]
            }
        }
    }

    private isActionActive(action: Action): boolean {
        for (const cat of action.categories) {
            if (this.filters.has(cat)) return true
        }
        return false
    }

    private getKeyAction(key: string): Action | null {
        for (const action of this.actions.values()) {
            for (const k of action.keys) {
                if (k === `Keyboard.${key}` || k === `Keyboard.${key.replace('Key', '')}`) {
                    return action
                }
            }
        }
        return null
    }

    private setActionActive(action: Action, active: boolean, value: number = 1) {
        if (!this.isActionActive(action)) return

        const wasActive = action.active
        action.active = active
        action.value = active ? value : 0

        this.events.trigger(action.name, [action])
        if (active && !wasActive) this.events.trigger('actionStart', [action])
        else if (!active && wasActive) this.events.trigger('actionEnd', [action])
    }

    private setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (this.pressedKeys.has(e.code)) return
            this.pressedKeys.add(e.code)

            const action = this.getKeyAction(e.code)
            if (action) {
                this.setActionActive(action, true)
                e.preventDefault()
            }

            // Wheel action for keyboard zoom
            if (e.code === 'Wheel') {
                // handled elsewhere
            }
        })

        window.addEventListener('keyup', (e) => {
            this.pressedKeys.delete(e.code)
            const action = this.getKeyAction(e.code)
            if (action) {
                // Check if any other keys for this action are still pressed
                const stillActive = action.keys.some(k => {
                    const code = k.replace('Keyboard.', '')
                    return this.pressedKeys.has(code) || this.pressedKeys.has(`Key${code}`)
                })
                if (!stillActive) {
                    this.setActionActive(action, false)
                }
            }
        })

        window.addEventListener('wheel', (e) => {
            const action = this.actions.get('zoom')
            if (action && this.isActionActive(action)) {
                action.value = Math.sign(e.deltaY)
                this.events.trigger('zoom', [action])
            }
        }, { passive: true })
    }

    private setupTouch() {
        let startX = 0, startY = 0, lastX = 0, lastY = 0
        let touchId: number | null = null

        this.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0]
                touchId = touch.identifier
                startX = touch.clientX
                startY = touch.clientY
                lastX = startX
                lastY = startY
                this.mode = Inputs.MODE_TOUCH
                this.nipple.active = true
            }
        }, { passive: true })

        this.domElement.addEventListener('touchmove', (e) => {
            if (touchId === null) return
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i]
                if (touch.identifier === touchId) {
                    const dx = touch.clientX - startX
                    const dy = touch.clientY - startY
                    const dist = Math.hypot(dx, dy)
                    const maxDist = 80
                    this.nipple.progress = Math.min(dist / maxDist, 1)
                    this.nipple.smallestAngle = Math.atan2(dx, -dy)
                    this.nipple.forward = dy < 0
                    lastX = touch.clientX
                    lastY = touch.clientY
                }
            }
        }, { passive: true })

        this.domElement.addEventListener('touchend', (e) => {
            let found = false
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === touchId) { found = true; break }
            }
            if (!found) {
                touchId = null
                this.nipple.active = false
                this.nipple.progress = 0
            }
        }, { passive: true })
    }
}
