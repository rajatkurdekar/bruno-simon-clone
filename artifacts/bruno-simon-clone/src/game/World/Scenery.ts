import * as THREE from 'three/webgpu'
import { Game } from '../Game'

async function tryLoadGLTF(game: any, paths: string[]): Promise<any | null> {
    for (const path of paths) {
        try {
            return await new Promise<any>((resolve, reject) => {
                game.resources.getLoader('gltf').load(path, resolve, undefined, reject)
            })
        } catch(e) {}
    }
    return null
}

async function loadInstanced(
    game: any,
    refsPaths: string[],
    visPaths: string[],
    fallbackColor: string = '#5a8a3c'
) {
    const refsGltf = await tryLoadGLTF(game, refsPaths)
    if (!refsGltf) return

    refsGltf.scene.updateMatrixWorld(true)
    const transforms: { pos: THREE.Vector3, rot: THREE.Quaternion, scale: THREE.Vector3 }[] = []

    for (const child of refsGltf.scene.children) {
        const pos = new THREE.Vector3()
        const rot = new THREE.Quaternion()
        const scale = new THREE.Vector3(1, 1, 1)
        child.getWorldPosition(pos)
        child.getWorldQuaternion(rot)
        child.getWorldScale(scale)
        transforms.push({ pos, rot, scale })
    }

    if (transforms.length === 0) return

    const visGltf = await tryLoadGLTF(game, visPaths)
    if (!visGltf) {
        game.materials.updateObject(refsGltf.scene)
        game.scene.add(refsGltf.scene)
        return
    }

    visGltf.scene.updateMatrixWorld(true)
    const dummy = new THREE.Object3D()
    const count = transforms.length

    visGltf.scene.traverse((child: THREE.Object3D) => {
        if (!(child instanceof THREE.Mesh)) return
        const mat = child.material as any
        const hexColor = mat?.color ? '#' + mat.color.getHexString() : fallbackColor
        const material = game.materials.createDefaultMaterial({ color: hexColor })
        const instanced = new THREE.InstancedMesh(child.geometry, material, count)
        instanced.castShadow = true
        instanced.receiveShadow = true

        transforms.forEach((t, i) => {
            dummy.position.copy(t.pos)
            dummy.quaternion.copy(t.rot)
            dummy.scale.copy(t.scale)
            dummy.updateMatrix()
            instanced.setMatrixAt(i, dummy.matrix)
        })
        instanced.instanceMatrix.needsUpdate = true
        game.scene.add(instanced)
    })
}

async function loadStatic(game: any, paths: string[]): Promise<THREE.Object3D | null> {
    const gltf = await tryLoadGLTF(game, paths)
    if (!gltf) return null
    gltf.scene.updateMatrixWorld(true)
    game.materials.updateObject(gltf.scene)
    game.scene.add(gltf.scene)
    return gltf.scene
}

async function loadLanterns(game: any) {
    const gltf = await tryLoadGLTF(game, [
        '/lanterns/lanterns-compressed.glb',
        '/lanterns/lanterns.glb'
    ])
    if (!gltf) return

    gltf.scene.updateMatrixWorld(true)
    game.materials.updateObject(gltf.scene)
    game.scene.add(gltf.scene)

    // Add warm point lights near lantern meshes
    let lightCount = 0
    gltf.scene.traverse((child: THREE.Object3D) => {
        if (!(child instanceof THREE.Mesh) || lightCount > 20) return
        const name = (child.name || '').toLowerCase()
        if (name.includes('light') || name.includes('lamp') || name.includes('glow') || name.includes('glass')) {
            const pos = new THREE.Vector3()
            child.getWorldPosition(pos)
            const ptLight = new THREE.PointLight(0xffcc44, 3, 9, 2)
            ptLight.position.copy(pos)
            game.scene.add(ptLight)
            lightCount++
        }
    })
}

export class Scenery {
    items: THREE.Object3D[] = []

