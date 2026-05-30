import type Phaser from "phaser"
import { Orientation } from "./orientation"

const FPS = 36

function frameDuration(action: "Idle" | "Walk" | "Attack"): number {
  const frameMul = action === "Walk" ? 2 : action === "Attack" ? 1.5 : 4
  return (1000 / FPS) * frameMul
}

/** Collect atlas frame names that exist — avoids Phaser warnings from generateFrameNames gaps. */
function collectFrames(
  scene: Phaser.Scene,
  textureKey: string,
  prefix: string
): Phaser.Types.Animations.AnimationFrame[] {
  if (!scene.textures.exists(textureKey)) return []

  const names = scene.textures.get(textureKey).getFrameNames()
  const matching = names
    .filter((name) => name.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  return matching.map((frame) => ({ key: textureKey, frame }))
}

function registerDirectionalAnim(
  scene: Phaser.Scene,
  index: string,
  action: "Idle" | "Walk" | "Attack",
  tint: "Normal" | "Shiny" = "Normal"
) {
  for (const direction of Object.values(Orientation)) {
    const prefix = `${tint}/${action}/Anim/${direction}/`
    const frames = collectFrames(scene, index, prefix)
    if (frames.length === 0) continue

    const duration = frameDuration(action)
    for (const frame of frames) {
      frame.duration = duration
    }

    const key = `${index}/${tint}/${action}/Anim/${direction}`
    if (!scene.anims.exists(key)) {
      scene.anims.create({
        key,
        frames,
        repeat: action === "Idle" || action === "Walk" ? -1 : 0
      })
    }
  }
}

function hasAnyFrames(scene: Phaser.Scene, index: string, prefix: string): boolean {
  if (!scene.textures.exists(index)) return false
  return scene.textures
    .get(index)
    .getFrameNames()
    .some((name) => name.startsWith(prefix))
}

export function registerPokemonAnims(
  scene: Phaser.Scene,
  index: string,
  tint: "Normal" | "Shiny" = "Normal"
) {
  registerDirectionalAnim(scene, index, "Idle", tint)
  registerDirectionalAnim(scene, index, "Walk", tint)
  if (hasAnyFrames(scene, index, `${tint}/Attack/Anim/`)) {
    registerDirectionalAnim(scene, index, "Attack", tint)
  }
}

export function playFacingAnim(
  sprite: Phaser.GameObjects.Sprite,
  index: string,
  direction: Orientation,
  moving: boolean
) {
  const action = moving ? "Walk" : "Idle"
  const key = `${index}/Normal/${action}/Anim/${direction}`
  if (sprite.anims.currentAnim?.key === key) return

  if (sprite.scene.anims.exists(key)) {
    sprite.anims.play(key, true)
    return
  }

  const idleKey = `${index}/Normal/Idle/Anim/${direction}`
  if (sprite.scene.anims.exists(idleKey)) {
    sprite.anims.play(idleKey, true)
    return
  }

  const idleFrame = `Normal/Idle/Anim/${direction}/0000`
  if (sprite.texture.key === index && sprite.scene.textures.get(index).has(idleFrame)) {
    sprite.setFrame(idleFrame)
  }
}

export function playAttackAnim(
  sprite: Phaser.GameObjects.Sprite,
  index: string,
  direction: Orientation
): boolean {
  const key = `${index}/Normal/Attack/Anim/${direction}`
  if (!sprite.scene.anims.exists(key)) {
    return false
  }
  sprite.anims.play(key, false)
  return true
}
