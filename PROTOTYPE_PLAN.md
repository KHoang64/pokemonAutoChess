# Prototype Plan — Master Findings Document

This document consolidates architecture research, prototype goals, bugs discovered during `prototype-wasd` development, and pointers to detailed docs.

**Related documents:**

| Document | Purpose |
|----------|---------|
| [REPO_MAP.md](./REPO_MAP.md) | Categorized repository file tree |
| [STARTUP_FLOW.md](./STARTUP_FLOW.md) | Client + server boot through first rendered frame |
| [PROTOTYPE_WASD_PLAN.md](./PROTOTYPE_WASD_PLAN.md) | Standalone WASD prototype design and implementation |
| [ASSET_PIPELINE.md](./ASSET_PIPELINE.md) | How art becomes `/assets/*` at runtime |

---

## Executive summary

**Pokemon Auto Chess** is a **browser-based** fan game:

| Layer | Technology | Role |
|-------|------------|------|
| Game view | **Phaser 4** | Canvas/WebGL: board, maps, sprites, VFX |
| App shell | **React 19** | Routing, lobby, shop HUD, auth UI |
| Multiplayer | **Colyseus** | WebSocket rooms + synced state |
| Server | **Express 5** + Node | Static client, REST APIs, room hosting |
| Auth | **Firebase** | Login and profiles |
| Assets | **Pixi AssetPack** (build only) | Texture packing + compressed Pokémon atlases |

**Not used:** Electron, Pixi (runtime), native Canvas API for gameplay.

A minimal standalone slice lives in [`prototype-wasd/`](./prototype-wasd/) — Phaser only, no Colyseus/Firebase/React.

---

## Framework verification (evidence)

### Dependencies (`package.json`)

```json
"phaser": "^4.1.0",
"react": "^19.2.6",
"colyseus": "^0.17.10",
"@colyseus/sdk": "^0.17.42"
```

No `electron`, no `pixi` in root runtime dependencies. Pixi appears only under `edit/assetpack/`.

### Client entry

- HTML: [`app/views/index.html`](./app/views/index.html) → `#root`, deferred `index.js`
- Bundle entry: [`esbuild.js`](./esbuild.js) → [`app/public/src/index.tsx`](./app/public/src/index.tsx)
- React mounts after `i18n.on("initialized")` with `BrowserRouter` routes (`/game`, `/lobby`, etc.)

### Phaser boot (in-match)

- [`app/public/src/game/game-container.ts`](./app/public/src/game/game-container.ts) — `initializeGame()` → `new Phaser.Game({ scene: GameScene })`
- [`app/public/src/game/scenes/game-scene.ts`](./app/public/src/game/scenes/game-scene.ts) — key `"gameScene"`, extends `Phaser.Scene`

### Server entry

- [`app/index.ts`](./app/index.ts) — `listen(app)` from `@colyseus/tools`, creates `lobby` room, cron jobs

---

## Main game vs prototype

| Aspect | Main game (`/game`) | `prototype-wasd` |
|--------|---------------------|------------------|
| UI | React HUD + Phaser canvas | Plain HTML + Phaser only |
| Network | Colyseus `GameRoom` | None |
| Auth | Firebase | None |
| Loading | Server-gated `LOADING_COMPLETE` | Immediate `create()` |
| Movement | Board drag / town click-to-move (Matter.js server) | **WASD** (new code) |
| Camera | Manual pan/zoom | **`startFollow` player** |
| Map | Many dungeons + Treasure Town | **Town tileset only** |
| Pokémon | Dynamic per match | **Swablu (`0333`)** preloaded |

---

## Prototype goals (original requirements)

- Phaser only for gameplay
- Existing Pokémon sprite assets
- One existing map/background (Treasure Town)
- WASD movement + camera follow
- No Colyseus, Firebase, server gate, battles, shop, lobby, multiplayer
- Minimal or no React

