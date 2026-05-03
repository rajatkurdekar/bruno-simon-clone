import { Events } from './Events'
import { Game } from './Game'

interface WhisperItem {
    id: string
    zone: string
    title: string
    text: string
    unlocked: boolean
}

export class Whispers {
    events: Events = new Events()

    items: WhisperItem[] = [
        { id: 'home', zone: 'home', title: 'Home', text: "Welcome home! I'm Bruno Simon — a creative developer from Paris. Park here to rest a while.", unlocked: false },
        { id: 'about', zone: 'about', title: 'About Me', text: "I build interactive WebGL experiences for the web. This portfolio is my playground — quite literally!", unlocked: false },
        { id: 'works', zone: 'works', title: 'Works', text: "Drive near the TV screens to see my projects. Some are pretty big, some are tiny experiments.", unlocked: false },
        { id: 'contact', zone: 'contact', title: 'Contact', text: "Want to work together? Head to the mailbox and drop me a line. I love good collaborations.", unlocked: false },
        { id: 'circuit', zone: 'circuit', title: 'Circuit', text: "Think you're fast enough? Drive through the circuit and beat the clock. Best times are saved!", unlocked: false },
        { id: 'jukebox', zone: 'jukebox', title: 'Jukebox', text: "Hit play on any track to fill the world with music. Three albums, all vibes welcome.", unlocked: false },
    ]

    currentItem: WhisperItem | null = null
    isVisible: boolean = false

    private element: HTMLElement | null = null
    private titleEl: HTMLElement | null = null
    private textEl: HTMLElement | null = null

    constructor() {
        this.setupUI()
        this.renderMenuList()
    }

    private setupUI() {
        this.element = document.querySelector('.js-whisper')
        this.titleEl = document.querySelector('.js-whisper-title')
        this.textEl = document.querySelector('.js-whisper-text')
    }

    onAreaEnter(areaName: string) {
        const item = this.items.find(w => w.zone === areaName || areaName.toLowerCase().includes(w.zone))
        if (item) this.show(item)
    }

    onAreaLeave(areaName: string) {
        const item = this.items.find(w => w.zone === areaName || areaName.toLowerCase().includes(w.zone))
        if (item && this.currentItem?.id === item.id) this.hide()
    }

    show(item: WhisperItem) {
        if (this.isVisible && this.currentItem?.id === item.id) return
        const game = Game.getInstance()

        this.currentItem = item
        this.isVisible = true

        if (!item.unlocked) {
            item.unlocked = true
            this.renderMenuList()
            game.achievements?.unlock('whisper_' + item.id)
        }

        const magicGroup = game.audio?.groups?.get('magic')
        if (magicGroup?.items?.[0] && game.audio?.enabled) {
            magicGroup.items[0].volume(0.04 * (game.audio.masterVolume ?? 0.7))
            if (!magicGroup.items[0].playing()) magicGroup.items[0].play()
        }

        if (this.titleEl) this.titleEl.textContent = item.title
        if (this.textEl) this.textEl.textContent = item.text
        this.element?.classList.add('is-visible')
        this.events.trigger('show', [item])
    }

    hide() {
        if (!this.isVisible) return
        const game = Game.getInstance()

        this.isVisible = false
        this.currentItem = null
        this.element?.classList.remove('is-visible')

        game.audio?.groups?.get('magic')?.items?.[0]?.pause?.()
        this.events.trigger('hide')
    }

    renderMenuList() {
        const list = document.querySelector('.js-whispers-list')
        if (!list) return

        list.innerHTML = this.items.map(w => `
            <div class="whisper-list-item ${w.unlocked ? 'is-unlocked' : 'is-locked'}">
                <div class="whisper-list-icon">
                    <img src="/ui/whispers/whisper-fill.svg" alt="">
                </div>
                <div class="whisper-list-body">
                    <div class="whisper-list-title">${w.unlocked ? w.title : '???'}</div>
                    <div class="whisper-list-text">${w.unlocked ? w.text : 'Drive around to discover this whisper'}</div>
                </div>
            </div>
        `).join('')
    }

    getUnlockedCount(): number {
        return this.items.filter(w => w.unlocked).length
    }
}
