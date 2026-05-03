import { Howl } from 'howler'
import { Events } from './Events'
import { Game } from './Game'

interface SoundConfig {
    path: string
    loop?: boolean
    volume?: number
    html5?: boolean
    preload?: boolean
}

class SoundGroup {
    name: string
    items: Howl[] = []
    currentIndex: number = 0
    volume: number = 1
    audio: Audio

    constructor(name: string, audio: Audio) {
        this.name = name
        this.audio = audio
    }

    add(config: SoundConfig): Howl {
        const h = new Howl({
            src: [config.path],
            loop: config.loop ?? false,
            volume: (config.volume ?? 1) * this.audio.masterVolume,
            autoplay: false,
            preload: config.preload !== false,
            html5: config.html5 ?? false,
        })
        this.items.push(h)
        return h
    }

    playRandom(): Howl | null {
        if (!this.audio.enabled || !this.items.length) return null
        const h = this.items[Math.floor(Math.random() * this.items.length)]
        h.volume(this.volume * this.audio.masterVolume)
        h.play()
        return h
    }

    playRandomNext(force?: number): Howl | null {
        if (!this.audio.enabled || !this.items.length) return null
        const h = this.items[this.currentIndex % this.items.length]
        this.currentIndex = (this.currentIndex + 1) % this.items.length
        const vol = force !== undefined ? Math.min(Math.max(force / 60, 0.1), 1) * 0.75 : 0.6
        h.volume(vol * this.volume * this.audio.masterVolume)
        h.play()
        return h
    }

    setVolume(v: number) {
        this.volume = v
        for (const h of this.items) h.volume(v * this.audio.masterVolume)
    }

    stop() { for (const h of this.items) h.stop() }
    pause() { for (const h of this.items) { if (h.playing()) h.pause() } }
    resume() { if (!this.audio.enabled) return; for (const h of this.items) { if (!h.playing()) h.play() } }
}

export class Audio {
    enabled: boolean = true
    masterVolume: number = 0.7
    events: Events = new Events()
    groups: globalThis.Map<string, SoundGroup> = new globalThis.Map()

    private engineSound: Howl | null = null
    private rollingSound: Howl | null = null
    private windSound: Howl | null = null
    private engineRate: number = 0.7
    private rollingVolume: number = 0
    private revealPlayed: boolean = false

    constructor() {}

