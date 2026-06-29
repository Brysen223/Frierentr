# Contributing

## Branch workflow

1. Start from your personal branch: `brysen` or `dakota`.
2. Pull or merge the latest local `main` before beginning a new chunk of work.
3. Keep each commit focused on one feature or fix.
4. Run the game locally and check the browser console before merging.
5. Merge completed work into `main`; do not develop directly on `main`.

No branch is permanently assigned to a gameplay mode. Coordinate ownership before editing shared files.

## Ownership boundaries

| Area | Location | Put these changes here |
| --- | --- | --- |
| Shared runtime | `src/core/` | Input, game loop, common combat, saves, shared rendering |
| Overworld | `src/overworld/` | Top-down maps, encounters, travel, overworld-only rules |
| Dungeons | `src/dungeons/` | Side-view floors, platforms, hazards, dungeon-only rules |
| Story | `src/story/` | Characters, dialogue, quest text, cutscene copy |
| Asset paths | `src/assets/manifest.js` | Every image, sound, and music path used by code |
| Art and audio | `assets/` | Source game media, sorted by type and gameplay area |

## Rules that prevent merge-conflict soup

- Do not hard-code an asset path in gameplay code. Add it to `src/assets/manifest.js`.
- Do not put dialogue inside rendering or collision functions.
- Keep overworld-only data out of `src/dungeons/`, and vice versa.
- Shared code belongs in `src/core/` only when both modes actually use it.
- Update `docs/ARCHITECTURE.md` when adding a new system or top-level folder.
- Never commit local editor settings, logs, or generated dependency folders.

## Definition of done

- The local server starts.
- The start menu renders.
- A new save can be created.
- Overworld movement works.
- A dungeon transition works.
- The browser console has no new errors.
