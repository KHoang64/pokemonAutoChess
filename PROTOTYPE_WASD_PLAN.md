# PROTOTYPE_WASD Plan

Design and implementation reference for [`prototype-wasd/`](./prototype-wasd/) — a minimal Phaser-only slice of Pokemon Auto Chess.

**Related:** [PROTOTYPE_PLAN.md](./PROTOTYPE_PLAN.md) · [ASSET_PIPELINE.md](./ASSET_PIPELINE.md) · [prototype-wasd/README.md](./prototype-wasd/README.md)

---

## Goals

| Requirement | Status |
|-------------|--------|
| Phaser only for gameplay | Done |
| Existing Pokémon sprite assets | Swablu `0333` |
| One map/background | Treasure Town |
| WASD movement | Done |
| Camera follow | `startFollow` |
| No Colyseus | Done |
| No Firebase | Done |
| No server loading gate | Done |
| No battle/shop/lobby/multiplayer | Done |
| Minimal React | None (plain HTML) |

**Constraint:** Do not modify `app/` main game files; prototype is a sibling folder.

---

## Folder layout

```
prototype-wasd/
├── index.html              # <div id="game">
├── package.json            # phaser + vite
├── vite.config.ts          # Parent asset middleware
├── tsconfig.json
├── README.md
└── src/
    ├── main.ts             # Phaser.Game
    ├── WasdScene.ts        # Single scene
    ├── loadPokemonAtlas.ts # Compressed + standard atlas loaders
    ├── pokemonAnims.ts     # Idle/Walk facing anims
    └── orientation.ts      # 8-direction enum
```

---

## Assets used

### Map — Treasure Town

| Item | Source path | URL at runtime |
|------|-------------|----------------|
| Tilemap | `app/public/src/assets/tilesets/Town/town.json` | `/assets/tilesets/Town/town.json` |
| Tileset | `app/public/src/assets/tilesets/Town/tileset.png` | `/assets/tilesets/Town/tileset.png` |
| Phaser keys | `town`, `town_tileset` | |
| Layers | `layer0`, `layer1`, `layer2` | Scale **2×** |

**Dimensions:** 50×32 tiles × 24px → 1200×768 logical → **2400×1536** displayed.

**Reference implementation:** `GameScene.setMap("town")` in `app/public/src/game/scenes/game-scene.ts`.

### Pokémon — Swablu

| Item | Value |
|------|-------|
| Species | Swablu |
| Index | **`0333`** (`Pkm.SWABLU` → `"0333"` in `app/types/enum/Pokemon.ts`) |
| JSON | `app/public/src/assets/pokemons/0333.json` |
| PNG | `app/public/src/assets/pokemons/0333.png` |
| Format | **Standard** Phaser multiatlas (`textures[].frames[]`) |
| Fallback | `0000` MissingNo (compressed `{i,s,a}` after assetpack) |

**Preload in scene:**

```typescript
this.load.multiatlas(
  "0333",
  "/assets/pokemons/0333.json",
  "/assets/pokemons/"
)
```

---

## Code to reference (do not import directly)

Copy patterns, not whole modules — main-game files pull Colyseus, Firebase, Redux.

| Purpose | Source file | What to take |
|---------|-------------|--------------|
| Town load | `loading-manager.ts` L42–43 | `load.image` + `load.tilemapTiledJSON` |
| Town draw | `game-scene.ts` `setMap()` town branch | `add.tilemap`, layers, scale 2 |
| Compressed atlas | `pokemon.ts` `loadCompressedAtlas()` | JSON `{i,s,a}` → multiatlas |
| Animation keys | `animation-manager.ts` | `{index}/{tint}/{action}/Anim/{direction}` |
| Orientation | `app/types/enum/Game.ts` | `Orientation` enum |
| Phaser boot | `debug-scene.tsx` | Minimal `Phaser.Game` config |

### Ignore entirely

