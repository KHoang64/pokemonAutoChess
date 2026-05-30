import type Phaser from "phaser"

type CompressedAtlas = {
  i: string
  s: [number, number, number?]
  a: unknown
}

const lazyLoadingRequests: Record<string, Promise<void>> = {}
const ATLAS_LOAD_MS = 12000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ])
}

/** Wait until the scene loader is idle (preload finished). */
export function ensureLoaderIdle(scene: Phaser.Scene): Promise<void> {
  if (!scene.load.isLoading()) return Promise.resolve()
  return new Promise((resolve) => {
    scene.load.once("complete", () => resolve())
  })
}

function traverseFrames(
  obj: unknown,
  path: string,
  frames: Phaser.Types.Textures.FrameConfig[]
) {
  if (Array.isArray(obj)) {
    const [
      sourceSizew,
      sourceSizeh,
      spriteSourceSizex,
      spriteSourceSizey,
      spriteSourceSizew,
      spriteSourceSizeh,
      framex,
      framey,
      framew,
      frameh
    ] = obj as number[]
    frames.push({
      filename: path,
      rotated: false,
      trimmed: true,
      sourceSize: { w: sourceSizew, h: sourceSizeh },
      spriteSourceSize: {
        x: spriteSourceSizex,
        y: spriteSourceSizey,
        w: spriteSourceSizew,
        h: spriteSourceSizeh
      },
      frame: { x: framex, y: framey, w: framew, h: frameh }
    })
  } else if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj as object)) {
      traverseFrames(
        (obj as Record<string, unknown>)[key],
        path ? `${path}/${key}` : key,
        frames
      )
    }
  }
}

export function loadCompressedAtlas(
  scene: Phaser.Scene,
  index: string
): Promise<void> {
  if (index in lazyLoadingRequests) {
    return lazyLoadingRequests[index]!
  }

  lazyLoadingRequests[index] = ensureLoaderIdle(scene).then(
    () =>
      new Promise((resolve, reject) => {
        const fail = (reason: string) => {
          delete lazyLoadingRequests[index]
          reject(new Error(reason))
        }

        scene.load.once(
          `filecomplete-json-pokemon-atlas-${index}`,
          (_key, _type, data) => {
            const compressed = data as CompressedAtlas
            const frames: Phaser.Types.Textures.FrameConfig[] = []
            traverseFrames(compressed.a, "", frames)
            const textureKey = compressed.i.replace(".png", "")

            scene.textures.once(`addtexture-${textureKey}`, () => {
              delete lazyLoadingRequests[index]
              resolve()
            })

            scene.load.once("loaderror", (file: { key?: string }) => {
              if (file.key === textureKey) {
                fail(`PNG missing for ${index} (${compressed.i})`)
              }
            })

            const multiatlas = {
              textures: [
                {
                  image: compressed.i,
                  format: "RGBA8888",
                  size: { w: compressed.s[0], h: compressed.s[1] },
                  scale: compressed.s[2] ?? 1,
                  frames
                }
              ]
            }
            scene.load
              .multiatlas(textureKey, multiatlas, "/assets/pokemons/")
              .start()
          }
        )

        scene.load.once("loaderror", (file: { key?: string }) => {
          if (file.key === `pokemon-atlas-${index}`) {
            fail(`JSON missing for ${index}`)
          }
        })

        scene.load
          .json(`pokemon-atlas-${index}`, `/assets/pokemons/${index}.json`)
          .start()
      })
  )

  return lazyLoadingRequests[index]!
}

export function loadStandardAtlas(scene: Phaser.Scene, index: string): Promise<void> {
  if (index in lazyLoadingRequests) {
    return lazyLoadingRequests[index]!
  }

  lazyLoadingRequests[index] = ensureLoaderIdle(scene).then(
    () =>
      new Promise((resolve, reject) => {
        const fail = (reason: string) => {
          delete lazyLoadingRequests[index]
          reject(new Error(reason))
        }

        scene.load.once(`filecomplete-multiatlas-${index}`, () => {
          delete lazyLoadingRequests[index]
          resolve()
        })

        scene.load.once("loaderror", (file: { key?: string }) => {
          if (file.key === index) {
            fail(`Failed to load atlas ${index} (json or png)`)
          }
        })

        scene.load
          .multiatlas(index, `/assets/pokemons/${index}.json`, "/assets/pokemons/")
          .start()
      })
  )

  return lazyLoadingRequests[index]!
}

export async function loadPokemonAtlas(
  scene: Phaser.Scene,
  index: string
): Promise<void> {
  try {
    const res = await fetch(`/assets/pokemons/${index}.json`)
    if (!res.ok) {
      throw new Error(`Pokemon atlas JSON ${index} not found`)
    }
    const data = await res.json()
    const load =
      "i" in data && "a" in data
        ? loadCompressedAtlas(scene, index)
        : loadStandardAtlas(scene, index)
    await withTimeout(load, ATLAS_LOAD_MS, `Atlas ${index}`)
  } catch (err) {
    delete lazyLoadingRequests[index]
    throw err
  }
}
