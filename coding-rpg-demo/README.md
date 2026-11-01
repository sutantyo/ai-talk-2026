# Coding RPG demo

A browser port of the Coding RPG prototype (the Java/JavaFX original is in `C:\repos\uni\coding-rpg`).
It's a small grid world where every battle is a programming question, aimed at first-year students.

**Run:** double-click `index.html`. You don't need a server or an install, and it works offline. Open
`index.html?new` to start over with a fresh save.

**Keys**

| Where | Keys |
|---|---|
| Walking around | Arrows or WASD to walk, Enter to talk, B for the monster book |
| In a battle | 1–4 (or click) to answer, Enter to continue, Esc to run away (before the fight only) |

**What's in it**

- **Monsters:** three monsters in the tall grass, and the Branching Ogre boss at the east end of the road.
- **Questions:** 27 multiple-choice questions for area 1, covering arithmetic, booleans, syntax errors and if/else.
- **Boss gate:** the boss fights only once you've answered 14 of the 20 ordinary questions correctly at least once.
- **Spaced repetition:**
  - A right answer moves the question up a level, or two levels if you answered in 20 seconds or less.
  - A wrong answer resets it and costs a heart.
  - Questions come back for review at intervals.
- **Saving:** the game saves automatically in the browser's localStorage.

**Files**

| File | What it is |
|---|---|
| `game.js` | All the code |
| `index.html`, `style.css` | The page and its styles |
| `content.js`, `map.js` | The questions and the map, generated from the Java project by `build-data.sh` |
| `assets/` | Franuka's art from the RPG Asset Mega Bundle; sources are in `assets/SOURCES.md` |

**Licence:** the art came with no licence file. Don't push `assets/` to a public repo until Franuka's terms have been
checked.
