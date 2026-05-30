import Phaser from "phaser"
import { loadPokemonAtlas } from "./loadPokemonAtlas"
import { orientationFromVelocity, Orientation } from "./orientation"
import { playFacingAnim, registerPokemonAnims } from "./pokemonAnims"
import { DEFAULT_POKEMON } from "./pokemon-roster"

const WALK_SPEED = 140
const RUN_SPEED = 280
const MAP_SCALE = 2
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1

export default class WasdScene extends Phaser.Scene {
  player!: Phaser.GameObjects.Sprite
  private keyW!: Phaser.Input.Keyboard.Key
  private keyA!: Phaser.Input.Keyboard.Key
  private keyS!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key
  private keyShift!: Phaser.Input.Keyboard.Key
  pokemonIndex = "placeholder-pokemon"
  currentLabel = DEFAULT_POKEMON.label
  private map?: Phaser.Tilemaps.Tilemap
  private mapLoaded = false
  private statusText!: Phaser.GameObjects.Text
  private swapping = false

  constructor() {
    super({ key: "WasdScene" })
  }

  preload() {
    this.load.image("town_tileset", "/assets/tilesets/Town/tileset.png")
    this.load.tilemapTiledJSON("town", "/assets/tilesets/Town/town.json")
    this.load.multiatlas(
      DEFAULT_POKEMON.index,
      `/assets/pokemons/${DEFAULT_POKEMON.index}.json`,
      "/assets/pokemons/"
    )

    this.load.on("loaderror", (file: { key: string }) => {
      if (file.key === "town_tileset") {
        console.warn("[prototype-wasd] town_tileset.png missing")
      }
    })
  }

  create() {
    this.statusText = this.add
      .text(12, 12, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 6, y: 4 }
      })
      .setScrollFactor(0)
      .setDepth(1000)

    this.mapLoaded = this.createTownMap()
    const { startX, startY, boundsW, boundsH } = this.getSpawnAndBounds()

    this.pokemonIndex = this.ensurePlaceholderTexture()
    this.player = this.add.sprite(startX, startY, this.pokemonIndex)
    this.player.setScale(MAP_SCALE)
    this.player.setOrigin(0.5, 1)
    this.player.setDepth(10)
    this.player.setData("facing", Orientation.DOWN)

    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error("Keyboard plugin missing — cannot use WASD")
    }
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.keyShift = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)

    const cam = this.cameras.main
    cam.setBounds(0, 0, boundsW, boundsH)
    cam.centerOn(startX, startY)
    cam.startFollow(this.player, true, 0.12, 0.12)
    cam.setZoom(1)

    this.setupWheelZoom()

    if (this.textures.exists(DEFAULT_POKEMON.index)) {
      this.applyPokemonSprite(DEFAULT_POKEMON.index, DEFAULT_POKEMON.label)
    } else {
      this.setHudMessage(this.mapLoaded, `${DEFAULT_POKEMON.label} (loading…)`)
      void this.swapToPokemon(DEFAULT_POKEMON.index, DEFAULT_POKEMON.label)
    }

    this.game.events.emit("wasd-scene-ready", this)
  }

  private setupWheelZoom() {
    this.input.on("wheel", (_pointer, _objects, _deltaX, deltaY) => {
      const cam = this.cameras.main
      const next = Phaser.Math.Clamp(
        cam.zoom + Math.sign(deltaY) * ZOOM_STEP,
        ZOOM_MIN,
        ZOOM_MAX
      )
      cam.setZoom(next)
      this.refreshHud()
    })
  }

  async swapToPokemon(index: string, label: string) {
    if (this.swapping || index === this.pokemonIndex) return
    this.swapping = true
    this.setHudMessage(this.mapLoaded, `${label} (loading…)`)

    try {
      if (!this.textures.exists(index)) {
        await loadPokemonAtlas(this, index)
      }
      this.applyPokemonSprite(index, label)
    } catch (err) {
      console.warn(`[prototype-wasd] Failed to load ${index}:`, err)
      this.setHudMessage(this.mapLoaded, `${label} failed — keeping ${this.currentLabel}`)
    } finally {
      this.swapping = false
    }
  }

  private applyPokemonSprite(index: string, label: string) {
    registerPokemonAnims(this, index)
    this.pokemonIndex = index
    this.currentLabel = label
    this.player.setTexture(index)
    playFacingAnim(
      this.player,
      index,
      (this.player.getData("facing") as Orientation) ?? Orientation.DOWN,
      false
    )
    this.refreshHud()
    this.events.emit("pokemon-changed", index)
  }

  private refreshHud() {
    const zoom = this.cameras.main.zoom.toFixed(1)
    this.setHudMessage(
      this.mapLoaded,
      `${this.currentLabel} (${this.pokemonIndex}) · zoom ${zoom}x`
    )
  }

  private getSpawnAndBounds() {
    if (this.map && this.mapLoaded) {
      const boundsW = this.map.widthInPixels * MAP_SCALE
      const boundsH = this.map.heightInPixels * MAP_SCALE
      return {
        startX: boundsW / 2,
        startY: boundsH / 2,
        boundsW,
        boundsH
      }
    }
    const boundsW = 1600
    const boundsH = 1200
    this.add.rectangle(boundsW / 2, boundsH / 2, boundsW, boundsH, 0x3d5a45)
    return { startX: boundsW / 2, startY: boundsH / 2, boundsW, boundsH }
  }

  private setHudMessage(mapOk: boolean, spriteLine: string) {
    const mapLine = mapOk
      ? "Map: Treasure Town"
      : "Map: fallback (town PNG missing)"
    this.statusText.setText(
      `${mapLine}\nSprite: ${spriteLine}\nWASD move · Shift run · scroll zoom · Swap button`
    )
  }

  private createTownMap(): boolean {
    if (!this.textures.exists("town_tileset")) {
      return false
    }

    this.map = this.add.tilemap("town")
    const tileset = this.map.addTilesetImage("town_tileset", "town_tileset")
    if (!tileset) return false

    for (const layerName of ["layer0", "layer1", "layer2"]) {
      this.map.createLayer(layerName, tileset, 0, 0)?.setScale(MAP_SCALE, MAP_SCALE)
    }
    return true
  }

  private ensurePlaceholderTexture(): string {
    const key = "placeholder-pokemon"
    if (this.textures.exists(key)) return key

    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0x89cff0, 1)
    g.fillRect(0, 0, 24, 32)
    g.fillStyle(0xffffff, 1)
    g.fillRect(8, 10, 8, 8)
    g.generateTexture(key, 24, 32)
    g.destroy()
    return key
  }

  update(_time: number, delta: number) {
    if (!this.player) return

    let vx = 0
    let vy = 0
    if (this.keyW?.isDown) vy -= 1
    if (this.keyS?.isDown) vy += 1
    if (this.keyA?.isDown) vx -= 1
    if (this.keyD?.isDown) vx += 1

    const moving = vx !== 0 || vy !== 0
    if (moving) {
      const len = Math.hypot(vx, vy) || 1
      vx /= len
      vy /= len
      const speed = this.keyShift?.isDown ? RUN_SPEED : WALK_SPEED
      const step = (speed * delta) / 1000
      this.player.x += vx * step
      this.player.y += vy * step
    }

    const facing = moving
      ? orientationFromVelocity(vx, vy)
      : ((this.player.getData("facing") as Orientation) ?? Orientation.DOWN)

    if (moving) {
      this.player.setData("facing", facing)
    }

    if (this.pokemonIndex !== "placeholder-pokemon") {
      playFacingAnim(this.player, this.pokemonIndex, facing, moving)
    }
  }
}
