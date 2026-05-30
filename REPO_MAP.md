# Repository File Map

High-signal paths for **Pokemon Auto Chess**. Omitted: thousands of per-Pokémon assets, changelog markdown, and generated `dist/` binaries.

```
pokemonAutoChess/
├── package.json                    # Root deps, scripts (dev, build, assetpack)
├── esbuild.js                      # Client bundle: index.tsx → dist/client
├── tsconfig.json                   # Server + app TypeScript
├── PROTOTYPE_PLAN.md               # Master findings (this doc set)
├── REPO_MAP.md
├── STARTUP_FLOW.md
├── PROTOTYPE_WASD_PLAN.md
├── ASSET_PIPELINE.md
│
├── prototype-wasd/                 # Standalone Phaser WASD demo (isolated)
│   ├── index.html
│   ├── vite.config.ts              # Serves parent /assets via middleware
│   ├── package.json
│   └── src/
│       ├── main.ts                 # Phaser.Game boot
│       ├── WasdScene.ts            # Map + Swablu + WASD + camera
│       ├── loadPokemonAtlas.ts
│       ├── pokemonAnims.ts
│       └── orientation.ts
│
├── edit/
│   ├── assetpack/                  # BUILD: Pixi AssetPack pipeline
│   │   ├── .assetpack.js
│   │   ├── assetpack-cli-fork/
│   │   └── plugin-texture-packer-fork/
│   └── add-pokemon.ts              # Tooling: add species
│
├── gen/                            # CSV export, label checks
├── db-commands/                    # One-off Mongo migrations
│
└── app/
    ├── index.ts                    # SERVER ENTRY: Colyseus listen()
    ├── app.config.ts               # Express + defineServer rooms + static client
    ├── config/                     # Game balance, regions, shop
    ├── metrics.ts
    │
    ├── public/
    │   ├── views/
    │   │   └── index.html          # CLIENT HTML SHELL
    │   ├── dist/
    │   │   └── client/             # Built JS/CSS + assets (gitignored assets/)
    │   └── src/
    │       ├── index.tsx           # CLIENT ENTRY: React Router
    │       ├── network.ts          # Colyseus Client, Firebase auth, joinGame
    │       ├── i18n.ts
    │       ├── preferences.ts
    │       ├── stores/             # Redux (game, network, boosters)
    │       │
    │       ├── pages/              # UI (React)
    │       │   ├── auth.tsx
    │       │   ├── lobby.tsx
    │       │   ├── preparation.tsx
    │       │   ├── game.tsx        # Mounts GameContainer + Colyseus hooks
    │       │   ├── after-game.tsx
    │       │   └── component/
    │       │       ├── game/       # Shop, meters, sidebars
    │       │       ├── auth/
    │       │       ├── lobby/
    │       │       ├── preparation/
    │       │       ├── debug/      # DebugScene React wrapper
    │       │       └── ...
    │       │
    │       ├── game/               # RENDERING + INPUT (Phaser client)
    │       │   ├── game-container.ts    # Phaser.Game, Colyseus listeners
    │       │   ├── animation-manager.ts
    │       │   ├── depths.ts
    │       │   ├── lobby-logic.ts
    │       │   ├── scenes/
    │       │   │   ├── game-scene.ts      # Main match scene
    │       │   │   ├── debug-scene.ts
    │       │   │   └── preloading-scene.ts
    │       │   ├── components/
    │       │   │   ├── pokemon.ts         # PokemonSprite + loadCompressedAtlas
    │       │   │   ├── pokemon-avatar.ts  # Town avatars
    │       │   │   ├── board-manager.ts
    │       │   │   ├── battle-manager.ts
    │       │   │   ├── loading-manager.ts # Asset preload queue
    │       │   │   ├── minigame-manager.ts
    │       │   │   ├── weather-manager.ts
    │       │   │   └── ...
    │       │   └── plugins/
    │       │       └── animated-tiles-plugin.ts
    │       │
    │       └── assets/             # SOURCE ART (see ASSET_PIPELINE.md)
    │           ├── pokemons/       # *.json + *.png per index (e.g. 0333)
    │           ├── tilesets/       # Town/, dungeons, ...
    │           ├── atlas.json      # abilities, attacks, item packs
    │           ├── environment/
    │           ├── abilities{tps}/
    │           ├── portraits/
    │           └── ui/
    │
    ├── rooms/                      # NETWORKING (Colyseus)
    │   ├── game-room.ts            # Match room + loading gate
    │   ├── preparation-room.ts
    │   ├── custom-lobby-room.ts
    │   ├── after-game-room.ts
    │   ├── commands/               # game-commands, preparation-commands
    │   └── states/                 # @colyseus/schema GameState, etc.
    │
    ├── core/                       # BATTLE LOGIC (server-authoritative sim)
    │   ├── simulation.ts
    │   ├── pokemon-entity.ts
    │   ├── mini-game.ts            # Town Matter.js physics
    │   ├── design.ts               # Tilemap JSON loaders
    │   ├── abilities/
    │   ├── effects/
    │   └── evolution-logic/
    │
    ├── models/                     # DATA MODELS
    │   ├── colyseus-models/        # Synced room entities
    │   ├── mongo-models/           # Persistence
    │   ├── precomputed/            # Pokémon stats
    │   └── pokemon-factory.ts
    │
    ├── services/                   # API, cron, meta, leaderboard, twitch
    ├── types/                      # Enums, Transfer messages, interfaces
    └── utils/                      # orientation, logger, schemas, ...
```

