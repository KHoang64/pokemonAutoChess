import type Phaser from "phaser"
import { Orientation } from "./orientation"

const FPS = 36
const FRAME_SCAN_MAX = 24

function registerDirectionalAnim(
  scene: Phaser.Scene,
  index: string,
  action: "Idle" | "Walk" | "Attack",
  tint: "Normal" | "Shiny" = "Normal"
) {
  for (const direction of Object.values(Orientation)) {
    const prefix = `${tint}/${action}/Anim/${direction}/`
    const frames = scene.anims.generateFrameNames(index, {
      start: 0,
      end: FRAME_SCAN_MAX,
      zeroPad: 4,
      prefix
    })

    if (frames.length === 0) continue

    const frameMul = action === "Walk" ? 2 : action === "Attack" ? 1.5 : 4
    for (let i = 0; i < frames.length; i++) {
      frames[i]!.duration = (1000 / FPS) * frameMul
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

export function registerPokemonAnims(
  scene: Phaser.Scene,
  index: string,
  tint: "Normal" | "Shiny" = "Normal"
) {
  registerDirectionalAnim(scene, index, "Idle", tint)
  registerDirectionalAnim(scene, index, "Walk", tint)
  registerDirectionalAnim(scene, index, "Attack", tint)
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

  sprite.setFrame(`Normal/Idle/Anim/${direction}/0000`)
}

export function playAttackAnim(
  sprite: Phaser.GameObjects.Sprite,
  index: string,
  direction: Orientation
): boolean {
  const key = `${index}/Normal/Attack/Anim/${direction}`
  if (!sprite.scene.anims.exists(key)) {
    const idleKey = `${index}/Normal/Idle/Anim/${direction}`
    if (sprite.scene.anims.exists(idleKey)) {
      sprite.anims.play(idleKey, false)
    }
    return false
  }
  sprite.anims.play(key, false)
  return true
}
