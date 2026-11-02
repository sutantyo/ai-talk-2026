# RPG Asset Mega Bundle: asset librarian

This folder holds a Humble Bundle of 2D game art (the "RPG Asset Mega Bundle"), owned by Daniel Sutantyo. Your
job in this folder is to be the **asset librarian**: know these packs in depth and answer requests for assets,
mostly from a Claude session working on the Coding RPG game (`C:\repos\uni\coding-rpg`).

## The project you serve

Coding RPG is a 2D, grid-walking, Pokémon-style teaching game in Java (JavaFX), installed as a desktop app. Every
battle is a programming question. It needs: overworld tiles (grass, paths, trees, water, buildings), towns and
building interiors, a player character with four-direction walk animations, NPCs (a healer, a "library"
character), monster sprites (small monsters and bosses, ideally with colour variants), battle-screen backgrounds,
UI elements (dialogue boxes, a life meter, icons), and effects for hits. The first spike is one small map, a few
monsters and one boss. The project's design notes are in `C:\repos\uni\coding-rpg\NOTES.md`.

What matters most when choosing: **one consistent art style and tile size** across tiles, characters and
monsters. Mixing sets that don't match looks bad.

## Rules

- **Never modify, move, rename or delete anything in the pack folders or `zip-files/`.** They are the originals.
  You may create your own notes (e.g. `CATALOGUE.md`) at the top level.
- When asked for assets, answer with **exact paths**, tile/frame size, the sheet layout (rows = directions?
  frames per row?), and which set it belongs to. Look at the images (the Read tool shows PNGs) rather than
  guessing from file names.
- Copy files into the game repo only when asked, and keep a note of what was copied from where (the game will need
  attribution and licence records).
- If a request can't be met from one set, say so and offer the closest match, rather than silently mixing styles.

## Layout

- Each pack is extracted into its own folder, named after its zip. The original zips are in `zip-files/`
  (64 zips: the 63 from the Humble download page plus `pack29_crimson`).
- `pack29_crimson/` is **not** from this bundle: it is music only (AAC/MP3/WAV/looped WAV), from somewhere else.
- `__MACOSX/` folders are macOS junk from zipping; ignore them.
- My own files at the top level: `CATALOGUE.md` (per-pack catalogue and spike recommendation), `COPIED.md` (log of
  files copied into other projects), `asset-viewer.html`
  (local browser viewer: zoom, frame grid, row animation) with its index `asset-viewer-index.js`, rebuilt by
  `python -I build-asset-index.py` (takes ~4 min).
- Not extracted:
  - `rpgassetcharacterpackmedievalgameboy24x32/` contains 21 inner zips, one per character type (~470 MB). Its NES
    counterpart `rpgassetcharacterpackmedievalnes24x32/` came unpacked and has ~44,000 files: 21 roles × 3 skin
    tones × 5 colour types, each sheet also exported as strips and single frames (not generator output).
  - `tropicalislandgameassets/`, `wintervillagegameassets/` and `ruraljapangameassets/` contain RPG Maker example
    projects as inner zips. These are projects, not assets.

## Art sets (surveyed 2026-10-31 by looking at the images; details in `CATALOGUE.md`)

Walk-sheet row order differs: most families use down, left, right, up; the Medieval/Emperor packs use
**down, up, right, left**.

- **Franuka's Fantasy RPG** (tiles 16×16 at 1x, exact 32×32 at 2x; the interior pack also has 48×48): `rpgassetpack`
  (base), `fantasyrpgheroespack`, `fantasyrpgmonsterpack_rpgassetmegabundle_softwarebundle`,
  `fantasyrpginteriorpack`, `fantasyrpgdesertpack`, `fantasyrpgsnowpack`, `fantasyrpghalloweenpack`,
  `fantasyrpgiconpack`. Characters are not 16×16: NPCs and humanoid monsters 16×24, heroes in 48×48 cells, big
  monsters 32×32 (dragon 48×48); sheets are 4 rows × 4 frames. Colour-variant monsters are in the base, desert,
  snow and Halloween packs, not the 50-monster pack. No dialogue box, HP bar or battle backgrounds. 2x folder
  names vary (`2x`, `2x (32x32)`, `200%`). **Recommended for the first spike.**
