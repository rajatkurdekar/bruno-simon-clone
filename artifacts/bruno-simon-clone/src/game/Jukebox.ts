import { Howl } from 'howler'
import { Events } from './Events'
import { Game } from './Game'

interface Track {
    name: string
    label: string
    path: string
}

const TRACKS: Track[] = [
    { name: 'baguira', label: 'Baguira', path: '/sounds/musics/Baguira.mp3' },
    { name: 'boy', label: 'Boy', path: '/sounds/musics/Boy.mp3' },
    { name: 'sudo', label: 'Sudo', path: '/sounds/musics/Sudo.mp3' },
]

export class Jukebox {
    events: Events = new Events()

    currentTrackIndex: number = -1
    isPlaying: boolean = false
    isNearZone: boolean = false

    private sounds: Howl[] = []
    private element: HTMLElement | null = null

    constructor() {
        this.setupSounds()
        this.setupUI()
        this.setupAreaEvents()
    }

    private setupSounds() {
        const game = Game.getInstance()
        for (const track of TRACKS) {
            try {
                const sound = new Howl({
                    src: [track.path],
                    loop: true,
                    volume: 0,
                    html5: true
                })
                this.sounds.push(sound)
            } catch(e) {
                this.sounds.push(null as any)
            }
        }
    }

    private setupUI() {
        this.element = document.querySelector('.js-jukebox')

        document.querySelectorAll<HTMLElement>('.js-jukebox-track').forEach((btn, i) => {
            btn.addEventListener('click', () => this.selectTrack(i))
        })

        document.querySelector('.js-jukebox-close')?.addEventListener('click', () => {
            this.close()
        })
    }

    private setupAreaEvents() {
        const game = Game.getInstance()

        game.areas?.events.on('enter', (area: any) => {
            if (area?.name?.toLowerCase().includes('jukebox')) {
                this.isNearZone = true
                this.show()
                game.achievements?.unlock('dj')
            }
        })

        game.areas?.events.on('leave', (area: any) => {
            if (area?.name?.toLowerCase().includes('jukebox')) {
                this.isNearZone = false
                this.close()
            }
        })
    }

    selectTrack(index: number) {
        const game = Game.getInstance()
        const prevIndex = this.currentTrackIndex
        const prevSound = this.sounds[prevIndex]

        if (prevIndex >= 0 && prevSound) {
            prevSound.fade(prevSound.volume(), 0, 600)
            setTimeout(() => prevSound.stop(), 650)
        }

        if (prevIndex === index && this.isPlaying) {
            this.currentTrackIndex = -1
            this.isPlaying = false
            this.updateUI()
            game.audio?.groups?.get('jukebox')?.playRandom?.()
            return
        }

        this.currentTrackIndex = index
        this.isPlaying = true

        const sound = this.sounds[index]
        if (sound) {
            sound.play()
            const targetVol = 0.2 * (game.audio?.masterVolume ?? 0.7)
            sound.fade(0, targetVol, 1200)
        }

        game.audio?.groups?.get('jukebox')?.playRandom?.()
        this.updateUI()
        this.events.trigger('trackChange', [TRACKS[index]])
    }

    stopAll() {
        for (const sound of this.sounds) {
            if (sound?.playing()) {
                sound.fade(sound.volume(), 0, 800)
                setTimeout(() => sound.stop(), 850)
            }
        }
        this.currentTrackIndex = -1
        this.isPlaying = false
        this.updateUI()
    }

    show() {
        this.element?.classList.add('is-visible')
        this.events.trigger('open')
    }

    close() {
        this.element?.classList.remove('is-visible')
        this.events.trigger('close')
    }

    private updateUI() {
        document.querySelectorAll<HTMLElement>('.js-jukebox-track').forEach((btn, i) => {
            btn.classList.toggle('is-playing', i === this.currentTrackIndex && this.isPlaying)
        })
    }

    get trackNames(): string[] {
        return TRACKS.map(t => t.label)
    }
}