    async init() {
        const game = Game.getInstance()

        const sa = (name: string, configs: SoundConfig[]) => {
            const g = this.createGroup(name)
            for (const c of configs) { try { g.add(c) } catch(e) {} }
            return g
        }

        // ── Vehicle ─────────────────────────────────────────────────
        try {
            const eg = this.createGroup('engine')
            this.engineSound = eg.add({ path: '/sounds/vehicle/engine/muscle car engine loop idle.mp3', loop: true, volume: 0.25 })
            if (this.enabled) this.engineSound.play()
        } catch(e) {}

        sa('honk', [{ path: '/sounds/vehicle/honk/Car Horn Long 4.mp3', volume: 0.7 }])

        try {
            const rg = this.createGroup('rolling')
            this.rollingSound = rg.add({ path: '/sounds/rolling/06290 medium ball rolling lp.mp3', loop: true, volume: 0 })
        } catch(e) {}

        sa('floor', [
            { path: '/sounds/vehicle/floor/wheels-on-pebbles-road.mp3', loop: true, volume: 0 },
            { path: '/sounds/vehicle/floor/Source Stone Loop Small Rubbing Pebbles On Concrete 02.mp3', loop: true, volume: 0 }
        ])
        sa('springs', [
            { path: '/sounds/vehicle/springs/HandleSqueak_BW.60329.mp3', volume: 0.3 },
            { path: '/sounds/vehicle/springs/SpringMetalMovements_1u54Y_01.mp3', volume: 0.3 }
        ])
        sa('suspensions', [{ path: '/sounds/vehicle/suspensions/Robotic_Lifeforms_2_-_Air_Source_-_Piston_Studio_Chair_07.mp3', loop: true, volume: 0 }])
        sa('energy', [{ path: '/sounds/vehicle/energy/Energy_-_force_field_8_loop.mp3', loop: true, volume: 0 }])
        sa('paint', [{ path: '/sounds/vehicle/paint/Spray Paint 14.mp3', volume: 0.25 }])
        sa('spin', [{ path: '/sounds/vehicle/spin/41051 Glass stone turning loop 09-full.mp3', loop: true, volume: 0 }])

        // ── Hit sounds ─────────────────────────────────────────────
        sa('jump', [{ path: '/sounds/vehicle/springs/SpringMetalMovements_1u54Y_01.mp3', volume: 0.35 }])

        sa('hitDefault', [
            '/sounds/hits/defaults/Impact Soft 01.mp3',
            '/sounds/hits/defaults/Impact Soft 02.mp3',
            '/sounds/hits/defaults/Impact Soft 03.mp3',
            '/sounds/hits/defaults/Short Stone Hit 01.mp3',
            '/sounds/hits/defaults/Short Stone Hit 02.mp3',
            '/sounds/hits/defaults/Short Stone Hit 03.mp3',
            '/sounds/hits/defaults/Stone_Hit_Crash_071.mp3',
        ].map(p => ({ path: p, volume: 0.5 })))

        sa('hitBricks', [
            '/sounds/hits/bricks/24445 brick light hitting-full-2.mp3',
            '/sounds/hits/bricks/41559 Stone brick fall hit 01-full-1.mp3',
            '/sounds/hits/bricks/BrickSetDown_BW.5803-1.mp3',
        ].map(p => ({ path: p, volume: 0.6 })))

        sa('hitMetal', [
            '/sounds/hits/metal/Metal Clip Hit.mp3',
            '/sounds/hits/metal/Metalic 3.mp3',
        ].map(p => ({ path: p, volume: 0.5 })))

        sa('hitPins', [{ path: '/sounds/hits/pins/ComedyCrash 6115_16_4.mp3', volume: 0.55 }])

        // ── Ambient ────────────────────────────────────────────────
        sa('birds', [
            '/sounds/birdTweets/20711 finch bird isolated tweet-full.mp3',
            '/sounds/birdTweets/24074 small bird tweet calling-full-1.mp3',
            '/sounds/birdTweets/30673 Yellowhammer bird tweet 3-full.mp3',
            '/sounds/birdTweets/31062 Ortolan bird tweet-full.mp3',
        ].map(p => ({ path: p, volume: 0.22 })))

        sa('crickets', [{ path: '/sounds/crickets/Crickets.mp3', loop: true, volume: 0.07 }])

        try {
            const wg = this.createGroup('wind')
            this.windSound = wg.add({ path: '/sounds/wind/13582-wind-in-forest-loop.mp3', loop: true, volume: 0.04 })
            if (this.enabled) this.windSound.play()
        } catch(e) {}

        sa('rain', [{ path: '/sounds/rain/soundjay_rain-on-leaves_main-01.mp3', loop: true, volume: 0.12 }])
        sa('waves', [{ path: '/sounds/waves/lake-waves.mp3', loop: true, volume: 0.14 }])
        sa('thunder_near', [
            '/sounds/thunder/near/THUNDER_GEN-HDF-23300.mp3',
            '/sounds/thunder/near/Lightning-Streak-with-Thunder-Crash_TTX028903.mp3',
        ].map(p => ({ path: p, volume: 0.55 })))
        sa('thunder_far', [
            '/sounds/thunder/distant/Thunder32GentleCr SIG014001.mp3',
            '/sounds/thunder/distant/Thunder44LowRippl SIG015201.mp3',
        ].map(p => ({ path: p, volume: 0.35 })))
        sa('fire', [
            '/sounds/fire/Fire Burning.mp3',
            '/sounds/fire/Mountain Audio - Fire Burning in a Wood Stove 1.mp3',
        ].map(p => ({ path: p, loop: true, volume: 0 })))
        sa('owl', [{ path: '/sounds/owl/OwlHootingReverberantSeveral_Rik8a_03.mp3', volume: 0.2 }])
        sa('wolf', [{ path: '/sounds/wolf/TimberWolvesGroupHowlingSomeWhimpering_S2h0E_04.mp3', volume: 0.25 }])
        sa('rooster', [{ path: '/sounds/rooster/rooster-crowing.mp3', volume: 0.3 }])

        // ── Objects / world sounds ─────────────────────────────────
        sa('bell', [
            '/sounds/bell/Death Hit.mp3',
            '/sounds/bell/Epic Bell Impact Hit.mp3',
        ].map(p => ({ path: p, volume: 0.5 })))
        sa('anvil', [{ path: '/sounds/anvil/METLImpt_Anvil Single Hammer Strike Hammers_GENHD1-01372.mp3', volume: 0.45 }])
        sa('jingleBells', [{ path: '/sounds/jingleBells/Mountain Audio - Christmas Bells.mp3', volume: 0.3 }])
        sa('paper', [
            '/sounds/paper/PaperMovement_fNAyV_01-2.mp3',
            '/sounds/paper/PaperMovement_fNAyV_01-3.mp3',
        ].map(p => ({ path: p, volume: 0.3 })))
        sa('swoosh', [
            '/sounds/swoosh/Swoosh 02.mp3',
            '/sounds/swoosh/Swoosh 05.mp3',
        ].map(p => ({ path: p, volume: 0.35 })))
        sa('ding', [{ path: '/sounds/ding/Cash Register 03.mp3', volume: 0.5 }])
        sa('mecanism', [
            '/sounds/mecanism/click.mp3',
            '/sounds/mecanism/assemble.mp3',
            '/sounds/mecanism/slide.mp3',
        ].map(p => ({ path: p, volume: 0.35 })))
        sa('stoneSlides', [
            '/sounds/stoneSlides/stoneSlideIn.mp3',
            '/sounds/stoneSlides/stoneSlideOut.mp3',
        ].map(p => ({ path: p, volume: 0.4 })))
        sa('tv', [{ path: '/sounds/tv/alert.mp3', volume: 0.4 }])
        sa('jukebox', [{ path: '/sounds/jukebox/DVDPlayerChangeDisc_BW.49824.mp3', volume: 0.4 }])

        // ── Game events ────────────────────────────────────────────
        sa('achievements', [{ path: '/sounds/achievements/Money Reward 2.mp3', volume: 0.6 }])
        sa('reveal', [{ path: '/sounds/reveal/reveal-1.mp3', volume: 0.5 }])
        sa('clicks', [{ path: '/sounds/clicks/Source Metal Clicks Delicate Light Sharp Clip Mid 07.mp3', volume: 0.4 }])
        sa('explosions', [
            '/sounds/explosions/SmallImpactMediumE PE281202.mp3',
            '/sounds/explosions/SmallImpactMediumE PE281203.mp3',
        ].map(p => ({ path: p, volume: 0.5 })))

        // ── Circuit ────────────────────────────────────────────────
        sa('circuitCountdown', [
            '/sounds/circuit/countdown/Game Start Countdown 31-1.mp3',
            '/sounds/circuit/countdown/Game Start Countdown 31-2.mp3',
        ].map(p => ({ path: p, volume: 0.65 })))
        sa('circuitFinish', [{ path: '/sounds/circuit/finish/Big Win Fanfare 2.mp3', volume: 0.7 }])
        sa('circuitCheckpoint', [{ path: '/sounds/circuit/checkpoint/Win Score 1.mp3', volume: 0.6 }])
        sa('circuitApplause', [{ path: '/sounds/circuit/applause/huge win.mp3', volume: 0.5 }])

        // ── Music ──────────────────────────────────────────────────
        sa('music', [
            { path: '/sounds/musics/Baguira.mp3', loop: true, volume: 0.11, html5: true },
            { path: '/sounds/musics/Boy.mp3', loop: true, volume: 0.11, html5: true },
            { path: '/sounds/musics/Sudo.mp3', loop: true, volume: 0.11, html5: true },
        ])

        // ── Magic/whispers ─────────────────────────────────────────
        sa('magic', [
            { path: '/sounds/magic/Ghostly Whisper Background Loop 9.mp3', loop: true, volume: 0.04 },
            { path: '/sounds/magic/Mountain Audio - Small Chimes - Loop.mp3', loop: true, volume: 0.05 },
        ])

        // ── Start hooks ────────────────────────────────────────────
        this.hookVehicleEvents()
        this.startAmbientBirds()
        this.startCrickets()

        game.ticker.events.on('tick', () => { this.update() }, 10)
    }

