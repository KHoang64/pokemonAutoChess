import Phaser from "phaser"
import type PhaserType from "phaser"
import { ensureLoaderIdle } from "./loadPokemonAtlas"

const ABILITIES_KEY = "abilities"

/** Evolution sparkle VFX from abilities atlas (same as main game). */
export async function ensureAbilitiesAtlas(scene: PhaserType.Scene): Promise<void> {
  if (scene.textures.exists(ABILITIES_KEY)) {
    registerAbilitiesAnims(scene)
    return
  }

  await ensureLoaderIdle(scene)
  await new Promise<void>((resolve, reject) => {
    scene.load.once(`filecomplete-multiatlas-${ABILITIES_KEY}`, () => resolve())
    scene.load.once("loaderror", (file: { key?: string }) => {
      if (file.key === ABILITIES_KEY) {
        reject(new Error("Failed to load abilities atlas"))
      }
    })
    scene.load
      .multiatlas(
        ABILITIES_KEY,
        "/assets/abilities/abilities.json",
        "/assets/abilities/"
      )
      .start()
  })
  registerAbilitiesAnims(scene)
}

function registerAbilitiesAnims(scene: PhaserType.Scene) {
  if (scene.anims.exists("EVOLUTION")) return

  scene.anims.create({
    key: "EVOLUTION",
    frames: scene.anims.generateFrameNames(ABILITIES_KEY, {
      start: 0,
      end: 7,
      zeroPad: 3,
      prefix: "EVOLUTION/",
      suffix: ".png"
    }),
    duration: 100,
    repeat: 0
  })
}

export function playEvolutionVfx(
  scene: PhaserType.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Sprite | null {
  if (!scene.textures.exists(ABILITIES_KEY) || !scene.anims.exists("EVOLUTION")) {
    console.warn("[prototype-wasd] abilities / EVOLUTION anim not loaded")
    return null
  }

  const vfx = scene.add.sprite(x, y - 40, ABILITIES_KEY, "EVOLUTION/000.png")
  vfx.setScale(2)
  vfx.setDepth(11)
  vfx.play("EVOLUTION")
  vfx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => vfx.destroy())
  return vfx
}