    constructor() {}

    async init() {
        const game = Game.getInstance()

        // Main scenery first (largest model, needed for reference positions)
        const scenery = await loadStatic(game, [
            '/scenery/scenery-compressed.glb',
            '/scenery/scenery.glb'
        ])
        if (scenery) this.items.push(scenery)

        // Instanced trees in parallel
        await Promise.allSettled([
            loadInstanced(
                game,
                ['/birchTrees/birchTreesReferences-compressed.glb', '/birchTrees/birchTreesReferences.glb'],
                ['/birchTrees/birchTreesVisual-compressed.glb', '/birchTrees/birchTreesVisual.glb'],
                '#6a9a4c'
            ),
            loadInstanced(
                game,
                ['/oakTrees/oakTreesReferences-compressed.glb', '/oakTrees/oakTreesReferences.glb'],
                ['/oakTrees/oakTreesVisual-compressed.glb', '/oakTrees/oakTreesVisual.glb'],
                '#4d8a3e'
            ),
            loadInstanced(
                game,
                ['/cherryTrees/cherryTreesReferences-compressed.glb', '/cherryTrees/cherryTreesReferences.glb'],
                ['/cherryTrees/cherryTreesVisual-compressed.glb', '/cherryTrees/cherryTreesVisual.glb'],
                '#cc7090'
            ),
        ])

        // Ground-level vegetation and structures in parallel
        await Promise.allSettled([
            loadStatic(game, ['/flowers/flowersReferences-compressed.glb', '/flowers/flowersReferences.glb']).then(r => { if (r) this.items.push(r) }),
            loadStatic(game, ['/bushes/bushesReferences-compressed.glb', '/bushes/bushesReferences.glb']).then(r => { if (r) this.items.push(r) }),
            loadStatic(game, ['/fences/fences-compressed.glb', '/fences/fences.glb']).then(r => { if (r) this.items.push(r) }),
            loadStatic(game, ['/benches/benches-compressed.glb', '/benches/benches.glb']).then(r => { if (r) this.items.push(r) }),
            loadStatic(game, ['/poleLights/poleLights-compressed.glb', '/poleLights/poleLights.glb']).then(r => { if (r) this.items.push(r) }),
        ])

        // Lanterns with point lights
        await loadLanterns(game)

        // Bricks with trimesh collision
        await this.loadBricks(game)
    }

    private async loadBricks(game: any) {
        const gltf = await tryLoadGLTF(game, [
            '/bricks/bricks-compressed.glb',
            '/bricks/bricks.glb'
        ])
        if (!gltf) return

        gltf.scene.updateMatrixWorld(true)
        gltf.scene.traverse((child: THREE.Object3D) => {
            if (!(child instanceof THREE.Mesh)) return
            const geo = child.geometry as THREE.BufferGeometry
            if (!geo?.attributes?.position) return

            const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
            const vertices = new Float32Array(posAttr.array)
            const indexAttr = geo.index

            let indices: Uint32Array
            if (indexAttr) {
                indices = new Uint32Array(indexAttr.array)
            } else {
                indices = new Uint32Array(vertices.length / 3)
                for (let i = 0; i < indices.length; i++) indices[i] = i
            }

            const matrix = child.matrixWorld
            for (let i = 0; i < vertices.length; i += 3) {
                const v = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2])
                v.applyMatrix4(matrix)
                vertices[i] = v.x; vertices[i + 1] = v.y; vertices[i + 2] = v.z
            }

            try {
                game.objects.add(null, {
                    type: 'fixed',
                    friction: 0.7,
                    restitution: 0.2,
                    colliders: [{ shape: 'trimesh', parameters: [vertices, indices], category: 'floor' }]
                })
            } catch(e) {}
        })

        game.materials.updateObject(gltf.scene)
        game.scene.add(gltf.scene)
        this.items.push(gltf.scene)
    }
}
