import * as THREE from 'three/webgpu'
import { Game } from './Game'

export interface RespawnItem {
    name: string
    position: THREE.Vector3
    rotation: number
}

export class Respawns {
    items: Map<string, RespawnItem> = new Map()
    defaultName: string

    constructor(defaultName: string = 'landing') {
        this.defaultName = defaultName
    }

    parseFromModel(model: any) {
        this.items.clear()

        if (!model?.scene) {
            this.addDefault()
            return
        }

        for (const child of model.scene.children) {
            child.rotation.reorder('YXZ')

            let name = child.name.replace(/^respawn(.+)$/i, '$1')
            name = name.charAt(0).toLowerCase() + name.slice(1)

            const item: RespawnItem = {
                name,
                position: new THREE.Vector3(child.position.x, 4, child.position.z),
                rotation: child.rotation.y
            }

            this.items.set(name, item)
        }

        if (this.items.size === 0) {
            this.addDefault()
        }
    }

    private addDefault() {
        this.items.set('landing', {
            name: 'landing',
            position: new THREE.Vector3(0, 4, 0),
            rotation: 0
        })
    }

    getByName(name: string): RespawnItem | undefined {
        return this.items.get(name)
    }

    getDefault(): RespawnItem {
        return this.items.get(this.defaultName) ?? {
            name: 'landing',
            position: new THREE.Vector3(0, 4, 0),
            rotation: 0
        }
    }

    getClosest(position: THREE.Vector3): RespawnItem {
        let closestItem: RespawnItem | null = null
        let closestDistance = Infinity

        this.items.forEach((item) => {
            const distance = Math.hypot(item.position.x - position.x, item.position.z - position.z)
            if (distance < closestDistance) {
                closestDistance = distance
                closestItem = item
            }
        })

        return closestItem ?? this.getDefault()
    }
}