| Category | Paths |
|----------|-------|
| Networking | `app/index.ts`, `app/rooms/`, `network.ts` |
| Loading gate | `GameScene.preload` LOADING handlers, `game-room.ts` |
| Firebase | `pages/auth/`, Firebase in `game-scene.ts` |
| React UI | `pages/`, `stores/`, `index.tsx` |
| Battle | `battle-manager.ts`, `simulation.ts`, `game-commands.ts` |
| Town multiplayer | `mini-game.ts`, `minigame-manager.ts`, `pokemon-avatar.ts` |
| Full LoadingManager | Loads music, weather, all packs |

---

## Bypassing main-game gates

Main game chain (avoid):

```
GameScene.preload complete
  → client send LOADING_COMPLETE
  → GameRoom waits all players 100%
  → broadcast LOADING_COMPLETE
  → GameScene.startGame()
```

Prototype chain:

```
WasdScene.preload (town + 0333)
  → WasdScene.create() immediately
  → map + player + camera + WASD
```

No `room.send`, no `room.onMessage`, no `GameContainer`.

---

## WASD movement (new code)

Main game has **no** WASD walking in TypeScript source. Prototype implements:

```typescript
this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
// A, S, D similarly

// update():
if (this.keyW.isDown) vy -= 1
if (this.keyS.isDown) vy += 1
// normalize diagonal, apply speed * delta/1000
// orientationFromVelocity(vx, vy) — screen Y flipped for atan2
```

**Bug fixed:** `addKeys("W,A,S,D")` returns `{ W, A, S, D }` uppercase — **not** `{ w, a, s, d }`. Using wrong casing crashed `update()` → black screen.

---

## Camera follow

Main game: manual pan/zoom only (`GameScene.setupCamera()`).

Prototype:

```typescript
cam.setBounds(0, 0, mapWidth * 2, mapHeight * 2)
cam.centerOn(startX, startY)
cam.startFollow(this.player, true, 0.12, 0.12)
```

Spawn at **map center** (`widthInPixels * MAP_SCALE / 2`).

---

## Asset serving (Vite)

`vite.config.ts` resolves `/assets/*` in order:

1. `prototype-wasd/public/assets/`
2. `app/public/dist/client/assets/`
3. `app/public/src/assets/`

No copy step required for local dev if parent assets exist.

---

## Run locally

```bash
# From repo root (optional, for full asset tree)
npm install
npm run assetpack

# Prototype
cd prototype-wasd
npm install
npm run dev
# → http://localhost:5173
```

**Windows note:** If PowerShell blocks `npm`, use `npm.cmd install` and `npm.cmd run dev`.

### HUD lines

```
Map: Treasure Town
Sprite: Swablu (0333)
WASD move · camera follows
```

If PNGs missing: flat green/blue fallback + placeholder sprite; HUD explains state.

---

## Implementation history / lessons

| Issue | Cause | Fix |
|-------|-------|-----|
| Stuck "Loading…" | `async create()` awaited atlas | Sync `create`, preload Swablu |
| ¼ map visible | Camera never followed (create hung) | Center spawn + `startFollow` |
| Black screen | `cursors.w` undefined | `addKey(KeyCodes.W)` |
| Atlas timeout | Loader busy / wrong events | `ensureLoaderIdle`, `filecomplete-multiatlas-*` |
| Wrong Pokémon | Pillar Wood / MissingNo first | **Swablu `0333` default** |

---

## Future extensions (out of scope)

- [ ] Self-contained `public/assets/` copy for deploy without parent repo
- [ ] Walk animation tuning from `durations.json`
- [ ] Collision layer from town tilemap
- [ ] Arrow keys in addition to WASD
- [ ] Port town click-to-move from `mini-game.ts` for comparison

---

## Build for production

```bash
cd prototype-wasd
npm run build   # → prototype-wasd/dist/
npm run preview
```

Copy required assets into `prototype-wasd/public/assets/` for hosting without parent paths.