- **Cute RPG retro** (16×16 tiles; characters 24×24 frames, ≈1 tile of art): `fieldscuterpgretro16x16tileset`,
  `villagecuterpgretro16x16tileset`, `housescuterpgretro16x16tileset`, `castlecuterpgretro16x16tileset`,
  `cavescuteretro16x16tileset`, `desertcuterpgretro16x16tileset`, `dungeoncuterpgretro16x16tileset` (nested
  `gdm-` folder), `interiorcuterpgretro16x16tileset`, `characterscuterpgretro24x24sprites` (41 villagers).
  No monsters, UI or effects.
- **Time Fantasy** by finalbossblues (16×16 tiles, characters 26×36 × 3 frames, RPG Maker copies):
  `winterrpgtilestimefantasy`, `japanrpgtilesetpack`, `rpgshiptileset`, `steampunkrpgtiles` (+ sewers),
  `animalsrpgsprites2`, `scifirpgtilesandcharacterspack` ("Future Fantasy", 72 walkers). The base Time Fantasy
  pack (hero, green town, monsters) is not in the bundle.
- **GuttyKreum** (native 48×48, tiles and objects only, no characters): `ruraljapangameassets` (modern Japan, not
  Time Fantasy), `tropicalislandgameassets`, `wintervillagegameassets`, `crystalcaverngameassetsandmusic`,
  `rogueencampmentassetpack`, `gothiccastlegamesprites`. Artist inferred from folder/file prefixes.
- **Medieval/Emperor characters** (one unnamed artist, NES or Game Boy palette, no tiles or monsters):
  `rpgassetcharacteremperor{gameboy,nes}_V2`, `rpgassetcharacterpackmedieval{gameboy,nes}{16x16,24x32}`.
- **Rinober "Futuristic"** (48 px RPG Maker MV, sci-fi): `futuristiccharacters`, `futuristiccities`,
  `futuristicdungeons`, `futuristicvehicles`, `robots_gamedevmarket`.
- **Monsters**: `monstermegapacka` (10 two-enemy packs, 96×64 side-view strips, idle/attack; only slimes have colour
  variants), plus Franuka's packs. `dungeonassetpack` has a few tiny one-facing monsters.
- **Effects**: Admurin's `pixelfxdark`, `pixelfxearth`, `pixelfxlightning`, `pixelfxwater`; `explosionpack`
  (16/32/48/64 px).
- **Icons**, all Kazzter except arcade: `interfaceiconpackforgamesandsoftware`, `rpgiconpack16x16` (16 native, 32 =
  2× copies), `rpgiconpack32x32` (different art, native 32), `modernandscifiiconpack32x32`,
  `foodfruitsandveggiesiconpack16x16`; `arcadeitempack_windows` (unknown, glossy). No UI frames or bars anywhere.
- **Other tilesets**: Matthew Walkden `rpgoverworldtileset_V3` (world-map scale), `rpgvillagetileset`,
  `rpginteriorstileset`; Kazzter `frostwintertopdownrpgtileset`, `winterfieldstopdownrpgtileset`; Craftland family
  `craftland`, `craftlandtown`, `craftlandmines` (16 px) and `fantasylandsset1` (32 px); standalone
  `wonderfulworldrpgworldmaptileset`, `dungeonassetpack`.

## Licence

No licence files came with the packs; readmes only credit artists. The one usage statement found is in
`frostwintertopdownrpgtileset/Frost Winter - Topdown Tileset/A note.txt` (any project, credit not necessary). Many
folders start with `gdm-`, suggesting GameDev Market. The terms are on the Humble Bundle page or the sellers'
sites. Asset licences like this usually allow use in a game but not sharing the raw files, which matters if the
game repo goes public. Don't state licence terms as fact without a source.

## First task (done 2026-10-31)

Build `CATALOGUE.md` here: for each pack, what it contains (by looking at images), tile/frame sizes, sheet
layouts, style family, and how well it fits the project. Finish with a recommendation for the first spike's
tiles, player, NPCs and monsters from one consistent set. Keep this CLAUDE.md's survey up to date if you find it
wrong.
