import Phaser from "phaser"
import {
  ensureAbilitiesAtlas,
  playEvolutionVfx,
  playMoveVfx,
  type HotbarMoveId
} from "./abilitiesVfx"
import { loadPokemonAtlas } from "./loadPokemonAtlas"
import { orientationFromVelocity, Orientation } from "./orientation"
import {
  playAttackAnim,
  playFacingAnim,
  registerPokemonAnims
} from "./pokemonAnims"
import { DEFAULT_POKEMON } from "./pokemon-roster"

const WALK_SPEED = 140
const RUN_SPEED = 280
const MAP_SCALE = 2
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1
const MAP_MARGIN = 40

export default class WasdScene extends Phaser.Scene {
  player!: Phaser.GameObjects.Sprite
  private keyW!: Phaser.Input.Keyboard.Key
  private keyA!: Phaser.Input.Keyboard.Key
  private keyS!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key
  private keyShift!: Phaser.Input.Keyboard.Key
  private keySpace!: Phaser.Input.Keyboard.Key
  pokemonIndex = "placeholder-pokemon"
  currentLabel = DEFAULT_POKEMON.label
  private map?: Phaser.Tilemaps.Tilemap
  private mapLoaded = false
  private statusText!: Phaser.GameObjects.Text
  private swapping = false
  private attacking = false
  private selectedMove: HotbarMoveId = "razor_leaf"
  private walkBounds = { minX: 40, minY: 40, maxX: 1560, maxY: 1160 }

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
    this.walkBounds = {
      minX: MAP_MARGIN,
      minY: MAP_MARGIN,
      maxX: boundsW - MAP_MARGIN,
      maxY: boundsH - MAP_MARGIN
    }

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
    this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    void ensureAbilitiesAtlas(this)

    const cam = this.cameras.main
    cam.setBounds(0, 0, boundsW, boundsH)
    cam.centerOn(startX, startY)
    cam.startFollow(this.player, true, 0.12, 0.12)
    cam.setZoom(1)

    this.setupWheelZoom()

    this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.attacking) return
      this.attacking = false
      const facing =
        (this.player.getData("facing") as Orientation) ?? Orientation.DOWN
      playFacingAnim(this.player, this.pokemonIndex, facing, false)
    })

    if (this.textures.exists(DEFAULT_POKEMON.index)) {
      this.applyPokemonSprite(DEFAULT_POKEMON.index, DEFAULT_POKEMON.label)
    } else {
      this.setHudMessage(this.mapLoaded, `${DEFAULT_POKEMON.label} (loading…)`)
      void this.swapToPokemon(DEFAULT_POKEMON.index, DEFAULT_POKEMON.label)
    }

    this.game.events.emit("wasd-scene-ready", this)
  }

  setSelectedMove(move: HotbarMoveId) {
    this.selectedMove = move
    this.refreshHud()
  }

  private setupWheelZoom() {
    this.input.on(
      "wheel",
      (
        _pointer: unknown,
        _objects: unknown,
        _deltaX: number,
        deltaY: number
      ) => {
      const cam = this.cameras.main
      const next = Phaser.Math.Clamp(
        cam.zoom + Math.sign(deltaY) * ZOOM_STEP,
        ZOOM_MIN,
        ZOOM_MAX
      )
      cam.setZoom(next)
      this.refreshHud()
      }
    )
  }

  async playEvolutionVfx() {
    try {
      if (!(await ensureAbilitiesAtlas(this))) return
      playEvolutionVfx(this, this.player.x, this.player.y)
      const facing =
        (this.player.getData("facing") as Orientation) ?? Orientation.DOWN
      if (this.pokemonIndex !== "placeholder-pokemon") {
        playFacingAnim(this.player, this.pokemonIndex, facing, false)
      }
    } catch (err) {
      console.warn("[prototype-wasd] Evolution VFX failed:", err)
    }
  }

  async useSelectedMove() {
    if (this.attacking || this.swapping) return

    const facing =
      (this.player.getData("facing") as Orientation) ?? Orientation.DOWN

    if (this.selectedMove === "strike") {
      if (this.pokemonIndex === "placeholder-pokemon") return
      const played = playAttackAnim(this.player, this.pokemonIndex, facing)
      if (played) this.attacking = true
      return
    }

    if (!(await ensureAbilitiesAtlas(this))) return
    playMoveVfx(this, this.selectedMove, this.player.x, this.player.y, facing)
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
      `${mapLine}\nSprite: ${spriteLine}\nMove: ${this.selectedMove.replace("_", " ")}\nWASD · Shift run · Space · scroll zoom`
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
      this.map
        .createLayer(layerName, tileset, 0, 0)
        ?.setScale(MAP_SCALE, MAP_SCALE)
    }
    return true
  }

  private clampToMap() {
    const b = this.walkBounds
    this.player.x = Phaser.Math.Clamp(this.player.x, b.minX, b.maxX)
    this.player.y = Phaser.Math.Clamp(this.player.y, b.minY, b.maxY)
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

    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      void this.useSelectedMove()
    }

    if (!this.attacking) {
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
        this.clampToMap()

        const facing = orientationFromVelocity(vx, vy)
        this.player.setData("facing", facing)

        if (this.pokemonIndex !== "placeholder-pokemon") {
          playFacingAnim(this.player, this.pokemonIndex, facing, true)
        }
      } else if (this.pokemonIndex !== "placeholder-pokemon") {
        const facing =
          (this.player.getData("facing") as Orientation) ?? Orientation.DOWN
        playFacingAnim(this.player, this.pokemonIndex, facing, false)
      }
    }
  }
}
