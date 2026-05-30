# prototype-wasd

Standalone Phaser demo: one town map, one Pokémon sprite, WASD movement, camera follow.

Does **not** import or modify the main game (`app/`). Assets are read from the parent repo at dev time.

## Prerequisites

Binary assets (PNG atlases, town tileset) are not fully committed to git. From the **repo root**:

```bash
npm install
npm run assetpack
```

Ensure these exist (at least one path):

- `app/public/dist/client/assets/tilesets/Town/tileset.png` + `town.json` (Treasure Town)
- `app/public/src/assets/pokemons/0333.png` + `0333.json` (**Swablu**, preloaded by default)
- or `0000.png` + `.json` (**MissingNo**, fallback)

The HUD shows which map and sprite actually loaded.

The dev server resolves `/assets/*` in order:

1. `prototype-wasd/public/assets/`
2. `app/public/dist/client/assets/`
3. `app/public/src/assets/`

If PNGs are missing, the prototype still runs with a flat green background and a placeholder sprite.

## Run

```bash
cd prototype-wasd
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Controls

- **W / A / S / D** — walk
- **Shift** (hold) — run (2× speed)
- **Scroll wheel down** — zoom in · **scroll up** — zoom out (0.5×–2×)
- **Swap Pokémon** (top-right) — pick from 8 species (Swablu, Altaria, Vespiquen, Rayquaza, Shelgon, Aron, Lanturn, Kyogre)
- Camera follows the player with smooth lerp

## Structure

```
prototype-wasd/
├── index.html          # mounts #game only (no React)
├── vite.config.ts      # serves parent /assets without copying
├── src/
│   ├── main.ts         # Phaser.Game boot
│   ├── WasdScene.ts    # map + player + WASD + camera
│   ├── loadPokemonAtlas.ts
│   ├── pokemonAnims.ts
│   └── orientation.ts
└── public/assets/      # optional local asset overrides
```

## Build for static hosting

```bash
npm run build
npm run preview
```

For production, copy required assets into `public/assets/` so the bundle is self-contained.
