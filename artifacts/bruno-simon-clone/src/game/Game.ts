import * as THREE from 'three/webgpu'
import RAPIER from '@dimforge/rapier3d-compat'
import { Events } from './Events'
import { Ticker } from './Ticker'
import { Viewport } from './Viewport'
import { Inputs } from './Inputs'
import { Resources } from './Resources'
import { Rendering } from './Rendering'
import { View } from './View'
import { Physics } from './Physics/Physics'
import { PhysicsVehicle } from './Physics/PhysicsVehicle'
import { Objects } from './Objects'
import { Materials } from './Materials'
import { Lighting } from './Lighting'
import { Terrain } from './Terrain'
import { Respawns } from './Respawns'
import { Water } from './Water'
import { Fog } from './Fog'
import { Player } from './Player'
import { Audio } from './Audio'
import { Overlay } from './Overlay'
import { Menu } from './Menu'
import { Reveal } from './Reveal'
import { Notifications } from './Notifications'
import { Achievements } from './Achievements'
import { Areas } from './Areas'
import { Sections } from './Sections'
import { Map } from './Map'
import { Circuit } from './Circuit'
import { Whispers } from './Whispers'
import { SpeedLines } from './SpeedLines'
import { NightMode } from './NightMode'
import { Jukebox } from './Jukebox'
import { World } from './World/World'

export class Game {
    private static _instance: Game
    static getInstance(): Game { return Game._instance }

    canvasElement!: HTMLCanvasElement
    domElement!: HTMLElement

    events: Events = new Events()
    ticker!: Ticker
    viewport!: Viewport
    inputs!: Inputs
    resources!: Resources
    RAPIER!: typeof RAPIER

    scene!: THREE.Scene
    rendering!: Rendering

    view!: View
    physics!: Physics
    physicalVehicle!: PhysicsVehicle
    objects!: Objects
    water!: Water
    fog!: Fog
    materials!: Materials
    lighting!: Lighting
    terrain!: Terrain
    respawns!: Respawns
    player!: Player
    audio!: Audio
    overlay!: Overlay
    menu!: Menu
    reveal!: Reveal
    notifications!: Notifications
    achievements!: Achievements
    areas!: Areas
    sections!: Sections
    map!: Map
    circuit!: Circuit
    whispers!: Whispers
    speedLines!: SpeedLines
    nightMode!: NightMode
    jukebox!: Jukebox

    world!: World

    get intro() { return this.world?.intro }

    constructor() {
        Game._instance = this
        this.start()
    }

    async start() {
        this.canvasElement = document.querySelector('.js-canvas') as HTMLCanvasElement
        this.domElement = document.querySelector('.game') as HTMLElement ?? document.body

        if (!this.canvasElement) {
            console.error('Canvas .js-canvas not found')
            return
        }

        this.ticker = new Ticker()
        this.viewport = new Viewport(this.domElement)
        this.inputs = new Inputs()

        this.scene = new THREE.Scene()
        this.scene.background = null

        await RAPIER.init()
        this.RAPIER = RAPIER

        this.rendering = new Rendering()
        await this.rendering.setRenderer()

        this.resources = new Resources()

        this.water = new Water()
        this.objects = new Objects()
        this.physics = new Physics()
        this.physicalVehicle = new PhysicsVehicle()

        this.materials = new Materials()
        await this.materials.init()

        this.lighting = new Lighting()
        this.terrain = new Terrain()
        this.respawns = new Respawns()
        this.player = new Player()

        this.audio = new Audio()
        this.audio.init().catch(() => {})

        this.view = new View()
        this.rendering.setPostprocessing()
        this.rendering.start()

        this.overlay = new Overlay()
        this.menu = new Menu()
        this.reveal = new Reveal()
        this.notifications = new Notifications()
        this.fog = new Fog()
        this.nightMode = new NightMode()

        this.world = new World()
        await this.world.init()

        // Init water mesh after scene is ready
        this.water.init()

        // Zone-independent systems
        this.achievements = new Achievements()

        // Areas (zone detection)
        this.areas = new Areas()
        await this.areas.init()

        this.sections = new Sections()
        this.map = new Map()

        // Zone-dependent systems (after areas)
        this.circuit = new Circuit()
        this.whispers = new Whispers()
        this.jukebox = new Jukebox()
        this.speedLines = new SpeedLines()

        // Wire area events to circuit + whispers
        this.areas.events.on('enter', (area: any) => {
            this.circuit?.onAreaEnter(area?.name ?? '')
            this.whispers?.onAreaEnter(area?.name ?? '')
        })
        this.areas.events.on('leave', (area: any) => {
            this.circuit?.onAreaLeave(area?.name ?? '')
            this.whispers?.onAreaLeave(area?.name ?? '')
        })

        this.events.trigger('ready')
    }
}
