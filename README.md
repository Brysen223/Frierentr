# Frieren: Spell-Grimoire

A browser-based action RPG prototype built around two connected styles of play:

- **Overworld:** top-down exploration, quests, travel, and spell-based problem solving.
- **Dungeons:** side-view platforming, combat, secrets, bosses, and grimoire rewards.

Both modes share one character, one progression state, and one story.

## Quick start

The game uses JavaScript modules, so run it through the included local server:

```powershell
.\scripts\start.ps1
```

Then open [http://127.0.0.1:49217](http://127.0.0.1:49217).

Python 3 is the only local requirement. On Windows, `scripts\start.bat` is also available.

## Controls

| Input | Action |
| --- | --- |
| `WASD` / arrow keys | Move |
| `Space` | Dodge in the overworld; jump in dungeons |
| Hold `Space` in air | Use Flugmagie after unlocking it |
| `J` | Cast or attack |
| `E` | Interact |
| `R` | Rest at a campfire |

## Project map

```text
Frieren/
├── assets/
│   ├── audio/
│   │   ├── music/
│   │   └── sfx/
│   ├── images/
│   │   ├── backgrounds/
│   │   │   ├── dungeons/
│   │   │   └── overworld/
│   │   ├── characters/
│   │   └── enemies/
│   └── CREDITS.md
├── docs/
│   └── ARCHITECTURE.md
├── scripts/
│   ├── start.bat
│   └── start.ps1
├── src/
│   ├── assets/       # Canonical asset paths
│   ├── core/         # Shared runtime, input, combat, save system, and rendering
│   ├── dungeons/     # Side-view dungeon definitions
│   ├── overworld/    # Top-down world definitions
│   ├── story/        # Characters and dialogue
│   └── main.js       # Application entry point
├── CONTRIBUTING.md
├── index.html
└── styles.css
```

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before moving code across these boundaries.

## Branches

- `main` is the stable integration branch.
- `brysen` is Brysen's working branch.
- `dakota` is Dakota's working branch.

Make focused commits on the appropriate personal branch. Merge into `main` only after the game starts, the browser console is clean, and both gameplay modes still load.

## Current game loop

1. Explore Heiterfeld and help Heine with cursed bramble.
2. Upgrade Zoltraak and defeat the shade at Mondbrunnen.
3. Enter Hohlgrund and switch to side-view dungeon movement.
4. Search layered dungeons for passages, loot, bosses, and grimoires.
5. Carry the resulting progression back into the overworld.

## Status

This is a playable prototype, not a finished release. The immediate architectural goal is to make parallel work safe while the shared runtime is gradually divided into smaller systems.
