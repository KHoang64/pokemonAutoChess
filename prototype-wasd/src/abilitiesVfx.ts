import Phaser from "phaser"
import type PhaserType from "phaser"
import { ensureLoaderIdle } from "./loadPokemonAtlas"
import { Orientation } from "./orientation"

const ABILITIES_KEY = "abilities"
const FPS_EFFECTS = 20

export type HotbarMoveId = "razor_leaf" | "crunch" | "strike"

export const HOTBAR_MOVES: {
  id: HotbarMoveId
  label: string
  animKey: string
}[] = [
  { id: "razor_leaf", label: "Razor Leaf", animKey: "RAZOR_LEAF" },
  { id: "crunch", label: "Crunch", animKey: "BITE" },
  { id: "strike", label: "Strike", animKey: "" }
]

/** Matches app/public/src/assets/atlas.json abilities pack. */
const ABILITY_ANIMS: Record<
  string,
  { frames: number; repeat?: number; fps?: number }
> = {
  EVOLUTION: { frames: 8 },
  RAZOR_LEAF: { frames: 8, repeat: -1 },
  BITE: { frames: 12 }
}

const SCREEN_VECTOR: Record<Orientation, [number, number]> = {
  [Orientation.DOWN]: [0, 1],
  [Orientation.DOWNRIGHT]: [1, 1],
  [Orientation.RIGHT]: [1, 0],
  [Orientation.UPRIGHT]: [1, -1],
  [Orientation.UP]: [0, -1],
  [Orientation.UPLEFT]: [-1, -1],
  [Orientation.LEFT]: [-1, 0],
  [Orientation.DOWNLEFT]: [-1, 1]
}

let abilitiesLoadFailed = false

export function abilitiesAtlasAvailable(scene: PhaserType.Scene): boolean {
  return scene.textures.exists(ABILITIES_KEY)
}

async function resolveAbilitiesJsonUrl(): Promise<string | null> {
  const candidates = [
    "/assets/abilities/abilities.json",
    "/assets/abilities{tps}/abilities.json"
  ]
  for (const url of candidates) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const text = (await res.text()).trimStart()
      if (text.startsWith("{")) return url
    } catch {
      /* try next */
    }
  }
  return null
}

function animDuration(frames: number, fps = FPS_EFFECTS): number {
  return (1000 / fps) * frames
}

function createAbilityAnim(
  scene: PhaserType.Scene,
  key: string,
  prefix: string,
  frameCount: number,
  repeat = 0,
  fps = FPS_EFFECTS
) {
  if (scene.anims.exists(key)) return

  const texture = scene.textures.get(ABILITIES_KEY)
  const animFrames: Phaser.Types.Animations.AnimationFrame[] = []
  for (let i = 0; i < frameCount; i++) {
    const frame = `${prefix}${String(i).padStart(3, "0")}.png`
    if (!texture.has(frame)) break
    animFrames.push({ key: ABILITIES_KEY, frame })
  }
  if (animFrames.length === 0) return

  scene.anims.create({
    key,
    frames: animFrames,
    duration: animDuration(animFrames.length, fps),
    repeat
  })
}

export function registerAbilitiesAnims(scene: PhaserType.Scene) {
  if (!abilitiesAtlasAvailable(scene)) return

  for (const [key, cfg] of Object.entries(ABILITY_ANIMS)) {
    createAbilityAnim(
      scene,
      key,
      `${key}/`,
      cfg.frames,
      cfg.repeat ?? 0,
      cfg.fps ?? FPS_EFFECTS
    )
  }
}

/** Load abilities multiatlas (built output: npm run assetpack). */
export async function ensureAbilitiesAtlas(scene: PhaserType.Scene): Promise<boolean> {
  if (scene.textures.exists(ABILITIES_KEY)) {
    registerAbilitiesAnims(scene)
    return true
  }
  if (abilitiesLoadFailed) return false

  const jsonUrl = await resolveAbilitiesJsonUrl()
  if (!jsonUrl) {
    abilitiesLoadFailed = true
    console.warn(
      "[prototype-wasd] abilities atlas not found. From repo root run: npm install && npm run assetpack"
    )
    return false
  }

  const basePath = jsonUrl.replace(/abilities\.json.*$/, "")

  await ensureLoaderIdle(scene)
  await new Promise<void>((resolve, reject) => {
    scene.load.once(`filecomplete-multiatlas-${ABILITIES_KEY}`, () => resolve())
    scene.load.once("loaderror", (file: { key?: string }) => {
      if (file.key === ABILITIES_KEY) {
        abilitiesLoadFailed = true
        reject(new Error("Failed to load abilities atlas"))
      }
    })
    scene.load.multiatlas(ABILITIES_KEY, jsonUrl, basePath).start()
  })

  registerAbilitiesAnims(scene)
  return true
}

function firstFrame(animKey: string): string {
  return `${animKey}/000.png`
}

export function playEvolutionVfx(
  scene: PhaserType.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Sprite | null {
  if (!scene.anims.exists("EVOLUTION")) {
    console.warn("[prototype-wasd] EVOLUTION anim missing — run npm run assetpack")
    return null
  }

  const vfx = scene.add.sprite(x, y - 40, ABILITIES_KEY, firstFrame("EVOLUTION"))
  vfx.setScale(2)
  vfx.setDepth(11)
  vfx.play("EVOLUTION")
  vfx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => vfx.destroy())
  return vfx
}

function facingOffset(facing: Orientation, distance: number): [number, number] {
  const [dx, dy] = SCREEN_VECTOR[facing]
  const len = Math.hypot(dx, dy) || 1
  return [(dx / len) * distance, (dy / len) * distance]
}

export function playMoveVfx(
  scene: PhaserType.Scene,
  move: HotbarMoveId,
  x: number,
  y: number,
  facing: Orientation
): boolean {
  if (move === "strike") return false

  const entry = HOTBAR_MOVES.find((m) => m.id === move)
  if (!entry?.animKey) return false

  const animKey = entry.animKey
  if (!scene.textures.exists(ABILITIES_KEY) || !scene.anims.exists(animKey)) {
    console.warn(`[prototype-wasd] ${animKey} VFX missing — run npm run assetpack`)
    return false
  }

  if (move === "razor_leaf") {
    const [ox, oy] = facingOffset(facing, 48)
    const sprite = scene.add.sprite(x + ox, y + oy - 24, ABILITIES_KEY, firstFrame(animKey))
    sprite.setDepth(11)
    sprite.play({ key: animKey, repeat: 0 })

    const [tx, ty] = facingOffset(facing, 220)
    scene.tweens.add({
      targets: sprite,
      x: x + tx,
      y: y + ty - 24,
      duration: 700,
      ease: "Linear",
      onComplete: () => sprite.destroy()
    })
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (sprite.active) sprite.destroy()
    })
    return true
  }

  if (move === "crunch") {
    const vfx = scene.add.sprite(x, y - 32, ABILITIES_KEY, firstFrame(animKey))
    vfx.setScale(3)
    vfx.setDepth(11)
    vfx.play(animKey)
    vfx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => vfx.destroy())
    return true
  }

  return false
}