**Implementation folder:** [`prototype-wasd/`](./prototype-wasd/) — see [PROTOTYPE_WASD_PLAN.md](./PROTOTYPE_WASD_PLAN.md).

---

## Bugs found and fixed during prototype work

### 1. HUD stuck on "Loading…"

**Cause:** `async create()` awaited Pokémon atlas load. If `0000.json` loaded but PNG hung, `create()` never finished — camera/player setup skipped.

**Fix:** Synchronous `create()` with placeholder sprite; async sprite swap optional. Preload Swablu in `preload()`.

### 2. Map looked like "¼ of Treasure Town"

**Cause:** Same hang — camera stayed at scroll `(0,0)` (top-left corner) instead of centering on player.

**Fix:** `centerOn` + `startFollow` in sync `create()`; spawn at map center.

### 3. Black screen

**Cause:** `addKeys("W,A,S,D")` returns `{ W, A, S, D }` but code used `cursors.w` → `undefined.isDown` crashed every `update()` frame.

**Fix:** `keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)` etc.

### 4. Atlas timeouts (0532 / 0000)

**Cause:** Loader busy after `preload`; wrong key names; compressed vs standard format mismatch.

**Fix:** `ensureLoaderIdle()` before secondary loads; preload `0333` standard multiatlas; Swablu first in candidate list.

---

## Pokémon / map choices

### Map — Treasure Town

| Asset | Path |
|-------|------|
| Tilemap JSON | `app/public/src/assets/tilesets/Town/town.json` |
| Tileset PNG | `app/public/src/assets/tilesets/Town/tileset.png` |
| Phaser keys | `town`, `town_tileset` |
| Layers | `layer0`, `layer1`, `layer2` at scale `2` |

Map size: **50×32** tiles, **24px** tile size → 1200×768 px, **2400×1536** displayed.

### Pokémon — Swablu

| Field | Value |
|-------|-------|
| Species | Swablu (`Pkm.SWABLU`) |
| Atlas index | **`0333`** (`app/types/enum/Pokemon.ts`) |
| Files | `app/public/src/assets/pokemons/0333.json`, `0333.png` |
| Format | Standard Phaser multiatlas JSON (not compressed `{i,s,a}`) |
| Fallback | `0000` MissingNo (compressed after assetpack) |

Earlier prototype versions tried `0532-0002` (Pillar Wood) and `0000` first — Swablu is the intentional default after user feedback.

---

## Keyboard / movement in main game

**Important:** Main TypeScript game has **no WASD walking**.

| Input | Location | Purpose |
|-------|----------|---------|
| Shop hotkeys | `GameScene.registerKeys()` | Sell, reroll, lock, XP, spectate |
| Emotes | `PokemonAvatar.registerKeys()` | Emote menu |
| Town movement | `pointerdown` → `Transfer.VECTOR` | Click-to-move; server `MiniGame` (Matter.js) |

WASD exists only in vendored Pokechess dist (`app/public/dist/client/pokechess/`), not in readable main-game source.

---

## What to read next

1. **Onboarding to repo layout** → [REPO_MAP.md](./REPO_MAP.md)
2. **Tracing boot and first frame** → [STARTUP_FLOW.md](./STARTUP_FLOW.md)
3. **Running / extending prototype** → [PROTOTYPE_WASD_PLAN.md](./PROTOTYPE_WASD_PLAN.md) + [`prototype-wasd/README.md`](./prototype-wasd/README.md)
4. **Missing PNGs / atlas formats** → [ASSET_PIPELINE.md](./ASSET_PIPELINE.md)

---

## Open items (not in prototype scope)

- Arrow-key movement in main game (would need new client + server or client-only mode)
- Camera follow in main game town (today: manual pan/zoom in `setupCamera()`)
- Self-contained `prototype-wasd` dist without parent asset paths (copy assets into `public/assets/` for deploy)

---

*Generated from codebase analysis and `prototype-wasd` iteration. Last aligned with repo layout as of documentation creation.*
