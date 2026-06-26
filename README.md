# Frieren Spell-Grimoire Proof of Concept

This is a same-night playable vertical slice for the pitch:

> Most gameplay feels like a compact Elden Ring overworld, while dungeons switch into a Hollow Knight-like side-view format.

The browser version now uses a temporary generated mage sprite sheet. The art can be swapped later without changing the game loop.

The current direction is spell-first: grimoires are the main reward structure, Zoltraak is the starter spell, and open-world play should include helping people with collected magic instead of only fighting.

Heine is the first villager quest giver. He does not grant base Zoltraak; the player starts with a weak version. He rewards helpful spell use with the first grimoire upgrade.

## Run

Open `index.html` in a browser.

Controls:

- `WASD` or arrow keys: move
- `Space`: dodge in the overworld, jump in the dungeon
- After finding its hidden grimoire, hold `Space` while airborne: use brief `Flugmagie` glide/hover at MP cost
- `J`: cast Zoltraak
- `E`: interact with gates
- `R`: rest at the campfire

## Sprite Assets

Player sprite files live in `assets/sprites/`.

- `frieren-sprite-sheet-packed.png`: transparent 8-frame sheet used by the prototype
- `frieren-sprite-sheet.json`: frame names, frame size, and pivot metadata
- Frames: `idle_front`, `walk_1` through `walk_4`, `ready`, `aim_zoltraak`, `cast_zoltraak`

## Proof-of-Concept Loop

1. Start in `Heiterfeld` with weak Zoltraak.
2. Talk to Heine and help him by clearing cursed bramble with Zoltraak.
3. Collect `Kleines Zauberbuch: Zoltraak Formel I`.
4. Use the upgraded spell at `Mondbrunnen` to defeat `Der Schatten`.
5. Interact with the gate to enter `Hohlgrund`.
5. Dungeon movement changes to side-view platforming.
6. Descend through three dungeon layers, searching cracked walls and hidden loot.
7. Defeat the `Ritter von Hohlgrund` in the deepest reliquary.
8. Learn `Mikheit`, the 99%-accurate treasure chest analysis spell.
9. Decide whether to trust Mikheit's mimic warning or risk the final chest.
10. Use the far gate to return to the overworld with a recovered relic state.

## Tonight Scope

Included:

- Top-down overworld navigation
- Stamina dodge
- Shared health, stamina, and mana bars
- Starting Zoltraak spell with weak range and power
- Hidden demon-derived `Flugmagie` grimoire found behind a cracked passage
- Limited Flugmagie hover/glide that burns the full MP bar over its short duration and can cushion hard landings
- Inventory weight scaffold that can make movement magic more costly
- Playable mage sprite sheet with idle, walk, aim, and cast frames
- Grimoire pickup that improves Zoltraak range, power, and mana capacity
- Dialogue with the first villager quest giver
- One non-combat spell-use objective in the overworld
- Basic enemy chase and contact damage
- Portal transition between gameplay modes
- Side-view platforming dungeon
- Three-layer dungeon descent: `Moss Gallery`, `Echo Cistern`, and `Sunless Reliquary`
- Hidden Zoltraak-breakable dungeon passages
- Optional chests with randomized-feeling loot upgrades
- Harder and more varied beasts on deeper dungeon layers
- Grounded dungeon mobs that fall and land on platforms
- Boss reward spell: `Mikheit`
- Final always-mimic chest with a player choice to risk the one percent or return safely
- Hazards, dungeon enemies, mini-boss, and completion state

Not included yet:

- Inventory
- Dialogue
- Save/load
- Quest journal
- Equipment stats
- Multiple spell types
- Branching grimoire reward tables
- Full procedural room graph generator
- Dungeon minimap and fog of war
- Real asset pipeline
- Full enemy movesets
- Camera lock-on

## Unreal Engine Implementation Plan

Keep the prototype split into systems that match Unreal ownership:

- `BP_GameMode_Prototype`: owns current mode, win state, and level flow.
- `BP_PlayerState_Mage`: owns shared HP, stamina, mana, relics, and progression flags.
- `BP_OverworldPawn`: top-down movement, dodge, spell traces/projectiles, field camera.
- `BP_DungeonPawn`: side-view movement, jump, platform collision, dungeon camera.
- `BP_FlugmagieMovement`: airborne glide/hover movement mode that unlocks from a grimoire, drains mana, respects carry weight, and does not remove fall damage.
- `BP_ModePortal`: detects interaction and requests mode changes.
- `BP_SpellComponent`: known spells, cooldowns, mana costs, projectile spawning, spell upgrades.
- `BP_CombatComponent`: damage events, invulnerability windows, hit reactions.
- `BP_EnemyBase`: shared health, hit reaction, death event.
- `BP_FieldEnemy` / `BP_DungeonEnemy` / `BP_BossKnight`: mode-specific AI behavior.
- `BP_GrimoirePickup`: grants stat boosts, spell boosts, or new spells.
- `BP_DungeonLayer`: owns one generated floor, enemy table, secrets, chests, descent, and exit.
- `BP_SecretPassage`: breakable or revealable passage, usually opened by a spell condition.
- `BP_LootChest`: grants stat boosts, spell boosts, consumables, or lore items from a weighted table.
- `DA_SpellDefinition`: equivalent of Zoltraak's range, power, mana cost, speed, and upgrade data.
- `DA_GrimoireDefinition`: defines reward type: stat boost, spell boost, or new spell.
- `DA_LevelDefinition`: data asset equivalent of the JavaScript `overworldData` and `dungeonData` objects.

Recommended Unreal path:

1. Create a small persistent level with streaming sublevels: `Heiterfeld_POC` and `Hohlgrund_POC`.
2. Keep one player state, but swap pawn classes when entering or exiting a dungeon.
3. Use Enhanced Input with shared actions: `Move`, `CastSpell`, `Interact`, `DodgeOrJump`, `Rest`, `CycleSpell`.
4. Use SpringArm camera presets: top-down chase for overworld, orthographic/side camera for dungeon.
5. Implement Zoltraak as a projectile or short beam first, then move timing into animation notifies later.
6. Build the map from reusable level blocks before doing art passes.

## Design Notes

This should not try to be a full Elden Ring clone. The useful idea is contrast:

- Overworld: readable exploration, people with spell-solvable problems, landmarks, optional encounters.
- Dungeon: tighter routes, platform timing, hazards, locked gates, sharper enemy arenas.
- Dungeon exploration: every descent should have a main path, visible side path, hidden passage, and at least one loot reward worth searching for.
- Platforming should be forgiving, but not trivial: `Flugmagie` is brief, weight-sensitive, and learned from a hidden grimoire.
- Grimoires: the main reward language. A grimoire should grant either a stat boost, a spell boost, or a new spell.
- Naming: prefer German-flavored names such as `Heiterfeld`, `Mondbrunnen`, `Hohlgrund`, `Ritter`, `Zauberbuch`, and character names like `Heine`.

The key proof is that one character can carry persistent state between two different movement models without the whole project splitting into two unrelated games.