---

## Category index

### 1. Rendering

| Path | Notes |
|------|-------|
| `app/public/src/game/` | All Phaser gameplay |
| `app/public/src/game/scenes/game-scene.ts` | Tilemaps, board, town minigame |
| `app/public/src/game/components/pokemon.ts` | Sprite entities |
| `app/public/src/game/animation-manager.ts` | Animation registration |
| `app/public/src/game/game-container.ts` | `Phaser.Game` instance |
| `prototype-wasd/src/WasdScene.ts` | Isolated render loop |

### 2. Input

| Path | Notes |
|------|-------|
| `app/public/src/game/scenes/game-scene.ts` | `registerKeys()`, pointer drag/drop |
| `app/public/src/game/components/pokemon-avatar.ts` | Emote keys |
| `app/public/src/preferences.ts` | Keybinding prefs |
| `app/core/mini-game.ts` | Server town movement |
| `prototype-wasd/src/WasdScene.ts` | WASD via `addKey(KeyCodes.*)` |

### 3. Assets

| Path | Notes |
|------|-------|
| `app/public/src/assets/` | Source art |
| `app/public/dist/client/assets/` | Built output (served at `/assets/`) |
| `edit/assetpack/` | Build pipeline |
| See [ASSET_PIPELINE.md](./ASSET_PIPELINE.md) | |

### 4. Networking

| Path | Notes |
|------|-------|
| `app/index.ts` | Server boot |
| `app/app.config.ts` | Room definitions |
| `app/rooms/*.ts` | Room logic |
| `app/public/src/network.ts` | Browser Colyseus client |
| `app/public/src/pages/game.tsx` | Game room UI wiring |

### 5. Battle logic

| Path | Notes |
|------|-------|
| `app/core/simulation.ts` | Combat simulation |
| `app/core/pokemon-entity.ts` | Battle entities |
| `app/rooms/commands/game-commands.ts` | Shop, drag-drop, etc. |
| `app/public/src/game/components/battle-manager.ts` | Client battle VFX |

### 6. UI

| Path | Notes |
|------|-------|
| `app/public/src/index.tsx` | React entry |
| `app/public/src/pages/` | Route pages |
| `app/views/index.html` | DOM mount points `#root`, `#modal-root` |

### 7. Data models

| Path | Notes |
|------|-------|
| `app/models/colyseus-models/` | `Player`, `Pokemon`, etc. |
| `app/rooms/states/` | `GameState`, `LobbyState` |
| `app/types/enum/` | `Pokemon.ts`, `Game.ts`, `Item.ts` |
| `app/models/precomputed/` | Static Pokémon data |

### 8. Build system

| Path | Notes |
|------|-------|
| `esbuild.js` | Client bundle |
| `tsconfig.json` → `app/public/dist/server/` | Server compile |
| `package.json` scripts | `dev`, `build`, `assetpack` |
| `edit/assetpack/.assetpack.js` | Asset pipeline config |
| `prototype-wasd/vite.config.ts` | Prototype dev server |

---

## Key file quick reference

| Question | File |
|----------|------|
| Where is React mounted? | `app/public/src/index.tsx` |
| Where is Phaser created? | `app/public/src/game/game-container.ts` |
| Where is the main scene? | `app/public/src/game/scenes/game-scene.ts` |
| Where are assets preloaded? | `app/public/src/game/components/loading-manager.ts` |
| Where is multiplayer gated? | `app/rooms/game-room.ts` + `GameScene.preload()` |
| Swablu sprite index? | `0333` in `app/types/enum/Pokemon.ts` |
| Town map? | `app/public/src/assets/tilesets/Town/` |