    private hookVehicleEvents() {
        const game = Game.getInstance()
        if (!game.physicalVehicle) return

        game.physicalVehicle.events.on('flip', () => {
            this.groups.get('hitDefault')?.playRandom()
        })
        game.physicalVehicle.events.on('stop', () => {
            if (this.rollingSound?.playing()) this.rollingSound.pause()
        })
    }

    private startAmbientBirds() {
        const birdGroup = this.groups.get('birds')
        if (!birdGroup?.items.length) return
        const schedule = () => {
            if (this.enabled) birdGroup.playRandom()
            setTimeout(schedule, 3500 + Math.random() * 8000)
        }
        setTimeout(schedule, 2000 + Math.random() * 4000)
    }

    private startCrickets() {
        const cg = this.groups.get('crickets')
        if (!cg?.items.length) return
        setTimeout(() => {
            if (this.enabled && !cg.items[0].playing()) cg.items[0].play()
        }, 2500)
    }

    playReveal() {
        if (this.revealPlayed) return
        this.revealPlayed = true
        this.groups.get('reveal')?.playRandom()
    }

    createGroup(name: string): SoundGroup {
        const g = new SoundGroup(name, this)
        this.groups.set(name, g)
        return g
    }

    playSfx(name: string) { this.groups.get(name)?.playRandom() }

