type Callback = (...args: any[]) => void

export class Events {
    callbacks: { [name: string]: { [order: number]: Callback[] } } = {}

    on(name: string, callback: Callback, order: number = 1): this {
        if (!Array.isArray(this.callbacks[name]))
            this.callbacks[name] = []
        if (!Array.isArray(this.callbacks[name][order]))
            this.callbacks[name][order] = []
        this.callbacks[name][order].push(callback)
        return this
    }

    off(name: string, callback: Callback | null = null): this {
        if (typeof callback === 'function') {
            for (const order in this.callbacks[name]) {
                const callbacks = this.callbacks[name][order as any]
                const index = callbacks.indexOf(callback)
                if (index !== -1) callbacks.splice(index, 1)
            }
        } else {
            if (Array.isArray(this.callbacks[name]))
                delete this.callbacks[name]
        }
        return this
    }

    trigger(name: string, args: any[] = []): this {
        if (Array.isArray(this.callbacks[name])) {
            for (const order in this.callbacks[name]) {
                for (const cb of this.callbacks[name][order as any]) {
                    cb.apply(this, args)
                }
            }
        }
        return this
    }
}
