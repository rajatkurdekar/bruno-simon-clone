import { Events } from './Events'

export class Ticker {
    elapsed: number = 0
    delta: number = 1 / 60
    maxDelta: number = 1 / 30
    scale: number = 2
    deltaScaled: number = 0
    elapsedScaled: number = 0
    deltaAverage: number = 1 / 60
    lastDeltas: number[] = []
    waits: [number, () => void][] = []
    events: Events = new Events()

    constructor() {
        this.deltaScaled = this.delta * this.scale
    }

    update(elapsed: number) {
        const elapsedSeconds = elapsed / 1000
        this.delta = Math.min(elapsedSeconds - this.elapsed, this.maxDelta)
        this.elapsed = elapsedSeconds
        this.deltaScaled = this.delta * this.scale
        this.elapsedScaled += this.deltaScaled

        this.lastDeltas.unshift(this.delta)
        if (this.lastDeltas.length > 30) this.lastDeltas.splice(30)
        this.deltaAverage = this.lastDeltas.reduce((a, b) => a + b) / this.lastDeltas.length

        for (let i = 0; i < this.waits.length; i++) {
            const wait = this.waits[i]
            wait[0]--
            if (wait[0] === 0) {
                wait[1]()
                this.waits.splice(i, 1)
                i--
            }
        }

        this.events.trigger('tick')
    }

    wait(frames: number, callback: () => void) {
        this.waits.push([frames, callback])
    }
}