    toggle() {
        this.enabled = !this.enabled
        if (this.enabled) {
            if (this.engineSound && !this.engineSound.playing()) this.engineSound.play()
            if (this.windSound && !this.windSound.playing()) this.windSound.play()
        } else {
            this.engineSound?.pause()
            this.windSound?.pause()
            this.rollingSound?.pause()
            for (const [, g] of this.groups) {
                g.items.forEach(h => { if (h.loop() && h.playing()) h.pause() })
            }
        }
        const label = document.querySelector('.js-audio-label')
        if (label) label.textContent = this.enabled ? 'On' : 'Off'
        const btn = document.querySelector('.js-audio-toggle')
        btn?.classList.toggle('is-off', !this.enabled)
    }

    update() {
        const game = Game.getInstance()
        if (!game.physicalVehicle) return

        const speed = game.physicalVehicle.xzSpeed
        const inContact = game.physicalVehicle.wheels.inContactCount > 0

        if (this.enabled && this.engineSound) {
            if (!this.engineSound.playing()) this.engineSound.play()
            const targetRate = 0.62 + Math.min(speed / 7, 1) * 0.95
            this.engineRate += (targetRate - this.engineRate) * 0.055
            this.engineSound.rate(Math.max(0.5, Math.min(2.5, this.engineRate)))
            const targetVol = 0.09 + Math.min(speed / 5, 1) * 0.36
            this.engineSound.volume(targetVol * this.masterVolume)
        }

        if (this.rollingSound) {
            const targetRollingVol = inContact && speed > 0.5
                ? Math.min(speed / 6, 1) * 0.16 : 0
            this.rollingVolume += (targetRollingVol - this.rollingVolume) * 0.07
            if (this.enabled && this.rollingVolume > 0.004) {
                if (!this.rollingSound.playing()) this.rollingSound.play()
                this.rollingSound.volume(this.rollingVolume * this.masterVolume)
                this.rollingSound.rate(0.75 + Math.min(speed / 8, 1) * 0.75)
            } else if (this.rollingSound.playing()) {
                this.rollingSound.pause()
            }
        }

        if (this.windSound && this.enabled) {
            this.windSound.volume((0.025 + Math.min(speed / 10, 1) * 0.065) * this.masterVolume)
        }
    }
}
