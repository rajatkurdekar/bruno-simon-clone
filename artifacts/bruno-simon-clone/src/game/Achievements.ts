import { Game } from './Game'
import { Events } from './Events'

export interface Achievement {
    name: string
    label: string
    description: string
    reward: string
    unlocked: boolean
    secret?: boolean
}

export class Achievements {
    events: Events = new Events()
    items: Map<string, Achievement> = new Map()
    listEl: HTMLElement | null = null

    constructor() {
        this.listEl = document.querySelector('.js-achievements-list')
        this.setupItems()
        this.hookEvents()
        this.render()
    }

    private setupItems() {
        const defs: Omit<Achievement, 'unlocked'>[] = [
            { name: 'firstDrive',      label: 'On The Road',          description: 'Drive for the first time',                  reward: 'white'   },
            { name: 'firstFlip',       label: 'Upside Down',          description: 'Flip the car for the first time',           reward: 'orange'  },
            { name: 'firstHonk',       label: 'Beep Beep!',           description: 'Honk the horn',                             reward: 'white'   },
            { name: 'firstJump',       label: 'Jump!',                description: 'Send the car airborne',                     reward: 'orange'  },
            { name: 'stuck',           label: 'Stuck',                description: 'Get the car stuck',                         reward: 'black'   },
            { name: 'respawn',         label: 'Back Again',           description: 'Use the respawn',                           reward: 'white'   },
            { name: 'visitHome',       label: 'Home Sweet Home',      description: 'Visit the home area',                       reward: 'white'   },
            { name: 'visitAbout',      label: 'Getting To Know Me',   description: 'Visit the about area',                      reward: 'white'   },
            { name: 'visitWorks',      label: 'Portfolio Explorer',   description: 'Check out my works',                        reward: 'white'   },
            { name: 'visitContact',    label: 'Stay In Touch',        description: 'Visit the contact area',                    reward: 'white'   },
            { name: 'visitCircuit',    label: 'Racer',                description: 'Find the circuit area',                     reward: 'orange'  },
            { name: 'visitJukebox',    label: 'DJ',                   description: 'Discover the jukebox',                      reward: 'orange'  },
            { name: 'fullSpeed',       label: 'Pedal To The Metal',   description: 'Reach maximum speed',                       reward: 'red'     },
            { name: 'allAreas',        label: 'Explorer',             description: 'Discover all main areas',                   reward: 'flames'  },
            { name: 'openMenu',        label: 'Curious',              description: 'Open the menu',                             reward: 'white'   },
            { name: 'upsideDown',      label: 'Gravity Defier',       description: 'Stay upside down for 2 seconds',            reward: 'red'     },
            { name: 'secret',          label: '???',                  description: 'A mysterious achievement',                  reward: 'abyssal', secret: true },
        ]

        for (const def of defs) {
            this.items.set(def.name, { ...def, unlocked: false })
        }
    }

    private hookEvents() {
        const game = Game.getInstance()

        // Menu open
        game.menu?.events.on('open', () => {
            this.unlock('openMenu')
        })

        // Vehicle events
        game.physicalVehicle?.events.on('start', () => {
            this.unlock('firstDrive')
        })

        game.physicalVehicle?.events.on('flip', () => {
            this.unlock('firstFlip')
        })

        game.physicalVehicle?.events.on('stuck', () => {
            this.unlock('stuck')
        })

        game.physicalVehicle?.events.on('upsideDown', () => {
            let timer: any = null
            timer = setTimeout(() => {
                if (game.physicalVehicle?.upsideDown.active) {
                    this.unlock('upsideDown')
                }
            }, 2000)
        })

        // Honk
        game.inputs?.events.on('honk', (action: any) => {
            if (action.active) this.unlock('firstHonk')
        })

        // Jump
        game.inputs?.events.on('jump', (action: any) => {
            if (action.active) this.unlock('firstJump')
        })

        // Respawn
        game.inputs?.events.on('respawn', (action: any) => {
            if (action.active) this.unlock('respawn')
        })

        // Speed
        let speedAchievedOnce = false
        game.ticker?.events.on('tick', () => {
            if (!speedAchievedOnce && game.physicalVehicle && game.physicalVehicle.xzSpeed > 12) {
                speedAchievedOnce = true
                this.unlock('fullSpeed')
            }
        }, 20)
    }

    unlock(name: string) {
        const achievement = this.items.get(name)
        if (!achievement || achievement.unlocked) return

        achievement.unlocked = true
        this.render()

        const game = Game.getInstance()
        game.notifications?.showAchievement(achievement.label, achievement.description, achievement.reward)

        this.events.trigger('unlock', [achievement])

        // Check if all main areas visited
        const areaAchievements = ['visitHome', 'visitAbout', 'visitWorks', 'visitContact']
        if (areaAchievements.every(a => this.items.get(a)?.unlocked)) {
            this.unlock('allAreas')
        }
    }

    render() {
        if (!this.listEl) return

        this.listEl.innerHTML = ''
        for (const [, ach] of this.items) {
            if (ach.secret && !ach.unlocked) continue

            const el = document.createElement('div')
            el.className = `achievement-item${ach.unlocked ? ' is-unlocked' : ''}`
            el.innerHTML = `
                <div class="achievement-reward">
                    <img src="/ui/achievements/rewards/${ach.unlocked ? ach.reward : 'black'}.webp" 
                         onerror="this.src='/ui/achievements/rewards/white.webp'"
                         alt="${ach.label}">
                    ${ach.unlocked ? '<img class="achievement-check" src="/ui/achievements/check.svg" alt="✓">' : ''}
                </div>
                <div class="achievement-info">
                    <div class="achievement-label">${ach.secret && !ach.unlocked ? '???' : ach.label}</div>
                    <div class="achievement-desc">${ach.secret && !ach.unlocked ? 'A secret achievement' : ach.description}</div>
                </div>
            `
            this.listEl.appendChild(el)
        }
    }
}
