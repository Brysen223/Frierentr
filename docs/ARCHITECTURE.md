# Architecture

## The guiding boundary

Frieren is two gameplay modes sharing one game state:

```text
                  ┌────────────────────┐
                  │ Shared game state  │
                  │ player, saves, UI  │
                  └─────────┬──────────┘
                            │
             ┌──────────────┴──────────────┐
             │                             │
     ┌───────▼────────┐            ┌───────▼────────┐
     │   Overworld    │            │    Dungeons    │
     │ top-down rules │            │ side-view rules│
     └────────────────┘            └────────────────┘
```

The shared state allows progression, spells, health, and story flags to survive a mode transition. Movement, collision, camera behavior, encounter layout, and level data remain mode-specific.

## Source boundaries

### `src/main.js`

The only browser entry point. It should stay tiny and import the application runtime.

### `src/core/`

Code that genuinely belongs to both modes: startup, input, the main loop, shared combat primitives, HUD, save slots, character state, and transition coordination.

`runtime.js` still contains a large portion of the original prototype. Refactor it incrementally: extract one coherent system at a time and keep each extraction behavior-preserving.

### `src/overworld/`

Top-down world data and, over time, overworld systems. This includes towns, roads, world encounters, wagons, top-down collision, NPC interaction zones, and overworld rendering.

### `src/dungeons/`

Side-view level data and, over time, dungeon systems. This includes floors, platforms, spikes, gates, secrets, dungeon enemies, bosses, and side-view collision.

### `src/story/`

Narrative content without rendering or collision responsibilities: playable character definitions, dialogue, quest copy, cutscene lines, and story identifiers.

### `src/assets/`

The canonical code-facing asset registry. Gameplay modules consume named entries from `manifest.js`; they do not know physical file paths.

## Asset conventions

```text
assets/images/backgrounds/overworld/
assets/images/backgrounds/dungeons/
assets/images/characters/
assets/images/enemies/
assets/audio/music/
assets/audio/sfx/
```

Use lowercase kebab-case for new filenames. Existing animation sheets keep their current names until their metadata and references can be migrated together.

## Dependency direction

- `main` may import `core`.
- `core` may coordinate all feature areas.
- `overworld` and `dungeons` may import shared utilities, story content, and the asset manifest.
- `overworld` must not import `dungeons`.
- `dungeons` must not import `overworld`.
- `story` and `assets` must not import gameplay modes.

If two modules need each other, their shared concept probably belongs in `core`.

## Next extractions

The safest order for shrinking `core/runtime.js` is:

1. Input and math utilities.
2. Save-slot serialization.
3. Dialogue and menu presentation.
4. Shared spell and projectile combat.
5. Overworld update/render functions.
6. Dungeon update/render functions.

Each extraction should be independently testable and committed separately.
