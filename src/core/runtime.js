import { ASSETS } from "../assets/manifest.js";
import { dist, TAU } from "./math.js";
import { CHARACTERS } from "../story/characters.js";
import { MIMIC_EXCUSES } from "../story/dialogue.js";
import {
  cabinInteriorData,
  castleInteriorData,
  castleInteriorWalls,
  levelOneData,
  mapData,
  overworldData,
} from "../overworld/data.js";
import {
  getWagonDestinations,
  moveWagonSelection,
  travelCost,
} from "../overworld/fast-travel.js";
import { cryptData, dungeonData, forestDungeonData } from "../dungeons/data.js";
const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const hud = {
  hp: document.querySelector("#hp-bar"),
  stamina: document.querySelector("#stamina-bar"),
  mana: document.querySelector("#mana-bar"),
  status: document.querySelector("#status-line"),
  gold: document.querySelector("#gold-line"),
  objective: document.querySelector("#objective"),
  title: document.querySelector("#objective-title"),
  copy: document.querySelector("#objective-copy"),
  toast: document.querySelector("#toast"),
  dialogue: document.querySelector("#dialogue"),
  dialogueName: document.querySelector("#dialogue-name"),
  dialogueCopy: document.querySelector("#dialogue-copy"),
  dialogueChoices: document.querySelector("#dialogue-choices"),
  dialoguePrompt: document.querySelector("#dialogue-prompt"),
  mimicQte: document.querySelector("#mimic-qte"),
  mimicQteBar: document.querySelector("#mimic-qte-bar"),
  letterboxTop: document.querySelector("#letterbox-top"),
  letterboxBottom: document.querySelector("#letterbox-bottom"),
  spellLearned: document.querySelector("#spell-learned"),
  spellName: document.querySelector("#spell-name"),
  spellDesc: document.querySelector("#spell-desc"),
};

const VIEW_W = 1280;
const VIEW_H = 720;
const input = { down: new Set(), tap: new Set() };
const playerSprite = new Image();
playerSprite.src = ASSETS.characters.frieren.packed;
const PLAYER_SPRITE = {
  frameW: 320,
  frameH: 384,
  pivotX: 160,
  pivotY: 332,
  frames: {
    idle: 0,
    walk: [1, 2, 3, 4],
    ready: 5,
    aim: 6,
    cast: 7,
  },
};

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function loadFrames(paths) {
  return paths.map(loadImage);
}

function imageReady(img) {
  return img.complete && img.naturalWidth > 0;
}

const BACKGROUNDS = {
  forestBack: loadImage(ASSETS.backgrounds.overworld.forestBack),
  forestMiddle: loadImage(ASSETS.backgrounds.overworld.forestMiddle),
  forestFront: loadImage(ASSETS.backgrounds.overworld.forestFront),
  forestLights: loadImage(ASSETS.backgrounds.overworld.forestLights),
  cryptMoon: loadImage(ASSETS.backgrounds.dungeons.cryptMoon),
  cryptMountains: loadImage(ASSETS.backgrounds.dungeons.cryptMountains),
  cryptGraveyard: loadImage(ASSETS.backgrounds.dungeons.cryptGraveyard),
  castleHallPanels: loadImage(ASSETS.backgrounds.dungeons.castleHallPanels),
};

// Draws a tiled, horizontally-scrolling background layer inside a drawing
// context that has already been translated by -camX (as drawDungeon/drawCrypt/
// drawCastleInteriorScene do). `factor` is how fast the layer moves relative
// to the foreground: 1 = moves with the world (no parallax), smaller = appears
// further away. Cancels part of the outer translate to achieve that.
function drawParallaxLayerWorld(img, camX, factor, destY, destH, worldWidth) {
  if (!imageReady(img)) return;
  const scale = destH / img.naturalHeight;
  const tileW = img.naturalWidth * scale;
  ctx.save();
  ctx.translate(camX * (1 - factor), 0);
  for (let x = -tileW; x < worldWidth + tileW; x += tileW) {
    ctx.drawImage(img, x, destY, tileW, destH);
  }
  ctx.restore();
}

function drawCastleHallBackground(camX, camY, worldWidth) {
  const img = BACKGROUNDS.castleHallPanels;
  if (!imageReady(img)) return;
  const panelW = img.naturalWidth / 5;
  const destH = VIEW_H * 0.7;
  const scale = destH / img.naturalHeight;
  const destW = panelW * scale;
  const factor = 0.82;
  ctx.save();
  ctx.translate(camX * (1 - factor), camY * (1 - factor) * 0.4);
  for (let x = -destW; x < worldWidth + destW; x += destW) {
    ctx.drawImage(img, 0, 0, panelW, img.naturalHeight, x, 0, destW, destH);
  }
  ctx.restore();
}

// Real CC0 art (see assets/CREDITS.md) used where available, with a graceful
// fallback to the hand-drawn pixelRect art when an image hasn't loaded.
const ENEMY_SPRITES = {
  shade: {
    frames: loadFrames([1, 2, 3, 4].map(ASSETS.enemies.ghostFrame)),
    fps: 6, scale: 2.6,
  },
  wraith: {
    frames: loadFrames([1, 2, 3, 4].map(ASSETS.enemies.ghostFrame)),
    fps: 6, scale: 2.6, filter: "hue-rotate(150deg) saturate(1.6) brightness(1.15)",
  },
  crawler: {
    frames: loadFrames([1, 2, 3, 4, 5, 6, 7, 8].map(ASSETS.enemies.skeletonFrame)),
    fps: 9, scale: 2.4,
  },
  knight: {
    frames: loadFrames([1, 2, 3, 4, 5, 6, 7, 8].map(ASSETS.enemies.clothedSkeletonFrame)),
    fps: 7, scale: 3.4,
  },
  cursed_king: {
    frames: loadFrames([1, 2, 3, 4, 5, 6, 7, 8].map(ASSETS.enemies.clothedSkeletonFrame)),
    fps: 7, scale: 3.8, filter: "hue-rotate(230deg) saturate(1.5) brightness(1.05)",
  },
  forest_guardian: {
    frames: loadFrames([1, 2, 3, 4, 5, 6, 7, 8].map(ASSETS.enemies.clothedSkeletonFrame)),
    fps: 7, scale: 3.6, filter: "hue-rotate(80deg) saturate(1.7) brightness(1.0)",
  },
};

function drawEnemySprite(foe) {
  const set = ENEMY_SPRITES[foe.type];
  if (!set) return false;
  const frame = set.frames[Math.floor(game.time * set.fps) % set.frames.length];
  if (!imageReady(frame)) return false;
  const flip = foe.facing < 0;
  ctx.save();
  if (set.filter) ctx.filter = set.filter;
  ctx.scale(flip ? -set.scale : set.scale, set.scale);
  ctx.drawImage(frame, -frame.naturalWidth / 2, -frame.naturalHeight + 6, frame.naturalWidth, frame.naturalHeight);
  ctx.restore();
  return true;
}

// Each animation is its own clean, uniform-grid strip (no labels baked in),
// so frame boxes are computed exactly from image width / frame count.
const CHAR_SHEET_SCALE = 0.2;

function buildCharSheet(defs) {
  const sheet = {};
  for (const [key, def] of Object.entries(defs)) {
    const image = new Image();
    image.src = def.src;
    sheet[key] = { ...def, image };
  }
  return sheet;
}

const STARK_SHEET = buildCharSheet({
  idle: { src: ASSETS.characters.stark.idle, count: 6 },
  run: { src: ASSETS.characters.stark.run, count: 8 },
  jump: { src: ASSETS.characters.stark.jump, count: 6 },
  attack: { src: ASSETS.characters.stark.attack, count: 6 },
});

const FERN_SHEET = buildCharSheet({
  idle: { src: ASSETS.characters.fern.idle, count: 6 },
  run: { src: ASSETS.characters.fern.run, count: 8 },
  jump: { src: ASSETS.characters.fern.jump, count: 6 },
  cast: { src: ASSETS.characters.fern.cast, count: 6 },
});

const HIMMEL_SHEET = buildCharSheet({
  idle: {
    src: ASSETS.characters.himmel.idle,
    count: 6,
    pivotX: 170,
    pivotY: 487,
    scaleMultiplier: 1,
    cropInset: 2,
    pixelPerfect: true,
  },
  run: {
    src: ASSETS.characters.himmel.run,
    count: 8,
    pivotX: 140,
    pivotY: 405,
    scaleMultiplier: 1.64,
    cropInset: 2,
    pixelPerfect: true,
  },
  attack: {
    src: ASSETS.characters.himmel.attack,
    count: 6,
    pivotX: 160,
    pivotY: 442,
    scaleMultiplier: 1.43,
    cropInset: 2,
    pixelPerfect: true,
  },
});

const HIMMEL_ATTACK_DURATION = 0.34;

// Static placeholder draw (the standalone NPC before he's recruited).
function drawHimmelSprite(x, y, scale = 0.2) {
  ctx.save();
  ctx.translate(x, y);
  const idx = Math.floor(game.time * 4) % HIMMEL_SHEET.idle.count;
  const drawn = drawCharacterSheet(HIMMEL_SHEET, "idle", idx, scale, false);
  if (!drawn) drawSpritePlaceholder();
  ctx.restore();
}

// Companion draw — picks idle/run/attack based on his live AI state.
function drawCompanionSprite(c, scale = 0.22) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const flip = c.facing < 0;
  let rowKey = "idle";
  let idx = Math.floor(game.time * 4) % HIMMEL_SHEET.idle.count;
  if (c.attackTime > 0) {
    rowKey = "attack";
    const t = clamp(1 - c.attackTime / HIMMEL_ATTACK_DURATION, 0, 1);
    idx = Math.floor(t * HIMMEL_SHEET.attack.count);
  } else if (c.moving) {
    rowKey = "run";
    idx = Math.floor(game.time * 10) % HIMMEL_SHEET.run.count;
  }
  const drawn = drawCharacterSheet(HIMMEL_SHEET, rowKey, idx, scale, flip);
  if (!drawn) drawSpritePlaceholder();
  ctx.restore();
}

function drawCharacterSheet(sheet, rowKey, frameIndex, scale, flip) {
  const row = sheet[rowKey];
  if (!row || !row.image.complete || !row.image.naturalWidth) return false;
  const frameW = row.image.naturalWidth / row.count;
  const frameH = row.image.naturalHeight;
  const idx = clamp(frameIndex, 0, row.count - 1);
  const sx = idx * frameW;
  const cropInset = row.cropInset || 0;
  const sourceW = frameW - cropInset * 2;
  const pivotX = row.pivotX ?? frameW / 2;
  const pivotY = row.pivotY ?? frameH - 36;
  const renderScale = scale * (row.scaleMultiplier || 1);
  ctx.save();
  if (row.pixelPerfect) ctx.imageSmoothingEnabled = false;
  ctx.scale(flip ? -renderScale : renderScale, renderScale);
  ctx.drawImage(
    row.image,
    sx + cropInset,
    0,
    sourceW,
    frameH,
    cropInset - pivotX,
    -pivotY,
    sourceW,
    frameH,
  );
  ctx.restore();
  return true;
}

const game = {
  mode: "overworld",
  time: 0,
  shake: 0,
  toastTimer: 0,
  won: false,
  camera: { x: 0, y: 0 },
  player: {
    character: "frieren",
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    mana: 70,
    maxMana: 70,
    x: 245,
    y: 1090,
    dx: 0,
    dy: 0,
    vx: 0,
    vy: 0,
    moving: false,
    facingX: 1,
    facingY: 0,
    attackTime: 0,
    attackCd: 0,
    pendingSwing: null,
    dodgeTime: 0,
    hurtCd: 0,
    onGround: false,
    coyote: 0,
    flightTime: 0,
    fallStartY: 0,
    lastLandingVy: 0,
    relics: 0,
    gold: 0,
    inventory: {
      weight: 3,
      maxComfortWeight: 8,
    },
    spells: {
      zoltraak: {
        known: true,
        level: 1,
        power: 24,
        range: 260,
        cost: 14,
        speed: 620,
        cooldown: 0,
        name: "Zoltraak",
      },
      flugmagie: {
        known: false,
        maxHold: 1.35,
        remaining: 0,
        lift: -120,
        fallCap: 205,
        name: "Flugmagie",
      },
      mikheit: {
        known: false,
        name: "Mikheit",
      },
      sturmklinge: {
        known: false,
        power: 30,
        range: 86,
        cost: 16,
        cooldown: 0,
        name: "Cleaving Light",
      },
      blackhole: {
        known: false,
        power: 9999,
        range: 520,
        speed: 230,
        r: 50,
        cooldown: 0,
        castCooldown: 1.4,
        name: "Schwarzes Loch",
      },
    },
  },
  dialogue: {
    active: false,
    speaker: "",
    lines: [],
    index: 0,
    choices: null,
    onClose: null,
    cinematic: false,
  },
  spellPopup: {
    active: false,
    name: "",
    desc: "",
  },
  map: {
    open: false,
    selected: 0,
  },
  save: {
    slotIndex: null,
  },
  paused: true,
  autosaveTimer: 0,
  respawn: { mode: "overworld", x: 395, y: 1160 },
  overworld: {
    shadeDefeated: false,
    enemies: [],
    motes: [],
    projectiles: [],
    enemyProjectiles: [],
  },
  dungeon: {
    entered: false,
    completed: false,
    floorIndex: 0,
    floorEnemies: [],
    revealedSecrets: new Set(),
    openedChests: new Set(),
    finalMimicOpen: false,
    lootFound: 0,
    enemies: [],
    motes: [],
    projectiles: [],
    enemyProjectiles: [],
    boss: null,
    mimicEvent: null,
    ritterIntroShown: false,
  },
  crypt: {
    entered: false,
    completed: false,
    floorIndex: 0,
    floorEnemies: [],
    revealedSecrets: new Set(),
    openedChests: new Set(),
    lootFound: 0,
    enemies: [],
    motes: [],
    projectiles: [],
    enemyProjectiles: [],
    boss: null,
    bossIntroShown: false,
  },
  level1: {
    started: false,
    enemies: [],
    motes: [],
    projectiles: [],
    enemyProjectiles: [],
    boss: null,
    bossIntroShown: false,
  },
  forestDungeon: {
    entered: false,
    enemies: [],
    motes: [],
    projectiles: [],
    enemyProjectiles: [],
    boss: null,
  },
  companion: {
    x: 0,
    y: 0,
    vy: 0,
    onGround: false,
    lastX: 0,
    stuckTime: 0,
    hp: 140,
    maxHp: 140,
    facing: 1,
    moving: false,
    attackCd: 0,
    attackTime: 0,
    targetId: null,
  },
};

function resetOverworldEnemies() {
  game.overworld.enemies = [
    enemy("wisp", 785, 690, 34, 34, 74),
    enemy("wisp", 1080, 1090, 34, 34, 74),
    enemy("wisp", 2240, 1020, 34, 34, 74),
    enemy("wisp", 2780, 1640, 34, 34, 74),
    enemy("wisp", 1480, 2080, 34, 34, 74),
    enemy("soldier", 1360, 780, 44, 58, 92),
    enemy("soldier", 2560, 600, 44, 58, 92),
    enemy("soldier", 1900, 1900, 44, 58, 92),
    enemy("shade", 1810, 760, 70, 175, 128),
    enemy("shade", 3050, 1500, 70, 175, 128),
    enemy("dragon", 2700, 350, 120, 420, 320),
    enemy("dragon", 1750, 2150, 120, 420, 320),
  ];
  game.overworld.enemyProjectiles = [];
}

function resetDungeonEnemies() {
  game.dungeon.floorEnemies = dungeonData.floors.map((floor) => (
    floor.enemies.map(([type, x, y, r, hp, xp]) => enemy(type, x, y, r, hp, xp))
  ));
  game.dungeon.revealedSecrets = new Set();
  game.dungeon.openedChests = new Set();
  game.dungeon.finalMimicOpen = false;
  game.dungeon.lootFound = 0;
  activateDungeonFloor(0);
}

function resetCryptEnemies() {
  game.crypt.floorEnemies = cryptData.floors.map((floor) => (
    floor.enemies.map(([type, x, y, r, hp, xp]) => enemy(type, x, y, r, hp, xp))
  ));
  game.crypt.revealedSecrets = new Set();
  game.crypt.openedChests = new Set();
  game.crypt.lootFound = 0;
  activateCryptFloor(0);
}

function resetLevelOneEnemies() {
  game.level1.enemies = levelOneData.mountain.enemies.concat(levelOneData.southForest.enemies).map(
    ([type, x, y, r, hp, xp]) => enemy(type, x, y, r, hp, xp),
  );
  const [bossType, bossX, bossY, bossR, bossHp, bossXp] = levelOneData.mountain.boss;
  const boss = enemy(bossType, bossX, bossY, bossR, bossHp, bossXp);
  boss.isMountainBoss = true;
  game.level1.boss = levelOneData.elder.passCleared ? null : boss;
  game.level1.enemyProjectiles = [];
}

function resetForestDungeonEnemies() {
  const floor = forestDungeonData.floors[0];
  game.forestDungeon.enemies = floor.enemies.map(
    ([type, x, y, r, hp, xp]) => enemy(type, x, y, r, hp, xp),
  );
  const [bossType, bossX, bossY, bossR, bossHp, bossXp] = floor.boss;
  const boss = enemy(bossType, bossX, bossY, bossR, bossHp, bossXp);
  game.forestDungeon.boss = forestDungeonData.cleared ? null : boss;
  game.forestDungeon.enemyProjectiles = [];
}

function enemy(type, x, y, r, hp, xp) {
  return {
    type, x, y, r, hp, maxHp: hp, xp, vx: 0, vy: 0, facing: -1,
    hurt: 0, attackCd: 0, rangedCd: type === "shade" || type === "dragon" || type === "wraith" ? 1.2 : 0, dead: false, patrol: x, onGround: false,
  };
}

resetOverworldEnemies();
resetDungeonEnemies();
resetCryptEnemies();
resetLevelOneEnemies();
resetForestDungeonEnemies();

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (!input.down.has(key)) input.tap.add(key);
  input.down.add(key);
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  input.down.delete(event.key.toLowerCase());
});

function held(...keys) {
  return keys.some((key) => input.down.has(key));
}

function tapped(...keys) {
  return keys.some((key) => input.tap.has(key));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function showToast(copy) {
  hud.toast.textContent = copy;
  hud.toast.classList.add("show");
  game.toastTimer = 2.2;
}

function showDialogue(speaker, lines, choices = null, onClose = null, cinematic = false) {
  game.dialogue.active = true;
  game.dialogue.speaker = speaker;
  game.dialogue.lines = lines;
  game.dialogue.index = 0;
  game.dialogue.choices = choices;
  game.dialogue.onClose = onClose;
  game.dialogue.cinematic = cinematic;
  hud.objective.hidden = true;
  hud.dialogue.hidden = false;
  hud.dialogue.classList.toggle("cinematic", cinematic);
  setLetterboxVisible(cinematic);
  renderDialogue();
}

function showCutscene(speaker, lines, choices = null, onClose = null) {
  showDialogue(speaker, lines, choices, onClose, true);
}

function setLetterboxVisible(visible) {
  hud.letterboxTop.hidden = !visible;
  hud.letterboxBottom.hidden = !visible;
}

function showSpellLearned(name, desc) {
  game.spellPopup.active = true;
  game.spellPopup.name = name;
  game.spellPopup.desc = desc;
  hud.spellName.textContent = name;
  hud.spellDesc.textContent = desc;
  hud.spellLearned.hidden = false;
  hud.objective.hidden = true;
  setLetterboxVisible(true);
}

function closeSpellLearned() {
  game.spellPopup.active = false;
  hud.spellLearned.hidden = true;
  hud.objective.hidden = false;
  setLetterboxVisible(game.dialogue.active);
}

function handleSpellPopupInput() {
  if (!game.spellPopup.active) return false;
  if (tapped("e", " ", "enter")) closeSpellLearned();
  updateHud();
  input.tap.clear();
  return true;
}

function renderDialogue() {
  hud.dialogueName.textContent = game.dialogue.speaker;
  hud.dialogueCopy.textContent = game.dialogue.lines[game.dialogue.index] || "";
  const atLastLine = game.dialogue.index >= game.dialogue.lines.length - 1;
  const showChoices = atLastLine && game.dialogue.choices && game.dialogue.choices.length > 0;
  hud.dialogueChoices.hidden = !showChoices;
  hud.dialoguePrompt.hidden = Boolean(showChoices);
  if (!showChoices) return;
  hud.dialogueChoices.innerHTML = "";
  game.dialogue.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.textContent = `${i + 1}. ${choice.label}`;
    btn.addEventListener("click", () => selectDialogueChoice(i));
    hud.dialogueChoices.appendChild(btn);
  });
}

function advanceDialogue() {
  const atLastLine = game.dialogue.index >= game.dialogue.lines.length - 1;
  if (atLastLine && game.dialogue.choices && game.dialogue.choices.length > 0) return;
  game.dialogue.index += 1;
  if (game.dialogue.index >= game.dialogue.lines.length) {
    closeDialogue();
    return;
  }
  renderDialogue();
}

function closeDialogue() {
  const onClose = game.dialogue.onClose;
  game.dialogue.active = false;
  game.dialogue.choices = null;
  game.dialogue.onClose = null;
  game.dialogue.cinematic = false;
  hud.dialogue.hidden = true;
  hud.dialogue.classList.remove("cinematic");
  hud.dialogueChoices.hidden = true;
  hud.objective.hidden = false;
  setLetterboxVisible(false);
  if (onClose) onClose();
}

function selectDialogueChoice(i) {
  const choices = game.dialogue.choices;
  game.dialogue.onClose = null;
  closeDialogue();
  const choice = choices && choices[i];
  if (choice && choice.onSelect) choice.onSelect();
}

function handleDialogueInput() {
  if (!game.dialogue.active) return false;
  const atLastLine = game.dialogue.index >= game.dialogue.lines.length - 1;
  const awaitingChoice = atLastLine && game.dialogue.choices && game.dialogue.choices.length > 0;
  if (awaitingChoice) {
    if (tapped("1")) selectDialogueChoice(0);
    else if (tapped("2")) selectDialogueChoice(1);
  } else if (tapped("e", " ", "enter")) {
    advanceDialogue();
  }
  updateHud();
  input.tap.clear();
  return true;
}

function heineDialogueLines() {
  const villager = overworldData.villager;
  const bramble = overworldData.bramble;
  const grimoire = overworldData.grimoire;
  villager.talked = true;

  if (game.player.relics >= 1 && !villager.questComplete) {
    villager.questComplete = true;
    game.won = true;
    game.player.gold += 50;
    saveCurrentGame();
    return [
      "You are back. In one piece, mostly.",
      "That weight in your bag... is that truly the Ritter's grimoire?",
      "Then the loop closes. Heiterfeld to Hohlgrund and back, relic in hand.",
      "Rest by the fire. You have earned it.",
    ];
  }

  if (villager.questComplete) {
    return [
      "The grimoire is already shelved, thanks to you.",
      "Go on, go bother the wisps. You have earned a quiet day.",
    ];
  }

  if (!bramble.cleared) {
    return [
      "You have the old killing spell, yes? Zoltraak. Useful, but yours is still thin as thread.",
      "My herb path is choked by Fluchdorn. Burn it away, and I will show you a page from my father's grimoire.",
      "A proper mage learns from chores as much as battles. Aim with J. Keep your distance.",
    ];
  }

  if (!grimoire.collected) {
    return [
      "Clean work. The bramble did not even have time to scream.",
      "Take the Kleines Zauberbuch there. It will not teach you Zoltraak, but it will make yours reach farther and bite harder.",
    ];
  }

  if (!game.overworld.shadeDefeated) {
    return [
      "Now you see why grimoires matter. A spell is not one thing. It is a road with a hundred mile stones.",
      "The Mondbrunnen shade hates clean formulae. Put your improved Zoltraak through it.",
    ];
  }

  return [
    "Hohlgrund is open. Good. There is a relic down there I actually need you to recover.",
    "The cracked walls in Hohlgrund are not decoration. Old mages sealed loot behind them when the dungeon was still guarded.",
    "Whatever Knight still wanders down there has been standing watch over a grimoire for centuries. Find the crack that hides it.",
    "Bring it back before you read the dangerous parts aloud. That was a joke. Mostly.",
  ];
}

function hurtPlayer(amount, knockX = 0, knockY = 0) {
  const p = game.player;
  if (p.hurtCd > 0 || p.dodgeTime > 0) return;
  p.hp = Math.max(0, p.hp - amount);
  p.hurtCd = 0.75;
  p.vx += knockX;
  p.vy += knockY;
  game.shake = 0.18;
  if (p.hp <= 0) {
    showToast("You collapsed. Resting at the last shrine...");
    p.hp = p.maxHp;
    p.stamina = p.maxStamina;
    p.mana = p.maxMana;
    respawnPlayer();
  }
}

function respawnPlayer() {
  const r = game.respawn;
  const p = game.player;
  game.mode = r.mode;
  p.x = r.x;
  p.y = r.y;
  p.vx = 0;
  p.vy = 0;
  p.facingX = 0;
  p.facingY = 1;
}

function addMote(bucket, x, y, color, count = 8) {
  for (let i = 0; i < count; i += 1) {
    bucket.push({
      x, y,
      vx: (Math.random() - 0.5) * 220,
      vy: (Math.random() - 0.5) * 220,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
      color,
    });
  }
}

function addSlashFx(bucket, x, y, dirX, color = "#fff6dc") {
  bucket.push({
    x, y, vx: 0, vy: 0,
    life: 0.32, maxLife: 0.32,
    color, shape: "slash", dirX: dirX || 1,
  });
}

function updateMotes(motes, dt) {
  for (const mote of motes) {
    if (mote.shape === "beam") {
      // tracks the caster briefly instead of drifting on its own, so the
      // beam appears to move with the character as she moves
      mote.x = game.player.x + mote.offsetX;
      mote.y = game.player.y + mote.offsetY;
    } else {
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.vx *= 0.96;
      mote.vy *= 0.96;
    }
    mote.life -= dt;
  }
  for (let i = motes.length - 1; i >= 0; i -= 1) {
    if (motes[i].life <= 0) motes.splice(i, 1);
  }
}

function attackCircle(targetX, targetY, radius, damage, enemies, bucket) {
  let hit = false;
  for (const foe of enemies) {
    if (foe.dead) continue;
    const reach = radius + foe.r;
    if (dist(targetX, targetY, foe.x, foe.y) <= reach) {
      damageEnemy(foe, damage, targetX, targetY, bucket);
      hit = true;
    }
  }
  if (hit) game.shake = Math.max(game.shake, 0.08);
}

// Instant hitscan beam: damages everything along the line in one frame
// (pierces multiple targets), rather than a projectile that travels over time.
function attackLine(ox, oy, dirX, dirY, range, halfWidth, damage, enemies, bucket) {
  let hit = false;
  for (const foe of enemies) {
    if (!foe || foe.dead) continue;
    const fx = foe.x - ox;
    const fy = foe.y - oy;
    const proj = clamp(fx * dirX + fy * dirY, 0, range);
    const closestX = ox + dirX * proj;
    const closestY = oy + dirY * proj;
    if (dist(foe.x, foe.y, closestX, closestY) <= foe.r + halfWidth) {
      damageEnemy(foe, damage, closestX, closestY, bucket);
      hit = true;
    }
  }
  if (hit) game.shake = Math.max(game.shake, 0.08);
  return hit;
}

// Coarse line-vs-rect check (sampled along the beam) used to let the beam
// still trigger secret-wall reveals the old traveling projectile used to.
function lineHitsRect(ox, oy, dirX, dirY, range, rect, thickness = 16) {
  const steps = Math.ceil(range / 10);
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * range;
    if (circleRect(ox + dirX * t, oy + dirY * t, thickness, rect)) return true;
  }
  return false;
}

function castZoltraak(space) {
  const p = game.player;
  const spell = p.spells.zoltraak;
  if (!spell.known || spell.cooldown > 0) return;
  if (p.mana < spell.cost) {
    showToast("Not enough mana for Zoltraak.");
    return;
  }

  p.mana -= spell.cost;
  spell.cooldown = spell.castCooldown || 0.34;
  p.attackTime = 0.18;
  const sideView = isSideViewSpace(space);
  const dirX = sideView ? Math.sign(p.facingX || 1) : p.facingX || 1;
  const dirY = sideView ? 0 : p.facingY || 0;
  const mag = Math.hypot(dirX, dirY) || 1;
  const ndx = dirX / mag;
  const ndy = dirY / mag;
  const state = spaceState(space);
  const enemies = state.enemies.concat(state.boss ? [state.boss] : []);
  const offsetX = ndx * 26;
  const offsetY = sideView ? -35 : ndy * 26;
  const originX = p.x + offsetX;
  const originY = p.y + offsetY;

  // Zoltraak is now an instant beam: it pierces everything along its range
  // in one frame, rather than a slow-moving bolt. The visual beam below
  // lingers briefly and follows the caster, but it no longer deals the
  // damage itself — that already happened here, instantly.
  attackLine(originX, originY, ndx, ndy, spell.range, 16, spell.power, enemies, state.motes);

  if (space === "overworld") {
    const bramble = overworldData.bramble;
    if (!bramble.cleared) {
      const fx = bramble.x - originX;
      const fy = bramble.y - originY;
      const proj = clamp(fx * ndx + fy * ndy, 0, spell.range);
      const cx = originX + ndx * proj;
      const cy = originY + ndy * proj;
      if (dist(bramble.x, bramble.y, cx, cy) <= bramble.r + 16) {
        bramble.hp -= spell.power;
        addMote(state.motes, bramble.x, bramble.y, "#8bd6bd", 12);
        if (bramble.hp <= 0) {
          bramble.cleared = true;
          overworldData.villager.helped = true;
          game.player.gold += 15;
          showToast("Heine's herb path is clear. A grimoire appears. +15 gold.");
        }
      }
    }
  } else if (space === "dungeon") {
    const floor = activeDungeonFloor();
    for (const secret of floor.secrets) {
      if (game.dungeon.revealedSecrets.has(secret.id)) continue;
      if (lineHitsRect(originX, originY, ndx, ndy, spell.range, secret)) {
        revealDungeonSecret(secret, secret.x + secret.w / 2, secret.y + secret.h / 2);
      }
    }
  } else if (space === "crypt") {
    const floor = activeCryptFloor();
    for (const secret of floor.secrets) {
      if (game.crypt.revealedSecrets.has(secret.id)) continue;
      if (lineHitsRect(originX, originY, ndx, ndy, spell.range, secret)) {
        revealCryptSecret(secret, secret.x + secret.w / 2, secret.y + secret.h / 2);
      }
    }
  }

  state.motes.push({
    x: originX,
    y: originY,
    offsetX,
    offsetY,
    dirX: ndx,
    dirY: ndy,
    range: spell.range,
    shape: "beam",
    color: spell.name === "Fernsturm" ? "#dac4ff" : "#b4e7ee",
    life: 0.16,
    maxLife: 0.16,
  });
}

const STURMKLINGE_SWING_DURATION = 0.34;
const STURMKLINGE_IMPACT_AT = 0.2;

function castSturmklinge(space) {
  const p = game.player;
  const spell = p.spells.sturmklinge;
  if (!spell.known || spell.cooldown > 0) return;
  if (p.stamina < spell.cost) {
    showToast("Too winded to swing Cleaving Light.");
    return;
  }
  p.stamina -= spell.cost;
  spell.cooldown = 0.5;
  p.attackTime = STURMKLINGE_SWING_DURATION;
  p.pendingSwing = {
    space,
    timer: STURMKLINGE_IMPACT_AT,
    dirX: Math.sign(p.facingX || 1),
    dirY: isSideViewSpace(space) ? 0 : p.facingY || 0,
  };
}

function resolveSturmklinge(swing) {
  const p = game.player;
  const spell = p.spells.sturmklinge;
  const state = spaceState(swing.space);
  const enemies = state.enemies.concat(state.boss ? [state.boss] : []);
  const bucket = state.motes;
  const targetX = p.x + swing.dirX * 50;
  const targetY = isSideViewSpace(swing.space) ? p.y - 35 : p.y + swing.dirY * 50;
  attackCircle(targetX, targetY, spell.range, spell.power, enemies, bucket);
  addSlashFx(bucket, targetX, targetY - 20, swing.dirX, "#fff6dc");
  addSlashFx(bucket, targetX, targetY - 20, swing.dirX, "#dac4ff");
}

function castBlackHole(space) {
  const p = game.player;
  const spell = p.spells.blackhole;
  if (!spell.known || spell.cooldown > 0) return;
  if (p.mana <= 0) {
    showToast("No mana left for Schwarzes Loch.");
    return;
  }

  p.mana = 0;
  spell.cooldown = spell.castCooldown;
  p.attackTime = 0.25;
  const sideView = isSideViewSpace(space);
  const dirX = sideView ? Math.sign(p.facingX || 1) : p.facingX || 1;
  const dirY = sideView ? 0 : p.facingY || 0;
  const mag = Math.hypot(dirX, dirY) || 1;
  const bucket = spaceState(space).projectiles;

  bucket.push({
    spell: "blackhole",
    x: p.x + (dirX / mag) * 30,
    y: sideView ? p.y - 35 : p.y + (dirY / mag) * 30,
    vx: (dirX / mag) * spell.speed,
    vy: (dirY / mag) * spell.speed,
    traveled: 0,
    range: spell.range,
    damage: spell.power,
    r: spell.r,
    life: 3,
  });
  showToast("Schwarzes Loch tears open. Everything it touches is gone.");
}

function spaceState(space) {
  if (space === "overworld") return game.overworld;
  if (space === "crypt") return game.crypt;
  if (space === "level1") return game.level1;
  if (space === "forestDungeon") return game.forestDungeon;
  return game.dungeon;
}

// Side-view (platformer) spaces vs. top-down spaces — combat math and enemy
// health-bar placement differ between the two.
function isSideViewSpace(space) {
  return space === "dungeon" || space === "crypt" || space === "forestDungeon";
}

function updateProjectiles(projectiles, enemies, bucket, dt, space) {
  const bramble = overworldData.bramble;
  for (const shot of projectiles) {
    const ox = shot.x;
    const oy = shot.y;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.traveled += dist(ox, oy, shot.x, shot.y);
    shot.life -= dt;

    for (const foe of enemies) {
      if (!foe || foe.dead || shot.dead) continue;
      if (dist(shot.x, shot.y, foe.x, foe.y) <= foe.r + shot.r) {
        damageEnemy(foe, shot.damage, shot.x, shot.y, bucket);
        shot.dead = true;
      }
    }

    if (space === "overworld" && !bramble.cleared && !shot.dead && dist(shot.x, shot.y, bramble.x, bramble.y) <= bramble.r + shot.r) {
      bramble.hp -= shot.damage;
      shot.dead = true;
      addMote(bucket, bramble.x, bramble.y, "#8bd6bd", 12);
      if (bramble.hp <= 0) {
        bramble.cleared = true;
        overworldData.villager.helped = true;
        game.player.gold += 15;
        showToast("Heine's herb path is clear. A grimoire appears. +15 gold.");
      }
    }

    if (space === "dungeon") {
      const floor = activeDungeonFloor();
      for (const secret of floor.secrets) {
        if (game.dungeon.revealedSecrets.has(secret.id) || shot.dead) continue;
        if (circleRect(shot.x, shot.y, shot.r, secret)) {
          revealDungeonSecret(secret, shot.x, shot.y);
          shot.dead = true;
        }
      }
      if (shot.y > dungeonData.height + 80) shot.dead = true;
    }
    if (space === "crypt") {
      const floor = activeCryptFloor();
      for (const secret of floor.secrets) {
        if (game.crypt.revealedSecrets.has(secret.id) || shot.dead) continue;
        if (circleRect(shot.x, shot.y, shot.r, secret)) {
          revealCryptSecret(secret, shot.x, shot.y);
          shot.dead = true;
        }
      }
      if (shot.y > cryptData.height + 80) shot.dead = true;
    }
    if (shot.traveled >= shot.range || shot.life <= 0) shot.dead = true;
  }

  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    if (projectiles[i].dead) projectiles.splice(i, 1);
  }
}

function updateEnemyProjectiles(projectiles, bucket, dt) {
  const p = game.player;
  const playerY = p.y - 28;
  for (const shot of projectiles) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.traveled += Math.hypot(shot.vx * dt, shot.vy * dt);
    shot.life -= dt;

    if (!shot.dead && dist(shot.x, shot.y, p.x, playerY) <= shot.r + 20) {
      hurtPlayer(shot.damage, Math.sign(shot.vx) * 140, -90);
      addMote(bucket, shot.x, shot.y, "#dac4ff", 8);
      shot.dead = true;
    }
    if (shot.traveled >= shot.range || shot.life <= 0) shot.dead = true;
  }
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    if (projectiles[i].dead) projectiles.splice(i, 1);
  }
}

function damageEnemy(foe, amount, hitX, hitY, bucket) {
  foe.hp -= amount;
  foe.hurt = 0.2;
  foe.vx += Math.sign(foe.x - hitX || 1) * 170;
  addMote(bucket, foe.x, foe.y, foe.type === "shade" || foe.type === "knight" || foe.type === "cursed_king" || foe.type === "wraith" ? "#dac4ff" : "#b4e7ee", 10);
  game.shake = Math.max(game.shake, 0.08);
  if (foe.hp > 0) return;

  foe.dead = true;
  const goldReward = Math.max(1, Math.round(foe.xp / 5));
  game.player.gold += goldReward;
  showToast(`Defeated ${foe.type}. +${goldReward} gold.`);
  if (foe.type === "shade") {
    game.overworld.shadeDefeated = true;
    showToast("Der Mondbrunnen-Schatten breaks. The Hohlgrund gate opens.");
  }
  if (foe.type === "dragon") {
    if (foe.isMountainBoss) {
      levelOneData.elder.passCleared = true;
      showToast("The wyrm of the Schartenpass falls. The pass is clear.");
      saveCurrentGame();
    } else {
      showToast("The dragon collapses, scales smoking. Heiterfeld's skies are quieter now.");
    }
  }
  if (foe.type === "knight") {
    game.dungeon.completed = true;
    game.player.relics = 1;
    game.player.spells.mikheit.known = true;
    showSpellLearned(
      "Mikheit",
      "Reads the magical density of a sealed container, 99% accurate against mimics. The other 1% of the time, it is hiding the kind of grimoire worth the risk.",
    );
    saveCurrentGame();
  }
  if (foe.type === "cursed_king") {
    game.crypt.completed = true;
    game.player.gold += 80;
    game.player.maxHp += 15;
    game.player.hp = game.player.maxHp;
    showSpellLearned(
      "Königssiegel",
      "The fallen king's signet ring, still warm. Wearing it settles deep in the bones — max HP increases permanently.",
    );
    saveCurrentGame();
  }
  if (foe.type === "forest_guardian") {
    forestDungeonData.cleared = true;
    game.player.gold += 70;
    game.player.maxStamina += 15;
    game.player.stamina = game.player.maxStamina;
    showSpellLearned(
      "Waldwächter-Kern",
      "The guardian's core dissolves into the air, sweet with old sap. Max stamina increases permanently.",
    );
    saveCurrentGame();
  }
}

function activeDungeonFloor() {
  return dungeonData.floors[game.dungeon.floorIndex];
}

function activateDungeonFloor(index) {
  game.dungeon.floorIndex = clamp(index, 0, dungeonData.floors.length - 1);
  game.dungeon.enemies = game.dungeon.floorEnemies[game.dungeon.floorIndex] || [];
  game.dungeon.boss = null;
  game.dungeon.projectiles = [];
  game.dungeon.motes = [];
}

function dungeonSolids() {
  const floor = activeDungeonFloor();
  const secretWalls = floor.secrets
    .filter((secret) => !game.dungeon.revealedSecrets.has(secret.id))
    .map((secret) => ({ x: secret.x, y: secret.y, w: secret.w, h: secret.h }));
  return floor.platforms.concat(secretWalls);
}

function visibleDungeonChests() {
  const floor = activeDungeonFloor();
  return floor.chests.filter((chest) => !chest.secretId || game.dungeon.revealedSecrets.has(chest.secretId));
}

function revealDungeonSecret(secret, x, y) {
  if (game.dungeon.revealedSecrets.has(secret.id)) return;
  game.dungeon.revealedSecrets.add(secret.id);
  addMote(game.dungeon.motes, x, y, "#dac4ff", 18);
  showToast(`${secret.hint} opens into a hidden passage.`);
}

function tryOpenDungeonChest() {
  const p = game.player;
  const floor = activeDungeonFloor();
  if (floor.finalMimic && game.dungeon.completed && !game.dungeon.finalMimicOpen) {
    const chest = floor.finalMimic;
    if (dist(p.x, p.y - 28, chest.x + chest.w / 2, chest.y + chest.h / 2) < 82 && tapped("e")) {
      startMimicEncounter();
      return true;
    }
  }

  for (const chest of visibleDungeonChests()) {
    if (game.dungeon.openedChests.has(chest.id)) continue;
    if (dist(p.x, p.y - 28, chest.x + chest.w / 2, chest.y + chest.h / 2) > 74) continue;
    if (!tapped("e")) continue;

    game.dungeon.openedChests.add(chest.id);
    grantDungeonLoot(chest.loot);
    addMote(game.dungeon.motes, chest.x + chest.w / 2, chest.y + chest.h / 2, "#fff6dc", 16);
    return true;
  }
  return false;
}

function activeCryptFloor() {
  return cryptData.floors[game.crypt.floorIndex];
}

function activateCryptFloor(index) {
  game.crypt.floorIndex = clamp(index, 0, cryptData.floors.length - 1);
  game.crypt.enemies = game.crypt.floorEnemies[game.crypt.floorIndex] || [];
  game.crypt.boss = null;
  game.crypt.projectiles = [];
  game.crypt.motes = [];
}

function cryptSolids() {
  const floor = activeCryptFloor();
  const secretWalls = floor.secrets
    .filter((secret) => !game.crypt.revealedSecrets.has(secret.id))
    .map((secret) => ({ x: secret.x, y: secret.y, w: secret.w, h: secret.h }));
  return floor.platforms.concat(secretWalls);
}

function visibleCryptChests() {
  const floor = activeCryptFloor();
  return floor.chests.filter((chest) => !chest.secretId || game.crypt.revealedSecrets.has(chest.secretId));
}

function revealCryptSecret(secret, x, y) {
  if (game.crypt.revealedSecrets.has(secret.id)) return;
  game.crypt.revealedSecrets.add(secret.id);
  addMote(game.crypt.motes, x, y, "#dac4ff", 18);
  showToast(`${secret.hint} opens into a hidden passage.`);
}

function tryOpenCryptChest() {
  const p = game.player;
  for (const chest of visibleCryptChests()) {
    if (game.crypt.openedChests.has(chest.id)) continue;
    if (dist(p.x, p.y - 28, chest.x + chest.w / 2, chest.y + chest.h / 2) > 74) continue;
    if (!tapped("e")) continue;

    game.crypt.openedChests.add(chest.id);
    grantCryptLoot(chest.loot);
    addMote(game.crypt.motes, chest.x + chest.w / 2, chest.y + chest.h / 2, "#fff6dc", 16);
    return true;
  }
  return false;
}

function grantCryptLoot(loot) {
  const p = game.player;
  game.crypt.lootFound += 1;
  if (loot === "heal") {
    p.hp = Math.min(p.maxHp, p.hp + 34);
    showToast("Found a sealed offering jar. HP restored.");
  } else if (loot === "vigor") {
    p.maxStamina += 10;
    p.stamina = p.maxStamina;
    showToast("Found a guard captain's ration tin. Max stamina increased.");
  } else if (loot === "crown") {
    p.maxMana += 10;
    p.mana = p.maxMana;
    showSpellLearned(
      "Ahnenkrone-Splitter",
      "A shard of an ancestor's crown, still humming with old wards. Max mana increases.",
    );
  }
}

function maybeTriggerMountainBossIntro(p) {
  if (game.level1.bossIntroShown) return;
  const boss = game.level1.boss;
  if (!boss || boss.dead) return;
  if (dist(p.x, p.y, boss.x, boss.y) > 520) return;
  game.level1.bossIntroShown = true;
  showCutscene("???", [
    "...",
    "A wyrm. Of course the pass would end in a wyrm.",
    "Roswitha said 'bandits and worse.' She undersold it.",
  ]);
}

function maybeTriggerCryptBossIntro(floor, p) {
  if (game.crypt.bossIntroShown) return;
  const boss = game.crypt.enemies.find((foe) => foe.type === "cursed_king" && !foe.dead);
  if (!boss) return;
  if (dist(p.x, p.y, boss.x, boss.y) > 480) return;
  game.crypt.bossIntroShown = true;
  showCutscene("Der Gefallene König", [
    "...who disturbs this grave.",
    "I held this hall against the dark for a hundred years after my crown forgot my name.",
    "Wraith and worm have taken everything else from me. You will not take the grave too.",
  ]);
}

function startMimicEncounter() {
  showCutscene(
    "Frieren",
    [
      "Mikheit hums against the lock. The reading is frighteningly high.",
      "Ninety-nine percent of the time, that much magic means teeth.",
      "But that other one percent is exactly the kind of grimoire worth dying for.",
    ],
    [
      { label: "Open it.", onSelect: () => revealMimic() },
      { label: "Leave it. Go back to the start.", onSelect: () => stallOnMimic(0) },
    ],
  );
}

function stallOnMimic(count) {
  if (count < MIMIC_EXCUSES.length) {
    showCutscene(
      "Frieren",
      [MIMIC_EXCUSES[count]],
      [
        { label: "Open it.", onSelect: () => revealMimic() },
        { label: "Leave it. Go back to the start.", onSelect: () => stallOnMimic(count + 1) },
      ],
    );
    return;
  }
  showCutscene(
    "Frieren",
    ["...just one look.", "I am a thousand years old and I still cannot walk away from a spellbook."],
    null,
    () => revealMimic(),
  );
}

function revealMimic() {
  const p = game.player;
  const floor = activeDungeonFloor();
  const chest = floor.finalMimic;
  game.dungeon.finalMimicOpen = true;
  const cx = chest.x + chest.w / 2;
  const cy = chest.y + chest.h / 2;
  addMote(game.dungeon.motes, cx, cy, "#dac4ff", 30);
  showToast("It was a mimic after all. Classic.");
  hurtPlayer(14, -p.facingX * 60, -80);
  game.dungeon.mimicEvent = { progress: 0, target: 7, timer: 5, x: cx, y: cy };
  hud.mimicQte.hidden = false;
  updateMimicQteHud();
}

function updateMimicEvent(dt) {
  const event = game.dungeon.mimicEvent;
  if (!event) return false;
  event.timer -= dt;
  if (tapped("j")) {
    event.progress += 1;
    game.shake = Math.max(game.shake, 0.05);
  }
  if (event.progress >= event.target) {
    finishMimicEscape();
  } else if (event.timer <= 0) {
    hurtPlayer(10);
    event.progress = Math.max(0, event.progress - 2);
    event.timer = 4;
    showToast("The mimic's grip tightens. Keep mashing J!");
  }
  updateMimicQteHud();
  updateHud();
  input.tap.clear();
  return true;
}

function updateMimicQteHud() {
  const event = game.dungeon.mimicEvent;
  if (!event) return;
  hud.mimicQteBar.style.width = `${clamp((event.progress / event.target) * 100, 0, 100)}%`;
}

function finishMimicEscape() {
  game.dungeon.mimicEvent = null;
  hud.mimicQte.hidden = true;
  activateDungeonFloor(0);
  switchToOverworld();
  showToast("Frieren wrenches free and flees all the way back to Heiterfeld. Heine should see this grimoire.");
}

function maybeTriggerRitterIntro(floor, p) {
  if (game.dungeon.ritterIntroShown) return;
  const knight = game.dungeon.enemies.find((foe) => foe.type === "knight" && !foe.dead);
  if (!knight) return;
  if (dist(p.x, p.y, knight.x, knight.y) > 480) return;
  game.dungeon.ritterIntroShown = true;
  showCutscene("Ritter von Hohlgrund", [
    "...",
    "A living mage. It has been a long time since anything down here had a pulse.",
    "I do not remember who sealed me here, or why. Only that I am to keep what is behind me.",
    "If you want to pass, you will take it from me. That is the only kind of conversation I have left.",
  ]);
}

function grantDungeonLoot(loot) {
  const p = game.player;
  const spell = p.spells.zoltraak;
  game.dungeon.lootFound += 1;
  if (loot === "flugmagie") {
    const flight = p.spells.flugmagie;
    flight.known = true;
    flight.remaining = flight.maxHold;
    p.maxMana += 6;
    p.mana = p.maxMana;
    showSpellLearned(
      "Flugmagie",
      "A brief flight spell. Hold Space while airborne to glide and soften a fall. It drains mana fast, faster still if she is carrying too much.",
    );
  } else if (loot === "heal") {
    p.hp = Math.min(p.maxHp, p.hp + 34);
    showToast("Found Mondkraut salve. HP restored.");
  } else if (loot === "mana") {
    p.maxMana += 8;
    p.mana = p.maxMana;
    showToast("Found a blue mana draught. Max MP increased.");
  } else if (loot === "range") {
    spell.range += 90;
    showToast("Found a grimoire margin note. Zoltraak range increased.");
  } else if (loot === "power") {
    spell.power += 7;
    showToast("Found a monster-core lens. Zoltraak power increased.");
  } else if (loot === "formula") {
    spell.level += 1;
    spell.power += 9;
    spell.range += 70;
    p.maxMana += 10;
    p.mana = p.maxMana;
    showSpellLearned(
      "Zoltraak Formel II",
      "A second formula for the same old spell. Level, range, power, and max mana all increase. Frieren's favorite kind of progress: incremental.",
    );
  }
}

function update(dt) {
  if (game.paused) return;
  game.time += dt;
  game.autosaveTimer += dt;
  if (game.autosaveTimer > 20 && game.save.slotIndex !== null) {
    game.autosaveTimer = 0;
    saveCurrentGame();
  }
  game.shake = Math.max(0, game.shake - dt);
  game.toastTimer = Math.max(0, game.toastTimer - dt);
  if (game.toastTimer <= 0) hud.toast.classList.remove("show");

  const p = game.player;
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.attackTime = Math.max(0, p.attackTime - dt);
  if (p.pendingSwing) {
    p.pendingSwing.timer -= dt;
    if (p.pendingSwing.timer <= 0) {
      resolveSturmklinge(p.pendingSwing);
      p.pendingSwing = null;
    }
  }
  p.dodgeTime = Math.max(0, p.dodgeTime - dt);
  p.hurtCd = Math.max(0, p.hurtCd - dt);
  p.flightTime = Math.max(0, p.flightTime - dt);
  p.spells.zoltraak.cooldown = Math.max(0, p.spells.zoltraak.cooldown - dt);
  p.spells.sturmklinge.cooldown = Math.max(0, p.spells.sturmklinge.cooldown - dt);
  p.spells.blackhole.cooldown = Math.max(0, p.spells.blackhole.cooldown - dt);
  p.stamina = clamp(p.stamina + 23 * dt, 0, p.maxStamina);
  p.mana = clamp(p.mana + 8 * dt, 0, p.maxMana);

  if (handleSpellPopupInput()) return;
  if (handleDialogueInput()) return;

  if (["overworld", "level1"].includes(game.mode) && tapped("m")) {
    game.map.open = !game.map.open;
    game.map.selected = 0;
    input.tap.clear();
  }
  if (game.map.open) {
    updateMapOverlay();
    updateHud();
    input.tap.clear();
    return;
  }

  // else-if is deliberate: a mode switch mid-frame (e.g. entering the cabin)
  // must not also run the new mode's update in the same tick — otherwise a
  // leftover "e" tap gets consumed twice and immediately bounces you back out.
  if (game.mode === "overworld") updateOverworld(dt);
  else if (game.mode === "dungeon") updateDungeon(dt);
  else if (game.mode === "crypt") updateCrypt(dt);
  else if (game.mode === "castle") updateCastleInterior(dt);
  else if (game.mode === "level1") updateLevel1(dt);
  else if (game.mode === "cabin") updateCabinInterior(dt);
  else if (game.mode === "forestDungeon") updateForestDungeon(dt);

  updateHud();
  input.tap.clear();
}

function checkMapDiscoveries() {
  const p = game.player;
  for (const city of mapData.cities) {
    if (!city.known && dist(p.x, p.y, city.x, city.y) < city.discoverRadius) {
      city.known = true;
      showToast(`Discovered ${city.name}.`);
    }
  }
  for (const wagon of mapData.wagons) {
    if (!wagon.discovered && dist(p.x, p.y, wagon.x, wagon.y) < wagon.discoverRadius) {
      wagon.discovered = true;
      showToast(`${wagon.name} discovered. Wagons now travel here.`);
    }
  }
  const hohlgrund = mapData.dungeons.find((d) => d.id === "hohlgrund");
  if (hohlgrund && !hohlgrund.discovered && game.dungeon.entered) {
    hohlgrund.discovered = true;
  }
  const konigsgrab = mapData.dungeons.find((d) => d.id === "konigsgrab");
  if (konigsgrab && !konigsgrab.discovered && game.crypt.entered) {
    konigsgrab.discovered = true;
  }
}

function nearestWagon() {
  const p = game.player;
  return activeTravelRegion().wagons.find(
    (wagon) => wagon.discovered && dist(p.x, p.y, wagon.x, wagon.y) < 100,
  ) || null;
}

function allTravelWagons() {
  return [...mapData.wagons, ...levelOneData.wagons];
}

function activeTravelRegion() {
  if (game.mode === "level1") {
    return {
      name: "Waldlichtung",
      width: levelOneData.width,
      height: levelOneData.height,
      cities: [
        {
          id: "waldlichtung-dorf",
          name: levelOneData.village.name,
          x: levelOneData.village.x,
          y: levelOneData.village.y,
          known: true,
        },
      ],
      dungeons: [
        {
          id: "waldverlies",
          name: levelOneData.southForest.dungeonEntrance.name,
          x: levelOneData.southForest.dungeonEntrance.x,
          y: levelOneData.southForest.dungeonEntrance.y,
          discovered: true,
        },
      ],
      wagons: levelOneData.wagons,
    };
  }

  return {
    name: "Heiterfeld",
    width: overworldData.width,
    height: overworldData.height,
    cities: mapData.cities,
    dungeons: mapData.dungeons,
    wagons: mapData.wagons,
  };
}

function updateMapOverlay() {
  const origin = nearestWagon();
  const destinations = getWagonDestinations(allTravelWagons(), origin);
  game.map.selected = clamp(game.map.selected, 0, Math.max(0, destinations.length - 1));

  if (tapped("escape", "m")) {
    game.map.open = false;
    return;
  }
  if (tapped("arrowdown", "arrowright", "s", "d") && destinations.length) {
    game.map.selected = moveWagonSelection(game.map.selected, 1, destinations.length);
  }
  if (tapped("arrowup", "arrowleft", "w", "a") && destinations.length) {
    game.map.selected = moveWagonSelection(game.map.selected, -1, destinations.length);
  }
  if (tapped("enter", "e", " ") && origin && destinations.length) {
    travelByWagon(origin, destinations[game.map.selected]);
  }
}

function travelByWagon(origin, destination) {
  const cost = travelCost(origin, destination);
  const p = game.player;
  if (p.gold < cost) {
    showToast(`Not enough gold. The wagon to ${destination.name} costs ${cost}.`);
    return;
  }
  p.gold -= cost;
  game.mode = destination.mode;
  p.x = destination.x + 30;
  p.y = destination.y;
  p.vx = 0;
  p.vy = 0;
  game.map.open = false;
  if (destination.mode === "level1") snapCompanionToPlayer();
  showToast(`Traveled to ${destination.name} for ${cost} gold.`);
  saveCurrentGame();
}

function getOverworldSolids() {
  const town = overworldData.castleTown;
  const left = town.x - town.w / 2;
  const top = town.y - town.h / 2;
  const right = left + town.w;
  const bottom = top + town.h;
  const wallT = 28;
  const gateGapTop = town.gateY - 90;
  const gateGapBottom = town.gateY + 90;
  const keepX = town.keepDoorX + 110;
  const keepY = town.keepDoorY;

  const solids = [
    { x: left, y: top, w: town.w, h: wallT }, // north wall
    { x: left, y: bottom - wallT, w: town.w, h: wallT }, // south wall
    { x: right - wallT, y: top, w: wallT, h: town.h }, // east wall
    { x: left, y: top, w: wallT, h: gateGapTop - top }, // west wall, above the gate
    { x: left, y: gateGapBottom, w: wallT, h: bottom - gateGapBottom }, // west wall, below the gate
    { x: keepX - 130, y: keepY - 70, w: 260, h: 200 }, // castle keep footprint
    // Heine's garden fences (open on the left/right, matching the art)
    { x: 404, y: 790, w: 245, h: 25 },
    { x: 404, y: 934, w: 245, h: 25 },
  ];

  for (const [hx, hy] of [
    [town.x - 200, town.y - 230], [town.x - 70, town.y - 245],
    [town.x - 200, town.y + 215], [town.x - 70, town.y + 230],
  ]) {
    solids.push({ x: hx - 36, y: hy - 10, w: 72, h: 50 });
  }

  return solids;
}

function updateOverworld(dt) {
  const p = game.player;
  checkMapDiscoveries();
  let mx = (held("d", "arrowright") ? 1 : 0) - (held("a", "arrowleft") ? 1 : 0);
  let my = (held("s", "arrowdown") ? 1 : 0) - (held("w", "arrowup") ? 1 : 0);
  const mag = Math.hypot(mx, my) || 1;
  mx /= mag;
  my /= mag;

  if (mx || my) {
    p.facingX = mx;
    p.facingY = my;
  }
  p.moving = Boolean(mx || my);

  if (tapped(" ") && p.stamina >= 28 && p.dodgeTime <= 0) {
    p.stamina -= 28;
    p.dodgeTime = 0.28;
    if (!mx && !my) mx = p.facingX || 1;
    if (!mx && !my) my = p.facingY;
  }

  const speed = p.dodgeTime > 0 ? 520 : 185;
  p.x += mx * speed * dt;
  p.y += my * speed * dt;
  p.x = clamp(p.x, 40, overworldData.width - 40);
  p.y = clamp(p.y, 40, overworldData.height - 40);

  for (const rock of overworldData.rocks) {
    const gap = dist(p.x, p.y, rock.x, rock.y);
    const minGap = rock.r + 22;
    if (gap < minGap) {
      const nx = (p.x - rock.x) / (gap || 1);
      const ny = (p.y - rock.y) / (gap || 1);
      p.x = rock.x + nx * minGap;
      p.y = rock.y + ny * minGap;
    }
  }
  resolveAabbCollisions(p, getOverworldSolids(), 18);

  if (tapped("j") && p.attackCd <= 0) {
    p.attackCd = 0.22;
    if (p.character === "stark") castSturmklinge("overworld");
    else castZoltraak("overworld");
  }
  if (tapped("k")) castBlackHole("overworld");

  if (tapped("r") && dist(p.x, p.y, overworldData.camp.x, overworldData.camp.y) < 110) {
    p.hp = p.maxHp;
    p.stamina = p.maxStamina;
    p.mana = p.maxMana;
    game.respawn = { mode: "overworld", x: overworldData.camp.x + 40, y: overworldData.camp.y };
    showToast("Rested at camp. Overworld enemies return.");
    resetOverworldEnemies();
    game.overworld.shadeDefeated = false;
    saveCurrentGame();
  }

  if (collectGrimoireIfReady()) return;

  if (tapped("e") && dist(p.x, p.y, overworldData.villager.x, overworldData.villager.y) < 92) {
    showCutscene(overworldData.villager.name, heineDialogueLines());
    return;
  }

  if (tapped("e") && dist(p.x, p.y, overworldData.portal.x, overworldData.portal.y) < 105) {
    if (game.overworld.shadeDefeated) {
      switchToDungeon();
    } else {
      showToast("Der Schatten seals the Hohlgrund gate. Break it with Zoltraak.");
    }
  }

  if (tapped("e") && nearestWagon()) {
    game.map.open = true;
    game.map.selected = 0;
  }

  if (tapped("e")) {
    const town = overworldData.castleTown;
    if (dist(p.x, p.y, town.keepDoorX, town.keepDoorY) < 80) {
      switchToCastleInterior();
      return;
    }
    if (dist(p.x, p.y, town.cryptEntranceX, town.cryptEntranceY) < 80) {
      switchToCrypt();
      return;
    }
    const npc = town.npcs.find((n) => dist(p.x, p.y, n.x, n.y) < 85);
    if (npc) {
      showCutscene(npc.name, npc.lines);
      return;
    }
  }

  updateOverworldEnemies(dt);
  updateCompanion(dt, game.overworld.enemies, game.overworld.motes);
  updateProjectiles(game.overworld.projectiles, game.overworld.enemies, game.overworld.motes, dt, "overworld");
  updateEnemyProjectiles(game.overworld.enemyProjectiles, game.overworld.motes, dt);
  updateMotes(game.overworld.motes, dt);
}

function updateOverworldEnemies(dt) {
  const p = game.player;
  for (const foe of game.overworld.enemies) {
    if (foe.dead) continue;
    foe.hurt = Math.max(0, foe.hurt - dt);
    foe.attackCd = Math.max(0, foe.attackCd - dt);
    foe.rangedCd = Math.max(0, foe.rangedCd - dt);
    const gap = dist(p.x, p.y, foe.x, foe.y);
    const awake = foe.type === "dragon" ? 820 : foe.type === "shade" ? 650 : 420;
    if (gap < awake) {
      const nx = (p.x - foe.x) / (gap || 1);
      const ny = (p.y - foe.y) / (gap || 1);
      if (foe.type === "dragon" && gap > foe.r + 90) {
        if (foe.rangedCd <= 0) {
          foe.rangedCd = 2;
          fireDragonBreath(foe, nx, ny, game.overworld.enemyProjectiles);
        }
      } else if (foe.type === "shade" && gap > foe.r + 70) {
        if (foe.rangedCd <= 0) {
          foe.rangedCd = 1.6;
          fireShadeBolt(foe, nx, ny, game.overworld.enemyProjectiles);
        }
      } else {
        const speed = foe.type === "dragon" ? 56 : foe.type === "soldier" ? 82 : foe.type === "shade" ? 72 : 105;
        foe.x += nx * speed * dt + foe.vx * dt;
        foe.y += ny * speed * dt + foe.vy * dt;
      }
      foe.facing = Math.sign(nx || foe.facing);
      if (gap < foe.r + 24 && foe.attackCd <= 0) {
        foe.attackCd = foe.type === "dragon" ? 1.2 : foe.type === "shade" ? 1.05 : 0.8;
        hurtPlayer(foe.type === "dragon" ? 24 : foe.type === "shade" ? 16 : 9, nx * 150, ny * 150);
      }
    } else {
      foe.x += Math.sin(game.time + foe.x) * 8 * dt;
      foe.y += Math.cos(game.time * 0.8 + foe.y) * 8 * dt;
    }
    foe.vx *= 0.84;
    foe.vy *= 0.84;
  }
}

function updateLevelOneEnemies(dt) {
  const p = game.player;
  const all = game.level1.enemies.concat(game.level1.boss ? [game.level1.boss] : []);
  for (const foe of all) {
    if (!foe || foe.dead) continue;
    foe.hurt = Math.max(0, foe.hurt - dt);
    foe.attackCd = Math.max(0, foe.attackCd - dt);
    foe.rangedCd = Math.max(0, foe.rangedCd - dt);
    const gap = dist(p.x, p.y, foe.x, foe.y);
    const awake = foe.type === "dragon" ? 900 : foe.type === "shade" || foe.type === "wraith" ? 650 : 420;
    if (gap < awake) {
      const nx = (p.x - foe.x) / (gap || 1);
      const ny = (p.y - foe.y) / (gap || 1);
      if (foe.type === "dragon" && gap > foe.r + 100) {
        if (foe.rangedCd <= 0) {
          foe.rangedCd = 1.8;
          fireDragonBreath(foe, nx, ny, game.level1.enemyProjectiles);
        }
      } else if ((foe.type === "shade" || foe.type === "wraith") && gap > foe.r + 70) {
        if (foe.rangedCd <= 0) {
          foe.rangedCd = 1.6;
          if (foe.type === "wraith") fireWraithBolt(foe, nx, ny, game.level1.enemyProjectiles);
          else fireShadeBolt(foe, nx, ny, game.level1.enemyProjectiles);
        }
      } else {
        const speed = foe.type === "dragon" ? 50 : foe.type === "soldier" ? 82 : (foe.type === "shade" || foe.type === "wraith") ? 72 : 105;
        foe.x += nx * speed * dt + foe.vx * dt;
        foe.y += ny * speed * dt + foe.vy * dt;
      }
      foe.facing = Math.sign(nx || foe.facing);
      if (gap < foe.r + 24 && foe.attackCd <= 0) {
        foe.attackCd = foe.type === "dragon" ? 1.3 : (foe.type === "shade" || foe.type === "wraith") ? 1.05 : 0.8;
        const dmg = foe.type === "dragon" ? 38 : (foe.type === "shade" || foe.type === "wraith") ? 16 : 9;
        hurtPlayer(dmg, nx * 150, ny * 150);
      }
    } else {
      foe.x += Math.sin(game.time + foe.x) * 8 * dt;
      foe.y += Math.cos(game.time * 0.8 + foe.y) * 8 * dt;
    }
    foe.vx *= 0.84;
    foe.vy *= 0.84;
  }
}

function fireShadeBolt(foe, dirX, dirY, bucket) {
  const speed = 330;
  bucket.push({
    spell: "shadeBolt",
    x: foe.x + dirX * foe.r,
    y: foe.y + dirY * foe.r,
    vx: dirX * speed,
    vy: dirY * speed,
    traveled: 0,
    range: 720,
    damage: 12,
    r: 8,
    life: 2.2,
  });
}

function fireDragonBreath(foe, dirX, dirY, bucket) {
  const speed = 290;
  bucket.push({
    spell: "dragonBreath",
    x: foe.x + dirX * foe.r,
    y: foe.y + dirY * foe.r,
    vx: dirX * speed,
    vy: dirY * speed,
    traveled: 0,
    range: 860,
    damage: 22,
    r: 16,
    life: 2.6,
  });
}

function switchToDungeon() {
  game.mode = "dungeon";
  const p = game.player;
  activateDungeonFloor(0);
  const floor = activeDungeonFloor();
  p.x = floor.start.x;
  p.y = floor.start.y;
  p.vx = 0;
  p.vy = 0;
  p.facingX = 1;
  p.facingY = 0;
  game.dungeon.entered = true;
  showToast("Entered Hohlgrund. Search cracked walls for hidden grimoires.");
}

function switchToCrypt() {
  game.mode = "crypt";
  const p = game.player;
  activateCryptFloor(0);
  const floor = activeCryptFloor();
  p.x = floor.start.x;
  p.y = floor.start.y;
  p.vx = 0;
  p.vy = 0;
  p.facingX = 1;
  p.facingY = 0;
  game.crypt.entered = true;
  showToast("Entered Königsgrab. The dead kings of Königsburg keep poor company.");
}

function switchToOverworldFromCrypt() {
  game.mode = "overworld";
  const p = game.player;
  const town = overworldData.castleTown;
  p.x = town.cryptEntranceX + 40;
  p.y = town.cryptEntranceY;
  p.vx = 0;
  p.vy = 0;
  p.facingX = -1;
  p.facingY = 0;
}

function switchToCabinInterior() {
  game.mode = "cabin";
  const p = game.player;
  p.x = cabinInteriorData.entry.x;
  p.y = cabinInteriorData.entry.y;
  p.vx = 0;
  p.vy = 0;
  p.facingX = 0;
  p.facingY = -1;
  showToast("Home, for whatever that still means.");
}

function switchToLevel1FromCabin() {
  game.mode = "level1";
  const p = game.player;
  const cabin = levelOneData.cabin;
  p.x = cabin.doorX;
  p.y = cabin.doorY + 40;
  p.vx = 0;
  p.vy = 0;
  p.facingX = 0;
  p.facingY = 1;
}

function updateCabinInterior(dt) {
  const p = game.player;
  const room = cabinInteriorData;

  if (handleCabinBookshelfInteraction()) return;

  let mx = (held("d", "arrowright") ? 1 : 0) - (held("a", "arrowleft") ? 1 : 0);
  let my = (held("s", "arrowdown") ? 1 : 0) - (held("w", "arrowup") ? 1 : 0);
  const mag = Math.hypot(mx, my) || 1;
  mx /= mag;
  my /= mag;
  if (mx || my) {
    p.facingX = mx;
    p.facingY = my;
  }
  p.moving = Boolean(mx || my);

  const speed = 160;
  p.x += mx * speed * dt;
  p.y += my * speed * dt;
  p.x = clamp(p.x, 30, room.width - 30);
  p.y = clamp(p.y, 30, room.height - 30);

  if (tapped("e") && rectContains(room.exit, p.x, p.y)) {
    switchToLevel1FromCabin();
  }
}

function handleCabinBookshelfInteraction() {
  const p = game.player;
  const shelf = cabinInteriorData.bookshelf;
  if (!tapped("e")) return false;
  if (dist(p.x, p.y, shelf.x, shelf.y) > 70) return false;

  if (!cabinInteriorData.grimoireFound) {
    cabinInteriorData.grimoireFound = true;
    game.player.spells.blackhole.known = true;
    showSpellLearned(
      "Schwarzes Loch",
      "Tucked behind the old herbals: a grimoire on a forbidden formula. It costs every drop of mana she has, but nothing it touches survives. Press K to cast.",
    );
    saveCurrentGame();
  } else {
    showToast("Just dusty herbals and a few unpaid letters.");
  }
  return true;
}

function activeForestDungeonFloor() {
  return forestDungeonData.floors[0];
}

function forestDungeonSolids() {
  return activeForestDungeonFloor().platforms;
}

// Companion position never tracks the player automatically between scenes —
// only the in-AI ">1400 away" runtime check catches gross mismatches, and
// that can miss when leftover coordinates from one space happen to land
// within range of the player's position in a totally unrelated space. Call
// this explicitly on every scene transition instead of relying on that guess.
function snapCompanionToPlayer() {
  const c = game.companion;
  const p = game.player;
  c.x = p.x - 40;
  c.y = p.y;
  c.vy = 0;
  c.onGround = false;
  c.stuckTime = 0;
}

function switchToForestDungeon() {
  game.mode = "forestDungeon";
  const p = game.player;
  const floor = activeForestDungeonFloor();
  p.x = floor.start.x;
  p.y = floor.start.y;
  p.vx = 0;
  p.vy = 0;
  p.facingX = 1;
  p.facingY = 0;
  game.forestDungeon.entered = true;
  resetForestDungeonEnemies();
  snapCompanionToPlayer();
  showToast(forestDungeonData.cleared ? "Waldverlies (cleared)." : "Entered Waldverlies. Himmel draws his sword.");
}

function switchToLevel1FromForestDungeon() {
  game.mode = "level1";
  const p = game.player;
  const entrance = levelOneData.southForest.dungeonEntrance;
  p.x = entrance.x;
  p.y = entrance.y + 50;
  p.vx = 0;
  p.vy = 0;
  p.facingX = 0;
  p.facingY = 1;
  snapCompanionToPlayer();
}

function maybeTriggerForestGuardianIntro(p) {
  if (forestDungeonData.bossIntroShown) return;
  const boss = game.forestDungeon.boss;
  if (!boss || boss.dead) return;
  if (dist(p.x, p.y, boss.x, boss.y) > 480) return;
  forestDungeonData.bossIntroShown = true;
  showCutscene("Waldwächter", [
    "...",
    "Something ancient roots itself between you and the way out.",
    "Himmel sets his stance. \"Together, then.\"",
  ]);
}

function updateForestDungeon(dt) {
  const p = game.player;
  const floor = activeForestDungeonFloor();
  maybeTriggerForestGuardianIntro(p);
  if (game.dialogue.active) return;

  const left = held("a", "arrowleft");
  const right = held("d", "arrowright");
  const wish = (right ? 1 : 0) - (left ? 1 : 0);
  const accel = p.onGround ? 2750 : 1880;
  const maxSpeed = 255;
  p.vx += wish * accel * dt;
  if (!wish) p.vx *= p.onGround ? 0.78 : 0.95;
  p.vx = clamp(p.vx, -maxSpeed, maxSpeed);
  if (wish) {
    p.facingX = wish;
    p.facingY = 0;
  }
  p.moving = Math.abs(p.vx) > 18 && p.onGround;

  p.coyote = p.onGround ? 0.16 : Math.max(0, p.coyote - dt);
  if (tapped(" ", "w", "arrowup") && (p.onGround || p.coyote > 0)) {
    p.vy = -630;
    p.onGround = false;
    p.coyote = 0;
  }

  const flight = p.spells.flugmagie;
  const weightRatio = p.inventory.weight / Math.max(1, p.inventory.maxComfortWeight);
  const flightDrainMultiplier = 1 + Math.max(0, weightRatio - 1) * 0.85 + weightRatio * 0.25;
  const usingFlight = flight.known && held(" ") && !p.onGround && p.vy > -220 && p.mana > 0 && flight.remaining > 0;
  if (usingFlight) {
    const manaDrainPerSecond = p.maxMana / flight.maxHold;
    p.mana = Math.max(0, p.mana - manaDrainPerSecond * flightDrainMultiplier * dt);
    flight.remaining = Math.max(0, flight.remaining - dt * flightDrainMultiplier);
    p.flightTime = 0.16;
    p.vy = Math.min(p.vy, flight.fallCap);
    p.vy += flight.lift * dt;
  } else {
    p.vy += 1280 * dt;
  }
  p.vy = Math.min(p.vy, usingFlight ? flight.fallCap : 760);
  p.x += p.vx * dt;
  resolveForestDungeonX(p);
  const wasGrounded = p.onGround;
  const fallVy = p.vy;
  p.y += p.vy * dt;
  resolveForestDungeonY(p);
  if (!wasGrounded && p.onGround) handleLanding(fallVy);
  p.x = clamp(p.x, 26, floor.width - 26);

  if (p.y > forestDungeonData.height + 80) {
    hurtPlayer(18);
    p.x = floor.start.x;
    p.y = floor.start.y;
    p.vx = 0;
    p.vy = 0;
  }

  if (tapped("j") && p.attackCd <= 0) {
    p.attackCd = 0.22;
    if (p.character === "stark") castSturmklinge("forestDungeon");
    else castZoltraak("forestDungeon");
  }
  if (tapped("k")) castBlackHole("forestDungeon");

  for (const spike of floor.spikes) {
    if (circleRect(p.x, p.y - 22, 22, spike)) {
      hurtPlayer(15, -Math.sign(p.vx || p.facingX) * 120, -280);
      p.vy = -260;
    }
  }

  if (tryOpenForestDungeonChest()) return;

  if (floor.exit && tapped("e") && rectContains(floor.exit, p.x, p.y - 35)) {
    if (forestDungeonData.cleared) {
      switchToLevel1FromForestDungeon();
    } else {
      showToast("The gate is barred until the Waldwächter falls.");
    }
    return;
  }

  updateForestDungeonEnemies(dt);
  updateCompanionSideView(dt, floor, game.forestDungeon.enemies.concat(game.forestDungeon.boss ? [game.forestDungeon.boss] : []), game.forestDungeon.motes);
  updateProjectiles(
    game.forestDungeon.projectiles,
    game.forestDungeon.enemies.concat(game.forestDungeon.boss ? [game.forestDungeon.boss] : []),
    game.forestDungeon.motes,
    dt,
    "forestDungeon",
  );
  updateEnemyProjectiles(game.forestDungeon.enemyProjectiles, game.forestDungeon.motes, dt);
  updateMotes(game.forestDungeon.motes, dt);
}

function resolveForestDungeonX(p) {
  const body = { x: p.x - 18, y: p.y - 58, w: 36, h: 58 };
  for (const plat of forestDungeonSolids()) {
    if (!rectsOverlap(body, plat)) continue;
    if (p.vx > 0) p.x = plat.x - 18;
    if (p.vx < 0) p.x = plat.x + plat.w + 18;
    p.vx = 0;
    body.x = p.x - 18;
  }
}

function resolveForestDungeonY(p) {
  p.onGround = false;
  const body = { x: p.x - 18, y: p.y - 58, w: 36, h: 58 };
  for (const plat of forestDungeonSolids()) {
    if (!rectsOverlap(body, plat)) continue;
    if (p.vy > 0) {
      p.y = plat.y;
      p.vy = 0;
      p.onGround = true;
    } else if (p.vy < 0) {
      p.y = plat.y + plat.h + 58;
      p.vy = 0;
    }
    body.y = p.y - 58;
  }
}

function updateForestDungeonEnemies(dt) {
  const p = game.player;
  const floor = activeForestDungeonFloor();
  const enemies = game.forestDungeon.enemies.concat(game.forestDungeon.boss ? [game.forestDungeon.boss] : []);
  for (const foe of enemies) {
    if (!foe || foe.dead) continue;
    foe.hurt = Math.max(0, foe.hurt - dt);
    foe.attackCd = Math.max(0, foe.attackCd - dt);
    foe.rangedCd = Math.max(0, foe.rangedCd - dt);
    if (foe.type === "bat") {
      const gap = dist(p.x, p.y - 28, foe.x, foe.y);
      if (gap < 520) {
        foe.x += ((p.x - foe.x) / (gap || 1)) * 82 * dt;
        foe.y += ((p.y - 70 - foe.y) / (gap || 1)) * 82 * dt;
      } else {
        foe.x += Math.sin(game.time * 2 + foe.patrol) * 34 * dt;
        foe.y += Math.cos(game.time * 1.5 + foe.patrol) * 18 * dt;
      }
      if (gap < foe.r + 18 && foe.attackCd <= 0) {
        foe.attackCd = 0.9;
        hurtPlayer(10, Math.sign(p.x - foe.x) * 145, -120);
      }
    } else {
      const range = foe.type === "forest_guardian" ? 620 : 360;
      const gap = Math.abs(p.x - foe.x);
      const standingPlat = foe.onGround
        ? floor.platforms.find((plat) => (
          Math.abs(foe.y - plat.y) < 2 &&
          foe.x >= plat.x - foe.r * 0.45 &&
          foe.x <= plat.x + plat.w + foe.r * 0.45
        ))
        : null;

      if (foe.type === "shade" && gap < range && gap > foe.r + 90) {
        foe.facing = Math.sign(p.x - foe.x || foe.facing);
        if (foe.rangedCd <= 0) {
          foe.rangedCd = 1.7;
          const dy = (p.y - 28) - foe.y;
          const mag = Math.hypot(p.x - foe.x, dy) || 1;
          fireShadeBolt(foe, (p.x - foe.x) / mag, dy / mag, game.forestDungeon.enemyProjectiles);
        }
      } else if (gap < range) {
        foe.facing = Math.sign(p.x - foe.x || foe.facing);
        const speed = foe.type === "forest_guardian" ? 84 : 70;
        foe.x += foe.facing * speed * dt + foe.vx * dt;
      } else {
        foe.facing = Math.sign(Math.sin(game.time + foe.patrol)) || 1;
        foe.x += foe.facing * 34 * dt;
      }

      if (standingPlat) {
        const margin = foe.r * 0.4;
        foe.x = clamp(foe.x, standingPlat.x + margin, standingPlat.x + standingPlat.w - margin);
      }

      resolveGroundEnemy(foe, floor, dt);
      foe.vx *= 0.86;
      if (Math.abs(p.x - foe.x) < foe.r + 18 && Math.abs(p.y - foe.y) < 70 && foe.attackCd <= 0) {
        foe.attackCd = foe.type === "forest_guardian" ? 0.82 : 1;
        hurtPlayer(foe.type === "forest_guardian" ? 22 : 10, foe.facing * 210, -170);
      }
    }
  }
}

function tryOpenForestDungeonChest() {
  const p = game.player;
  const floor = activeForestDungeonFloor();
  const chest = floor.chest;
  if (forestDungeonData.openedChests.has(chest.id)) return false;
  if (dist(p.x, p.y - 28, chest.x + chest.w / 2, chest.y + chest.h / 2) > 74) return false;
  if (!tapped("e")) return false;

  forestDungeonData.openedChests.add(chest.id);
  game.player.gold += 80;
  showToast("Found a stash left by whatever held this place. +80 gold.");
  addMote(game.forestDungeon.motes, chest.x + chest.w / 2, chest.y + chest.h / 2, "#fff6dc", 16);
  saveCurrentGame();
  return true;
}

function switchToCastleInterior() {
  game.mode = "castle";
  const p = game.player;
  p.x = castleInteriorData.entry.x;
  p.y = castleInteriorData.entry.y;
  p.vx = 0;
  p.vy = 0;
  p.facingX = 1;
  p.facingY = 0;
  showToast("Entered the great hall of Königsburg.");
}

function switchToLevel1() {
  game.mode = "level1";
  const clearingStation = levelOneData.wagons.find((wagon) => wagon.id === "l1-clearing");
  if (clearingStation) clearingStation.discovered = true;
  const p = game.player;
  p.x = levelOneData.spawn.x;
  p.y = levelOneData.spawn.y;
  p.vx = 0;
  p.vy = 0;
  p.facingX = 0;
  p.facingY = 1;
  snapCompanionToPlayer();
  saveCurrentGame();
  showCutscene("Frieren", [
    "...",
    "Where... is this?",
    "Flowers. A whole field of them. And not a soul in sight.",
    "Königsburg is gone. The road is gone. Even the sky looks wrong.",
    "Well. Standing here won't answer anything.",
  ]);
}

function updateLevel1(dt) {
  const p = game.player;
  for (const wagon of levelOneData.wagons) {
    if (!wagon.discovered && dist(p.x, p.y, wagon.x, wagon.y) < wagon.discoverRadius) {
      wagon.discovered = true;
      showToast(`${wagon.name} discovered. Wagons now travel here.`);
      saveCurrentGame();
    }
  }
  maybeTriggerMountainBossIntro(p);
  if (game.dialogue.active) return;
  let mx = (held("d", "arrowright") ? 1 : 0) - (held("a", "arrowleft") ? 1 : 0);
  let my = (held("s", "arrowdown") ? 1 : 0) - (held("w", "arrowup") ? 1 : 0);
  const mag = Math.hypot(mx, my) || 1;
  mx /= mag;
  my /= mag;

  if (mx || my) {
    p.facingX = mx;
    p.facingY = my;
  }
  p.moving = Boolean(mx || my);

  if (tapped(" ") && p.stamina >= 28 && p.dodgeTime <= 0) {
    p.stamina -= 28;
    p.dodgeTime = 0.28;
    if (!mx && !my) mx = p.facingX || 1;
    if (!mx && !my) my = p.facingY;
  }

  const speed = p.dodgeTime > 0 ? 520 : 185;
  p.x += mx * speed * dt;
  p.y += my * speed * dt;
  p.x = clamp(p.x, 40, levelOneData.width - 40);
  p.y = clamp(p.y, 40, levelOneData.height - 40);

  for (const tree of levelOneData.trees) {
    const gap = dist(p.x, p.y, tree.x, tree.y);
    const minGap = 30;
    if (gap < minGap) {
      const nx = (p.x - tree.x) / (gap || 1);
      const ny = (p.y - tree.y) / (gap || 1);
      p.x = tree.x + nx * minGap;
      p.y = tree.y + ny * minGap;
    }
  }

  for (const rock of levelOneData.mountain.rocks) {
    const gap = dist(p.x, p.y, rock.x, rock.y);
    const minGap = rock.r + 22;
    if (gap < minGap) {
      const nx = (p.x - rock.x) / (gap || 1);
      const ny = (p.y - rock.y) / (gap || 1);
      p.x = rock.x + nx * minGap;
      p.y = rock.y + ny * minGap;
    }
  }

  resolveAabbCollisions(p, levelOneData.lakeBlobs, 18);
  resolveAabbCollisions(p, [levelOneCabinSolid()], 18);


  if (tapped("r") && dist(p.x, p.y, levelOneData.shrine.x, levelOneData.shrine.y) < levelOneData.shrine.r + 30) {
    p.hp = p.maxHp;
    p.stamina = p.maxStamina;
    p.mana = p.maxMana;
    game.respawn = { mode: "level1", x: levelOneData.shrine.x, y: levelOneData.shrine.y + 50 };
    showToast("The shrine answers. Strength returns.");
    saveCurrentGame();
  }

  if (tapped("e")) {
    const cabin = levelOneData.cabin;
    if (dist(p.x, p.y, cabin.doorX, cabin.doorY) < 70) {
      switchToCabinInterior();
      return;
    }
    const himmel = levelOneData.himmel;
    if (!himmel.questAccepted && dist(p.x, p.y, himmel.x, himmel.y) < 90) {
      talkToHimmel();
      return;
    }
    const elder = levelOneData.elder;
    if (dist(p.x, p.y, elder.x, elder.y) < 90) {
      talkToElder();
      return;
    }
    const dungeonEntrance = levelOneData.southForest.dungeonEntrance;
    if (dist(p.x, p.y, dungeonEntrance.x, dungeonEntrance.y) < 80) {
      switchToForestDungeon();
      return;
    }
    const wagon = levelOneData.wagons.find((w) => dist(p.x, p.y, w.x, w.y) < 80);
    if (wagon) {
      game.map.open = true;
      game.map.selected = 0;
      return;
    }
  }

  if (tapped("j") && p.attackCd <= 0) {
    p.attackCd = 0.22;
    if (p.character === "stark") castSturmklinge("level1");
    else castZoltraak("level1");
  }
  if (tapped("k")) castBlackHole("level1");

  updateLevelOneEnemies(dt);
  updateCompanion(dt, game.level1.enemies, game.level1.motes);
  updateProjectiles(
    game.level1.projectiles,
    game.level1.enemies.concat(game.level1.boss ? [game.level1.boss] : []),
    game.level1.motes,
    dt,
    "level1",
  );
  updateEnemyProjectiles(game.level1.enemyProjectiles, game.level1.motes, dt);
  updateMotes(game.level1.motes, dt);
}

function levelOneCabinSolid() {
  const cabin = levelOneData.cabin;
  return { x: cabin.x - 56, y: cabin.y - 86, w: 112, h: 96 };
}

function talkToHimmel() {
  const himmel = levelOneData.himmel;
  if (!himmel.talked) {
    himmel.talked = true;
    showCutscene("Himmel", [
      "Oh — hello there! I didn't expect to find anyone else out here, let alone someone waking up in the flowers.",
      "Name's Himmel. I'm putting together a party to take down the Demon King, if you can believe that.",
      "You've got the look of someone who's seen a few things. Care to join me?",
    ], [
      { label: "Join him.", onSelect: () => acceptHimmelQuest() },
      { label: "Not yet.", onSelect: () => showCutscene("Himmel", ["Fair enough. I'll be around — this clearing is hard to forget."]) },
    ]);
  } else if (himmel.questAccepted) {
    showCutscene("Himmel", [
      "Whenever you're ready, just say the word. The Demon King isn't going anywhere — unfortunately.",
    ]);
  } else {
    showCutscene("Himmel", [
      "Still thinking it over? No rush. Heroes are made on their own schedule.",
    ], [
      { label: "Join him.", onSelect: () => acceptHimmelQuest() },
      { label: "Not yet.", onSelect: () => showCutscene("Himmel", ["Take your time."]) },
    ]);
  }
}

function acceptHimmelQuest() {
  levelOneData.himmel.questAccepted = true;
  game.companion.x = levelOneData.himmel.x - 40;
  game.companion.y = levelOneData.himmel.y;
  showToast("Quest accepted: join Himmel against the Demon King.");
  saveCurrentGame();
}

function talkToElder() {
  const elder = levelOneData.elder;
  if (!elder.talked) {
    elder.talked = true;
    showCutscene(elder.name, [
      "A new face. You'll have come down the forest road, then — past the lake, I'd guess.",
      "The Schartenpass east of here used to lead traders north. Bandits and worse have held it for a season now.",
      "Clear the pass to the summit shrine and the road opens again. I can't pay much, but the village won't forget it.",
    ], [
      { label: "I'll clear the pass.", onSelect: () => acceptElderQuest() },
      { label: "Not right now.", onSelect: () => showCutscene(elder.name, ["The pass isn't going anywhere. Come find me when you're ready."]) },
    ]);
  } else if (elder.passCleared && !elder.rewardClaimed) {
    showCutscene(elder.name, [
      "You're back, and the wyrm's roar has finally stopped echoing off these walls. You did it.",
      "I've little to offer a mage of your talent, but take your pick — coin for the road, or this. It's been in my family longer than the pass has been overrun.",
    ], [
      { label: "Take the gold.", onSelect: () => claimElderReward("gold") },
      { label: "Take the grimoire.", onSelect: () => claimElderReward("grimoire") },
    ]);
  } else if (elder.rewardClaimed) {
    showCutscene(elder.name, [
      "You did it — the pass is clear. Already the village sleeps easier.",
    ]);
  } else if (elder.questAccepted) {
    showCutscene(elder.name, [
      "The Schartenpass is northeast of the village, past the rocks. Watch yourself on the climb — something's nesting up there.",
    ]);
  } else {
    showCutscene(elder.name, [
      "The pass is still overrun, if you've changed your mind.",
    ], [
      { label: "I'll clear the pass.", onSelect: () => acceptElderQuest() },
      { label: "Not right now.", onSelect: () => showCutscene(elder.name, ["No shame in waiting."]) },
    ]);
  }
}

function acceptElderQuest() {
  levelOneData.elder.questAccepted = true;
  showToast("Quest accepted: clear the Schartenpass.");
  saveCurrentGame();
}

function claimElderReward(choice) {
  const elder = levelOneData.elder;
  elder.rewardClaimed = true;
  const p = game.player;
  if (choice === "gold") {
    p.gold += 150;
    showToast("Roswitha presses 150 gold into your hand.");
  } else {
    const spell = p.spells.zoltraak;
    spell.level += 1;
    spell.power += 12;
    spell.range += 60;
    showSpellLearned(
      "Familiengrimoire: Zoltraak-Vertiefung",
      "An old family grimoire, passed down for generations. Zoltraak's level, power, and range all increase.",
    );
  }
  saveCurrentGame();
}

// Himmel travels with Frieren once recruited — a frontline sword fighter who
// engages whatever threatens her. Currently wired into the top-down spaces
// (overworld, Level 1); the side-view dungeon/crypt platforming would need
// its own jump-aware follow AI, which isn't built yet.
function companionActive() {
  return levelOneData.himmel.questAccepted && game.player.character === "frieren";
}

function updateCompanion(dt, enemies, bucket) {
  if (!companionActive()) return;
  const c = game.companion;
  const p = game.player;
  c.attackCd = Math.max(0, c.attackCd - dt);
  c.attackTime = Math.max(0, c.attackTime - dt);

  let target = null;
  let targetDist = Infinity;
  for (const foe of enemies) {
    if (!foe || foe.dead) continue;
    const d = dist(p.x, p.y, foe.x, foe.y);
    if (d < 420 && d < targetDist) {
      target = foe;
      targetDist = d;
    }
  }

  let desiredX;
  let desiredY;
  if (target) {
    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    desiredX = target.x - Math.cos(angle) * (target.r + 36);
    desiredY = target.y - Math.sin(angle) * (target.r + 36);
  } else {
    desiredX = p.x - 46;
    desiredY = p.y + 30;
  }

  const toDesired = dist(c.x, c.y, desiredX, desiredY);
  if (toDesired > 600) {
    // scene just changed underneath him — catch up instantly instead of
    // sprinting visibly across an unrelated map
    c.x = desiredX;
    c.y = desiredY;
    c.moving = false;
  } else {
    c.moving = toDesired > 12;
    if (c.moving) {
      const speed = 220;
      const nx = (desiredX - c.x) / (toDesired || 1);
      const ny = (desiredY - c.y) / (toDesired || 1);
      c.x += nx * speed * dt;
      c.y += ny * speed * dt;
      if (Math.abs(nx) > 0.05) c.facing = Math.sign(nx);
    }
  }

  if (target) {
    c.facing = Math.sign(target.x - c.x) || c.facing;
    const reach = 58 + target.r;
    if (dist(c.x, c.y, target.x, target.y) < reach && c.attackCd <= 0) {
      c.attackCd = 0.85;
      c.attackTime = HIMMEL_ATTACK_DURATION;
      attackCircle(c.x + c.facing * 30, c.y, 46, 26, enemies, bucket);
      addSlashFx(bucket, c.x + c.facing * 40, c.y - 10, c.facing, "#fff6dc");
    }
  }
}

function drawCompanion() {
  if (!companionActive()) return;
  drawCompanionSprite(game.companion, 0.22);
}

// Side-view companion AI: gravity + platform snapping (reusing the same
// constants as the player's own platforming) plus a simple jump heuristic —
// jump when grounded and either the target is well above him, or he's been
// pressed against something without making horizontal progress for a beat.
function updateCompanionSideView(dt, floor, enemies, bucket) {
  if (!companionActive()) return;
  const c = game.companion;
  const p = game.player;
  c.attackCd = Math.max(0, c.attackCd - dt);
  c.attackTime = Math.max(0, c.attackTime - dt);

  let target = null;
  let targetDist = Infinity;
  for (const foe of enemies) {
    if (!foe || foe.dead) continue;
    const d = dist(p.x, p.y, foe.x, foe.y);
    if (d < 420 && d < targetDist) {
      target = foe;
      targetDist = d;
    }
  }

  const desiredX = target ? target.x - Math.sign(target.x - c.x || 1) * (target.r + 50) : p.x - 50;

  if (dist(c.x, c.y, p.x, p.y) > 1400) {
    // scene just changed underneath him — catch up instantly
    c.x = p.x - 50;
    c.y = p.y;
    c.vy = 0;
    c.onGround = false;
    c.moving = false;
  } else {
    const dx = desiredX - c.x;
    c.moving = Math.abs(dx) > 8;
    if (c.moving) {
      const moveDir = Math.sign(dx);
      c.x += moveDir * 210 * dt;
      c.facing = moveDir;
    }

    c.vy += 1280 * dt;
    const wasGrounded = c.onGround;
    c.onGround = false;
    const movedSinceLast = Math.abs(c.x - c.lastX);
    c.stuckTime = c.moving && movedSinceLast < 4 ? c.stuckTime + dt : 0;
    c.lastX = c.x;

    const targetAbove = target && target.y < c.y - 60;
    if (wasGrounded && (targetAbove || c.stuckTime > 0.3)) {
      c.vy = -620;
      c.stuckTime = 0;
    }

    c.y += c.vy * dt;
    for (const plat of floor.platforms) {
      const withinX = c.x > plat.x - 20 && c.x < plat.x + plat.w + 20;
      if (withinX && c.vy >= 0 && c.y >= plat.y && c.y <= plat.y + 16) {
        c.y = plat.y;
        c.vy = 0;
        c.onGround = true;
      }
    }
    if (c.y > forestDungeonData.height + 200) {
      c.x = p.x - 50;
      c.y = p.y;
      c.vy = 0;
    }
  }

  if (target) {
    c.facing = Math.sign(target.x - c.x) || c.facing;
    const reach = 58 + target.r;
    if (Math.abs(target.x - c.x) < reach && Math.abs(target.y - c.y) < 70 && c.attackCd <= 0) {
      c.attackCd = 0.85;
      c.attackTime = HIMMEL_ATTACK_DURATION;
      attackCircle(c.x + c.facing * 30, c.y, 46, 26, enemies, bucket);
      addSlashFx(bucket, c.x + c.facing * 40, c.y - 10, c.facing, "#fff6dc");
    }
  }
}

function switchToOverworldFromCastle() {
  game.mode = "overworld";
  const p = game.player;
  const town = overworldData.castleTown;
  p.x = town.keepDoorX - 70;
  p.y = town.keepDoorY;
  p.vx = 0;
  p.vy = 0;
  p.facingX = -1;
  p.facingY = 0;
}

function updateCastleInterior(dt) {
  const p = game.player;
  const room = castleInteriorData;

  if (handleCastleNpcInteraction()) return;

  let mx = (held("d", "arrowright") ? 1 : 0) - (held("a", "arrowleft") ? 1 : 0);
  let my = (held("s", "arrowdown") ? 1 : 0) - (held("w", "arrowup") ? 1 : 0);
  const mag = Math.hypot(mx, my) || 1;
  mx /= mag;
  my /= mag;
  if (mx || my) {
    p.facingX = mx;
    p.facingY = my;
  }
  p.moving = Boolean(mx || my);

  const speed = 175;
  p.x += mx * speed * dt;
  p.y += my * speed * dt;
  p.x = clamp(p.x, 4, room.width - 4);
  p.y = clamp(p.y, 4, room.height - 4);
  resolveAabbCollisions(p, castleInteriorWalls(), 18);

  for (const pillar of room.pillars) {
    const gap = dist(p.x, p.y, pillar.x, pillar.y);
    const minGap = pillar.r + 22;
    if (gap < minGap) {
      const nx = (p.x - pillar.x) / (gap || 1);
      const ny = (p.y - pillar.y) / (gap || 1);
      p.x = pillar.x + nx * minGap;
      p.y = pillar.y + ny * minGap;
    }
  }

  if (tapped("e") && rectContains(room.exit, p.x, p.y)) {
    switchToOverworldFromCastle();
    return;
  }
}

function handleCastleNpcInteraction() {
  const p = game.player;
  const king = castleInteriorData.king;
  if (!tapped("e")) return false;
  if (dist(p.x, p.y, king.x, king.y) > 95) return false;

  if (!king.greeted) {
    king.greeted = true;
    game.player.gold += 40;
    showCutscene(king.name, [...king.linesFirst, "Take this for the road. Königsburg pays its debts."]);
  } else if (game.level1.started) {
    showCutscene(king.name, king.questAcceptedRepeat);
  } else if (game.won && game.player.character === "frieren") {
    showCutscene(
      king.name,
      king.questOffer,
      [
        { label: "Accept the quest.", onSelect: () => acceptLevel1Quest() },
        { label: "Not yet.", onSelect: () => showCutscene(king.name, king.questDeclineLines) },
      ],
    );
  } else if (game.won) {
    showCutscene(king.name, [
      "You've done well for Heiterfeld. But the road I have in mind isn't yours to walk yet.",
      "There's someone else I need to speak with first. Patience.",
    ]);
  } else {
    showCutscene(king.name, king.linesRepeat);
  }
  return true;
}

function acceptLevel1Quest() {
  const king = castleInteriorData.king;
  game.level1.started = true;
  saveCurrentGame();
  showCutscene(king.name, king.questAcceptLines, null, () => switchToLevel1());
}

function collectGrimoireIfReady() {
  const grimoire = overworldData.grimoire;
  const p = game.player;
  if (!overworldData.bramble.cleared || grimoire.collected) return false;
  if (dist(p.x, p.y, grimoire.x, grimoire.y) > 62) return false;
  if (!tapped("e")) return false;

  const spell = p.spells.zoltraak;
  grimoire.collected = true;
  spell.level += 1;
  spell.range += grimoire.rangeBoost;
  spell.power += grimoire.powerBoost;
  p.maxMana += grimoire.manaBoost;
  p.mana = p.maxMana;
  showSpellLearned(
    grimoire.name,
    "Zoltraak's range and power increase. The thin killing spell Frieren started with finally has some teeth.",
  );
  return true;
}

function switchToOverworld() {
  game.mode = "overworld";
  const p = game.player;
  p.x = overworldData.portal.x - 92;
  p.y = overworldData.portal.y + 48;
  p.vx = 0;
  p.vy = 0;
  p.facingX = -1;
  p.facingY = 0;
  snapCompanionToPlayer();
}

function updateDungeon(dt) {
  if (updateMimicEvent(dt)) return;

  const p = game.player;
  const floor = activeDungeonFloor();
  maybeTriggerRitterIntro(floor, p);
  if (game.dialogue.active) return;

  const left = held("a", "arrowleft");
  const right = held("d", "arrowright");
  const wish = (right ? 1 : 0) - (left ? 1 : 0);
  const accel = p.onGround ? 2750 : 1880;
  const maxSpeed = 255;
  p.vx += wish * accel * dt;
  if (!wish) p.vx *= p.onGround ? 0.78 : 0.95;
  p.vx = clamp(p.vx, -maxSpeed, maxSpeed);
  if (wish) {
    p.facingX = wish;
    p.facingY = 0;
  }
  p.moving = Math.abs(p.vx) > 18 && p.onGround;

  p.coyote = p.onGround ? 0.16 : Math.max(0, p.coyote - dt);
  if (tapped(" ", "w", "arrowup") && (p.onGround || p.coyote > 0)) {
    p.vy = -630;
    p.onGround = false;
    p.coyote = 0;
  }

  const flight = p.spells.flugmagie;
  const weightRatio = p.inventory.weight / Math.max(1, p.inventory.maxComfortWeight);
  const flightDrainMultiplier = 1 + Math.max(0, weightRatio - 1) * 0.85 + weightRatio * 0.25;
  const usingFlight = flight.known && held(" ") && !p.onGround && p.vy > -220 && p.mana > 0 && flight.remaining > 0;
  if (usingFlight) {
    const manaDrainPerSecond = p.maxMana / flight.maxHold;
    p.mana = Math.max(0, p.mana - manaDrainPerSecond * flightDrainMultiplier * dt);
    flight.remaining = Math.max(0, flight.remaining - dt * flightDrainMultiplier);
    p.flightTime = 0.16;
    p.vy = Math.min(p.vy, flight.fallCap);
    p.vy += flight.lift * dt;
  } else {
    p.vy += 1280 * dt;
  }
  p.vy = Math.min(p.vy, usingFlight ? flight.fallCap : 760);
  p.x += p.vx * dt;
  resolveDungeonX(p);
  const wasGrounded = p.onGround;
  const fallVy = p.vy;
  p.y += p.vy * dt;
  resolveDungeonY(p);
  if (!wasGrounded && p.onGround) handleLanding(fallVy);
  p.x = clamp(p.x, 26, floor.width - 26);

  if (p.y > dungeonData.height + 80) {
    hurtPlayer(18);
    p.x = floor.start.x;
    p.y = floor.start.y;
    p.vx = 0;
    p.vy = 0;
  }

  if (tapped("j") && p.attackCd <= 0) {
    p.attackCd = 0.22;
    if (p.character === "stark") castSturmklinge("dungeon");
    else castZoltraak("dungeon");
  }
  if (tapped("k")) castBlackHole("dungeon");

  for (const spike of floor.spikes) {
    if (circleRect(p.x, p.y - 22, 22, spike)) {
      hurtPlayer(15, -Math.sign(p.vx || p.facingX) * 120, -280);
      p.vy = -260;
    }
  }

  if (tryOpenDungeonChest()) return;

  if (floor.descent && tapped("e") && rectContains(floor.descent, p.x, p.y - 35)) {
    const nextIndex = game.dungeon.floorIndex + 1;
    if (nextIndex < dungeonData.floors.length) {
      activateDungeonFloor(nextIndex);
      const nextFloor = activeDungeonFloor();
      p.x = nextFloor.start.x;
      p.y = nextFloor.start.y;
      p.vx = 0;
      p.vy = 0;
      p.facingX = 1;
      showToast(`Descended to ${nextFloor.name}.`);
      return;
    }
  }

  if (floor.exit && tapped("e") && rectContains(floor.exit, p.x, p.y - 35)) {
    if (game.dungeon.completed) {
      switchToOverworld();
      showToast("Back in Heiterfeld. Find Heine and hand over the relic.");
    } else {
      showToast("The Ausgangstor is barred until the Ritter falls.");
    }
  }

  updateDungeonEnemies(dt);
  updateProjectiles(
    game.dungeon.projectiles,
    game.dungeon.enemies.concat(game.dungeon.boss ? [game.dungeon.boss] : []),
    game.dungeon.motes,
    dt,
    "dungeon",
  );
  updateEnemyProjectiles(game.dungeon.enemyProjectiles, game.dungeon.motes, dt);
  updateMotes(game.dungeon.motes, dt);
}

function updateCrypt(dt) {
  const p = game.player;
  const floor = activeCryptFloor();
  maybeTriggerCryptBossIntro(floor, p);
  if (game.dialogue.active) return;

  const left = held("a", "arrowleft");
  const right = held("d", "arrowright");
  const wish = (right ? 1 : 0) - (left ? 1 : 0);
  const accel = p.onGround ? 2750 : 1880;
  const maxSpeed = 255;
  p.vx += wish * accel * dt;
  if (!wish) p.vx *= p.onGround ? 0.78 : 0.95;
  p.vx = clamp(p.vx, -maxSpeed, maxSpeed);
  if (wish) {
    p.facingX = wish;
    p.facingY = 0;
  }
  p.moving = Math.abs(p.vx) > 18 && p.onGround;

  p.coyote = p.onGround ? 0.16 : Math.max(0, p.coyote - dt);
  if (tapped(" ", "w", "arrowup") && (p.onGround || p.coyote > 0)) {
    p.vy = -630;
    p.onGround = false;
    p.coyote = 0;
  }

  const flight = p.spells.flugmagie;
  const weightRatio = p.inventory.weight / Math.max(1, p.inventory.maxComfortWeight);
  const flightDrainMultiplier = 1 + Math.max(0, weightRatio - 1) * 0.85 + weightRatio * 0.25;
  const usingFlight = flight.known && held(" ") && !p.onGround && p.vy > -220 && p.mana > 0 && flight.remaining > 0;
  if (usingFlight) {
    const manaDrainPerSecond = p.maxMana / flight.maxHold;
    p.mana = Math.max(0, p.mana - manaDrainPerSecond * flightDrainMultiplier * dt);
    flight.remaining = Math.max(0, flight.remaining - dt * flightDrainMultiplier);
    p.flightTime = 0.16;
    p.vy = Math.min(p.vy, flight.fallCap);
    p.vy += flight.lift * dt;
  } else {
    p.vy += 1280 * dt;
  }
  p.vy = Math.min(p.vy, usingFlight ? flight.fallCap : 760);
  p.x += p.vx * dt;
  resolveCryptX(p);
  const wasGrounded = p.onGround;
  const fallVy = p.vy;
  p.y += p.vy * dt;
  resolveCryptY(p);
  if (!wasGrounded && p.onGround) handleLanding(fallVy);
  p.x = clamp(p.x, 26, floor.width - 26);

  if (p.y > cryptData.height + 80) {
    hurtPlayer(18);
    p.x = floor.start.x;
    p.y = floor.start.y;
    p.vx = 0;
    p.vy = 0;
  }

  if (tapped("j") && p.attackCd <= 0) {
    p.attackCd = 0.22;
    if (p.character === "stark") castSturmklinge("crypt");
    else castZoltraak("crypt");
  }
  if (tapped("k")) castBlackHole("crypt");

  for (const spike of floor.spikes) {
    if (circleRect(p.x, p.y - 22, 22, spike)) {
      hurtPlayer(15, -Math.sign(p.vx || p.facingX) * 120, -280);
      p.vy = -260;
    }
  }

  if (tryOpenCryptChest()) return;

  if (floor.descent && tapped("e") && rectContains(floor.descent, p.x, p.y - 35)) {
    const nextIndex = game.crypt.floorIndex + 1;
    if (nextIndex < cryptData.floors.length) {
      activateCryptFloor(nextIndex);
      const nextFloor = activeCryptFloor();
      p.x = nextFloor.start.x;
      p.y = nextFloor.start.y;
      p.vx = 0;
      p.vy = 0;
      p.facingX = 1;
      showToast(`Descended to ${nextFloor.name}.`);
      return;
    }
  }

  if (floor.exit && tapped("e") && rectContains(floor.exit, p.x, p.y - 35)) {
    if (game.crypt.completed) {
      switchToOverworldFromCrypt();
      showToast("Back in Königsburg, royal blood still on the axe.");
    } else {
      showToast("The grave-gate is barred until the Fallen King falls again.");
    }
  }

  updateCryptEnemies(dt);
  updateProjectiles(
    game.crypt.projectiles,
    game.crypt.enemies.concat(game.crypt.boss ? [game.crypt.boss] : []),
    game.crypt.motes,
    dt,
    "crypt",
  );
  updateEnemyProjectiles(game.crypt.enemyProjectiles, game.crypt.motes, dt);
  updateMotes(game.crypt.motes, dt);
}

function resolveDungeonX(p) {
  const body = { x: p.x - 18, y: p.y - 58, w: 36, h: 58 };
  for (const plat of dungeonSolids()) {
    if (!rectsOverlap(body, plat)) continue;
    if (p.vx > 0) p.x = plat.x - 18;
    if (p.vx < 0) p.x = plat.x + plat.w + 18;
    p.vx = 0;
    body.x = p.x - 18;
  }
}

function resolveDungeonY(p) {
  p.onGround = false;
  const body = { x: p.x - 18, y: p.y - 58, w: 36, h: 58 };
  for (const plat of dungeonSolids()) {
    if (!rectsOverlap(body, plat)) continue;
    if (p.vy > 0) {
      p.y = plat.y;
      p.vy = 0;
      p.onGround = true;
    } else if (p.vy < 0) {
      p.y = plat.y + plat.h + 58;
      p.vy = 0;
    }
    body.y = p.y - 58;
  }
}

function resolveCryptX(p) {
  const body = { x: p.x - 18, y: p.y - 58, w: 36, h: 58 };
  for (const plat of cryptSolids()) {
    if (!rectsOverlap(body, plat)) continue;
    if (p.vx > 0) p.x = plat.x - 18;
    if (p.vx < 0) p.x = plat.x + plat.w + 18;
    p.vx = 0;
    body.x = p.x - 18;
  }
}

function resolveCryptY(p) {
  p.onGround = false;
  const body = { x: p.x - 18, y: p.y - 58, w: 36, h: 58 };
  for (const plat of cryptSolids()) {
    if (!rectsOverlap(body, plat)) continue;
    if (p.vy > 0) {
      p.y = plat.y;
      p.vy = 0;
      p.onGround = true;
    } else if (p.vy < 0) {
      p.y = plat.y + plat.h + 58;
      p.vy = 0;
    }
    body.y = p.y - 58;
  }
}

function handleLanding(landingVy) {
  const p = game.player;
  const flight = p.spells.flugmagie;
  const cushioned = p.flightTime > 0;
  p.lastLandingVy = landingVy;
  if (flight.known) flight.remaining = flight.maxHold;

  if (cushioned) {
    showToast("Flugmagie cushioned the landing.");
    return;
  }

  const safeLanding = 735;
  if (landingVy <= safeLanding) return;
  const damage = Math.min(34, Math.ceil((landingVy - safeLanding) / 22));
  hurtPlayer(damage, 0, -130);
  showToast(`Hard landing. Fall damage: ${damage}.`);
}

function updateDungeonEnemies(dt) {
  const p = game.player;
  const floor = activeDungeonFloor();
  const enemies = game.dungeon.enemies.concat(game.dungeon.boss ? [game.dungeon.boss] : []);
  for (const foe of enemies) {
    if (!foe || foe.dead) continue;
    foe.hurt = Math.max(0, foe.hurt - dt);
    foe.attackCd = Math.max(0, foe.attackCd - dt);
    foe.rangedCd = Math.max(0, foe.rangedCd - dt);
    if (foe.type === "bat") {
      const gap = dist(p.x, p.y - 28, foe.x, foe.y);
      if (gap < 520) {
        foe.x += ((p.x - foe.x) / (gap || 1)) * 82 * dt;
        foe.y += ((p.y - 70 - foe.y) / (gap || 1)) * 82 * dt;
      } else {
        foe.x += Math.sin(game.time * 2 + foe.patrol) * 34 * dt;
        foe.y += Math.cos(game.time * 1.5 + foe.patrol) * 18 * dt;
      }
      if (gap < foe.r + 18 && foe.attackCd <= 0) {
        foe.attackCd = 0.9;
        hurtPlayer(10, Math.sign(p.x - foe.x) * 145, -120);
      }
    } else {
      const range = foe.type === "knight" ? 620 : 360;
      const gap = Math.abs(p.x - foe.x);
      const standingPlat = foe.onGround
        ? floor.platforms.find((plat) => (
          Math.abs(foe.y - plat.y) < 2 &&
          foe.x >= plat.x - foe.r * 0.45 &&
          foe.x <= plat.x + plat.w + foe.r * 0.45
        ))
        : null;

      if (foe.type === "shade" && gap < range && gap > foe.r + 90) {
        foe.facing = Math.sign(p.x - foe.x || foe.facing);
        if (foe.rangedCd <= 0) {
          foe.rangedCd = 1.7;
          const dy = (p.y - 28) - foe.y;
          const mag = Math.hypot(p.x - foe.x, dy) || 1;
          fireShadeBolt(foe, (p.x - foe.x) / mag, dy / mag, game.dungeon.enemyProjectiles);
        }
      } else if (gap < range) {
        foe.facing = Math.sign(p.x - foe.x || foe.facing);
        const speed = foe.type === "knight" ? 82 : 70;
        foe.x += foe.facing * speed * dt + foe.vx * dt;
      } else {
        foe.facing = Math.sign(Math.sin(game.time + foe.patrol)) || 1;
        foe.x += foe.facing * 34 * dt;
      }

      if (standingPlat) {
        const margin = foe.r * 0.4;
        foe.x = clamp(foe.x, standingPlat.x + margin, standingPlat.x + standingPlat.w - margin);
      }

      resolveGroundEnemy(foe, floor, dt);
      foe.vx *= 0.86;
      if (Math.abs(p.x - foe.x) < foe.r + 18 && Math.abs(p.y - foe.y) < 70 && foe.attackCd <= 0) {
        foe.attackCd = foe.type === "knight" ? 0.82 : 1;
        hurtPlayer(foe.type === "knight" ? 18 : 10, foe.facing * 210, -170);
      }
    }
  }
}

function updateCryptEnemies(dt) {
  const p = game.player;
  const floor = activeCryptFloor();
  const enemies = game.crypt.enemies.concat(game.crypt.boss ? [game.crypt.boss] : []);
  for (const foe of enemies) {
    if (!foe || foe.dead) continue;
    foe.hurt = Math.max(0, foe.hurt - dt);
    foe.attackCd = Math.max(0, foe.attackCd - dt);
    foe.rangedCd = Math.max(0, foe.rangedCd - dt);
    if (foe.type === "bat") {
      const gap = dist(p.x, p.y - 28, foe.x, foe.y);
      if (gap < 520) {
        foe.x += ((p.x - foe.x) / (gap || 1)) * 82 * dt;
        foe.y += ((p.y - 70 - foe.y) / (gap || 1)) * 82 * dt;
      } else {
        foe.x += Math.sin(game.time * 2 + foe.patrol) * 34 * dt;
        foe.y += Math.cos(game.time * 1.5 + foe.patrol) * 18 * dt;
      }
      if (gap < foe.r + 18 && foe.attackCd <= 0) {
        foe.attackCd = 0.9;
        hurtPlayer(10, Math.sign(p.x - foe.x) * 145, -120);
      }
    } else {
      const range = foe.type === "cursed_king" ? 620 : 360;
      const gap = Math.abs(p.x - foe.x);
      const standingPlat = foe.onGround
        ? floor.platforms.find((plat) => (
          Math.abs(foe.y - plat.y) < 2 &&
          foe.x >= plat.x - foe.r * 0.45 &&
          foe.x <= plat.x + plat.w + foe.r * 0.45
        ))
        : null;

      if (foe.type === "wraith" && gap < range && gap > foe.r + 90) {
        foe.facing = Math.sign(p.x - foe.x || foe.facing);
        if (foe.rangedCd <= 0) {
          foe.rangedCd = 1.7;
          const dy = (p.y - 28) - foe.y;
          const mag = Math.hypot(p.x - foe.x, dy) || 1;
          fireWraithBolt(foe, (p.x - foe.x) / mag, dy / mag, game.crypt.enemyProjectiles);
        }
      } else if (gap < range) {
        foe.facing = Math.sign(p.x - foe.x || foe.facing);
        const speed = foe.type === "cursed_king" ? 86 : 70;
        foe.x += foe.facing * speed * dt + foe.vx * dt;
      } else {
        foe.facing = Math.sign(Math.sin(game.time + foe.patrol)) || 1;
        foe.x += foe.facing * 34 * dt;
      }

      if (standingPlat) {
        const margin = foe.r * 0.4;
        foe.x = clamp(foe.x, standingPlat.x + margin, standingPlat.x + standingPlat.w - margin);
      }

      resolveGroundEnemy(foe, floor, dt);
      foe.vx *= 0.86;
      if (Math.abs(p.x - foe.x) < foe.r + 18 && Math.abs(p.y - foe.y) < 70 && foe.attackCd <= 0) {
        foe.attackCd = foe.type === "cursed_king" ? 0.8 : 1;
        hurtPlayer(foe.type === "cursed_king" ? 20 : 11, foe.facing * 210, -170);
      }
    }
  }
}

function fireWraithBolt(foe, dirX, dirY, bucket) {
  const speed = 320;
  bucket.push({
    spell: "wraithBolt",
    x: foe.x + dirX * foe.r,
    y: foe.y + dirY * foe.r,
    vx: dirX * speed,
    vy: dirY * speed,
    traveled: 0,
    range: 700,
    damage: 13,
    r: 8,
    life: 2.2,
  });
}

function resolveGroundEnemy(foe, floor, dt) {
  const previousY = foe.y;
  foe.vy += 1150 * dt;
  foe.y += foe.vy * dt;
  foe.onGround = false;

  for (const plat of floor.platforms) {
    const footWithinX = foe.x > plat.x - foe.r * 0.45 && foe.x < plat.x + plat.w + foe.r * 0.45;
    if (!footWithinX) continue;
    if (previousY <= plat.y + 4 && foe.y >= plat.y) {
      foe.y = plat.y;
      foe.vy = 0;
      foe.onGround = true;
      break;
    }
  }

  if (!foe.onGround) return;
  const nearLedge = !floor.platforms.some((plat) => (
    foe.x + foe.facing * (foe.r + 18) > plat.x &&
    foe.x + foe.facing * (foe.r + 18) < plat.x + plat.w &&
    Math.abs(foe.y - plat.y) < 8
  ));
  if (nearLedge) foe.facing *= -1;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRect(cx, cy, r, rect) {
  const x = clamp(cx, rect.x, rect.x + rect.w);
  const y = clamp(cy, rect.y, rect.y + rect.h);
  return dist(cx, cy, x, y) < r;
}

function rectContains(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

// Pushes a top-down point (treated as a small square body) out of any solid
// rect it overlaps, along whichever axis has the least penetration.
function resolveAabbCollisions(p, rects, half = 16) {
  for (const rect of rects) {
    const left = p.x - half;
    const right = p.x + half;
    const top = p.y - half;
    const bottom = p.y + half;
    if (right <= rect.x || left >= rect.x + rect.w || bottom <= rect.y || top >= rect.y + rect.h) continue;

    const overlapLeft = right - rect.x;
    const overlapRight = rect.x + rect.w - left;
    const overlapTop = bottom - rect.y;
    const overlapBottom = rect.y + rect.h - top;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft) p.x = rect.x - half;
    else if (minOverlap === overlapRight) p.x = rect.x + rect.w + half;
    else if (minOverlap === overlapTop) p.y = rect.y - half;
    else p.y = rect.y + rect.h + half;
  }
}

function updateHud() {
  const p = game.player;
  hud.hp.style.width = `${(p.hp / p.maxHp) * 100}%`;
  hud.stamina.style.width = `${(p.stamina / p.maxStamina) * 100}%`;
  hud.mana.style.width = `${p.maxMana > 0 ? (p.mana / p.maxMana) * 100 : 0}%`;
  hud.gold.textContent = `Gold: ${p.gold}`;
  if (game.mode === "overworld") {
    hud.status.textContent = game.won
      ? `Heiterfeld | Zoltraak Lv.${p.spells.zoltraak.level} | Relic recovered`
      : `Heiterfeld | Zoltraak Lv.${p.spells.zoltraak.level}`;
    if (!overworldData.bramble.cleared) {
      hud.title.textContent = "Heines Krautgarten";
      hud.copy.textContent = "Talk to Heine, then clear the Fluchdorn bramble with weak Zoltraak.";
    } else if (!overworldData.grimoire.collected) {
      hud.title.textContent = "Kleines Zauberbuch";
      hud.copy.textContent = "Collect the grimoire to improve Zoltraak range and power.";
    } else if (!game.overworld.shadeDefeated) {
      hud.title.textContent = "Mondbrunnen";
      hud.copy.textContent = "Use upgraded Zoltraak to defeat Der Schatten guarding Hohlgrund.";
    } else if (p.relics >= 1 && !overworldData.villager.questComplete) {
      hud.title.textContent = "Heine";
      hud.copy.textContent = "You have the relic. Bring it back to Heine.";
    } else if (game.won) {
      hud.title.textContent = "Proof Loop Complete";
      hud.copy.textContent = "Heiterfeld, Hohlgrund, and back. Rest at camp or wander.";
    } else {
      hud.title.textContent = "Tor nach Hohlgrund";
      hud.copy.textContent = "Interact with the opened gate to enter the side-view dungeon.";
    }
  } else if (game.mode === "dungeon") {
    const floor = activeDungeonFloor();
    const flight = p.spells.flugmagie;
    const flightText = flight.known ? ` | Flug ${Math.ceil(flight.remaining * 10) / 10}s` : "";
    hud.status.textContent = `${floor.name} | Loot ${game.dungeon.lootFound}/6${flightText}`;
    hud.title.textContent = game.dungeon.completed ? "Ausgangstor" : floor.name;
    hud.copy.textContent = game.dungeon.completed
      ? "Mikheit says the final chest is a mimic. Leave, or test the one percent."
      : flight.known
        ? "Flugmagie is brief and weight-sensitive. Search carefully, land softly."
        : "Search cracked walls and hidden ledges. A grimoire may change how you move.";
  } else if (game.mode === "crypt") {
    const floor = activeCryptFloor();
    hud.status.textContent = `${floor.name} | Loot ${game.crypt.lootFound}/3`;
    hud.title.textContent = game.crypt.completed ? "Grabtor" : floor.name;
    hud.copy.textContent = game.crypt.completed
      ? "The Fallen King is silent now. The grave-gate will let you leave."
      : "Wraiths haunt these halls. Search niches and crumbling walls for the king's treasures.";
  } else if (game.mode === "castle") {
    hud.status.textContent = "Königsburg | Große Halle";
    hud.title.textContent = "Thronsaal";
    hud.copy.textContent = "Speak to the Duke, or leave through the door you entered.";
  } else if (game.mode === "level1") {
    hud.status.textContent = "Level 1 | Somewhere beyond the map";
    hud.title.textContent = "Awakening";
    hud.copy.textContent = "A field of flowers, and no road home in sight. Look around.";
  } else if (game.mode === "cabin") {
    hud.status.textContent = "Frierens Hütte";
    hud.title.textContent = "Zuhause";
    hud.copy.textContent = "Search the bookshelf, or leave the way you came in.";
  } else if (game.mode === "forestDungeon") {
    hud.status.textContent = `Waldverlies | ${forestDungeonData.cleared ? "Guardian defeated" : "Guardian ahead"}`;
    hud.title.textContent = "Waldverlies";
    hud.copy.textContent = forestDungeonData.cleared
      ? "The Waldwächter has fallen. The exit gate is open."
      : "Himmel fights at your side here. The gate is barred until the guardian falls.";
  }
}

function draw() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake * 30, (Math.random() - 0.5) * game.shake * 30);
  }
  if (game.mode === "overworld") drawOverworld();
  else if (game.mode === "dungeon") drawDungeon();
  else if (game.mode === "crypt") drawCrypt();
  else if (game.mode === "castle") drawCastleInteriorScene();
  else if (game.mode === "level1") drawLevel1();
  else if (game.mode === "cabin") drawCabinInteriorScene();
  else if (game.mode === "forestDungeon") drawForestDungeonScene();
  ctx.restore();
  if (game.map.open) drawMapOverlay();
}

function drawMapOverlay() {
  const p = game.player;
  const region = activeTravelRegion();
  const panelW = 330;
  const panelX = VIEW_W - panelW - 30;
  const panelY = 70;
  const panelH = VIEW_H - 110;
  const mapAreaX = 40;
  const mapAreaY = 80;
  const mapAreaW = panelX - mapAreaX - 30;
  const mapAreaH = VIEW_H - 140;
  const scaleX = mapAreaW / region.width;
  const scaleY = mapAreaH / region.height;
  const scale = Math.min(scaleX, scaleY);
  const mapW = region.width * scale;
  const mapH = region.height * scale;
  const offX = mapAreaX + (mapAreaW - mapW) / 2;
  const offY = mapAreaY + (mapAreaH - mapH) / 2;
  const origin = nearestWagon();
  const destinations = getWagonDestinations(allTravelWagons(), origin);
  const selectedDestination = destinations[game.map.selected] || null;

  ctx.fillStyle = "rgba(8,9,10,0.82)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#e7d8ab";
  ctx.fillRect(offX, offY, mapW, mapH);
  ctx.strokeStyle = "rgba(74,55,33,0.6)";
  ctx.lineWidth = 4;
  ctx.strokeRect(offX, offY, mapW, mapH);

  ctx.fillStyle = "#f5dd8b";
  ctx.font = "800 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${region.name} Map`, VIEW_W / 2, 44);

  for (const city of region.cities) {
    if (!city.known) continue;
    const x = offX + city.x * scale;
    const y = offY + city.y * scale;
    pixelRect(x - 6, y - 6, 12, 12, "#8b6238");
    drawMapLabel(x, y - 14, city.name, "#2c211b");
  }

  for (const dungeon of region.dungeons) {
    if (!dungeon.discovered) continue;
    const x = offX + dungeon.x * scale;
    const y = offY + dungeon.y * scale;
    ctx.fillStyle = "#5a3a26";
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x + 9, y + 7);
    ctx.lineTo(x - 9, y + 7);
    ctx.closePath();
    ctx.fill();
    drawMapLabel(x, y - 16, dungeon.name, "#2c211b");
  }

  for (const wagon of region.wagons) {
    if (!wagon.discovered) continue;
    const x = offX + wagon.x * scale;
    const y = offY + wagon.y * scale;
    const selected = selectedDestination?.id === wagon.id;
    if (selected) {
      ctx.strokeStyle = "#f6c453";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = selected ? "#f6c453" : "#3f5e8a";
    ctx.beginPath();
    ctx.arc(x, y, selected ? 8 : 7, 0, TAU);
    ctx.fill();
    drawMapLabel(x, y + 20, wagon.name, selected ? "#7a4515" : "#1c2a3a");
  }

  const px = offX + p.x * scale;
  const py = offY + p.y * scale;
  ctx.fillStyle = "#b33538";
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "rgba(12,13,14,0.88)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(245,221,139,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.fillStyle = "#f5dd8b";
  ctx.font = "900 16px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("FAST TRAVEL", panelX + 18, panelY + 30);
  ctx.fillStyle = "#fff6dc";
  ctx.font = "800 13px Inter, sans-serif";
  ctx.fillText(`Gold: ${p.gold}`, panelX + 18, panelY + 56);

  if (!origin) {
    wrapText(
      "Travel is only available while standing beside a discovered blue wagon station.",
      panelX + 18,
      panelY + 92,
      panelW - 36,
    );
  } else {
    ctx.fillStyle = "#b8c9e5";
    ctx.fillText(`FROM: ${origin.name}`, panelX + 18, panelY + 88);
    if (!destinations.length) {
      ctx.fillStyle = "#fff6dc";
      wrapText("No other wagon stations discovered yet.", panelX + 18, panelY + 122, panelW - 36);
    } else {
      destinations.forEach((destination, index) => {
        const rowY = panelY + 112 + index * 54;
        const selected = index === game.map.selected;
        ctx.fillStyle = selected ? "rgba(246,196,83,0.2)" : "rgba(255,255,255,0.04)";
        ctx.fillRect(panelX + 12, rowY, panelW - 24, 44);
        if (selected) {
          ctx.fillStyle = "#f6c453";
          ctx.fillRect(panelX + 12, rowY, 5, 44);
        }
        ctx.fillStyle = selected ? "#f5dd8b" : "#f4f1e8";
        ctx.font = "800 13px Inter, sans-serif";
        ctx.fillText(`${selected ? "▶" : " "} ${destination.name}`, panelX + 24, rowY + 18);
        ctx.fillStyle = selected ? "#fff6dc" : "rgba(244,241,232,0.7)";
        ctx.font = "700 11px Inter, sans-serif";
        ctx.fillText(
          `${destination.region} · ${travelCost(origin, destination)} gold`,
          panelX + 44,
          rowY + 35,
        );
      });
    }
  }

  ctx.fillStyle = "rgba(244,241,232,0.76)";
  ctx.font = "700 11px Inter, sans-serif";
  wrapText("W/S or arrows: select", panelX + 18, panelY + panelH - 68, panelW - 36);
  wrapText("E or Enter: travel   M or Esc: close", panelX + 18, panelY + panelH - 44, panelW - 36);

  ctx.fillStyle = "rgba(231,216,171,0.9)";
  ctx.fillRect(offX + 8, offY + mapH - 32, 284, 24);
  ctx.fillStyle = "rgba(44,33,27,0.86)";
  ctx.font = "700 11px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("■ City   ▲ Dungeon   ● Wagon   ● You", offX + 16, offY + mapH - 15);
}

function drawMapLabel(x, y, text, color) {
  ctx.fillStyle = color;
  ctx.font = "750 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}

function wrapText(text, x, y, maxWidth) {
  ctx.font = "700 12px Inter, sans-serif";
  ctx.textAlign = "left";
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += 16;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}

function drawLevel1() {
  const p = game.player;
  game.camera.x = clamp(p.x - VIEW_W / 2, 0, levelOneData.width - VIEW_W);
  game.camera.y = clamp(p.y - VIEW_H / 2, 0, levelOneData.height - VIEW_H);
  const cam = game.camera;

  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  const grd = ctx.createLinearGradient(0, 0, 0, levelOneData.height);
  grd.addColorStop(0, "#8fd4c8");
  grd.addColorStop(0.4, "#bfe89a");
  grd.addColorStop(1, "#7fbf7a");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, levelOneData.width, levelOneData.height);

  drawLevelOneForestPath();
  for (const blob of levelOneData.lakeBlobs) drawLevelOneLakeBlob(blob);

  const field = levelOneData.flowerField;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(field.x - 40, field.y - 40, field.w + 80, field.h + 80);

  for (const flower of levelOneData.flowers) drawFlower(flower.x, flower.y, flower.c);
  for (const tree of levelOneData.trees) drawTree(tree.x, tree.y);

  drawLevelOneVillage();
  drawLevelOneMountain();
  drawWaldverliesEntrance(levelOneData.southForest.dungeonEntrance);
  drawCabinExterior(levelOneData.cabin);
  for (const wagon of levelOneData.wagons) drawWagonStation(wagon);
  if (!levelOneData.himmel.questAccepted) {
    drawHimmelSprite(levelOneData.himmel.x, levelOneData.himmel.y, 0.22);
  }
  drawGoddessShrine(levelOneData.shrine.x, levelOneData.shrine.y);

  ctx.save();
  ctx.globalAlpha = 0.16;
  const glow = ctx.createRadialGradient(
    levelOneData.width * 0.3, levelOneData.height * 0.15, 40,
    levelOneData.width * 0.3, levelOneData.height * 0.15, 700,
  );
  glow.addColorStop(0, "#fff6dc");
  glow.addColorStop(1, "rgba(255,246,220,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, levelOneData.width, levelOneData.height);
  ctx.restore();

  for (const foe of game.level1.enemies) drawEnemy(foe, "level1");
  if (game.level1.boss) drawEnemy(game.level1.boss, "level1");
  drawProjectiles(game.level1.projectiles);
  drawProjectiles(game.level1.enemyProjectiles);
  drawMotes(game.level1.motes);
  drawPlayerTopDown(p);
  drawCompanion();
  drawLevelOnePrompts();
  ctx.restore();
}

function drawLevelOneLakeBlob(blob) {
  pixelRect(blob.x, blob.y, blob.w, blob.h, "#2f5d63");
  pixelRect(blob.x + 12, blob.y + 12, Math.max(0, blob.w - 24), Math.max(0, blob.h - 24), "#3f7a82");
  for (let i = 0; i < blob.w; i += 70) {
    pixelRect(blob.x + i + 20, blob.y + blob.h * 0.4, 36, 6, "rgba(211,238,231,0.22)");
  }
}

function drawLevelOneForestPath() {
  ctx.strokeStyle = "rgba(193, 177, 128, 0.4)";
  ctx.lineWidth = 70;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(levelOneData.flowerField.x + levelOneData.flowerField.w, 1300);
  ctx.bezierCurveTo(2500, 1280, 2750, 1340, levelOneData.village.x - 120, levelOneData.village.y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(70, 61, 42, 0.14)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i += 1) {
    const t = i / 11;
    const x = 2180 + t * (levelOneData.village.x - 120 - 2180);
    const y = 1300 + Math.sin(t * Math.PI) * 30;
    pixelRect(x, y, 30, 5, "rgba(91,78,49,0.16)");
  }

  // road continues east of the village, up the mountain switchbacks
  const wp = levelOneData.mountain.waypoints;
  ctx.strokeStyle = "rgba(193, 177, 128, 0.32)";
  ctx.lineWidth = 56;
  ctx.beginPath();
  ctx.moveTo(levelOneData.village.x + 120, levelOneData.village.y);
  ctx.lineTo(wp[0].x, wp[0].y);
  for (let i = 1; i < wp.length; i += 1) ctx.lineTo(wp[i].x, wp[i].y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(220, 230, 235, 0.22)";
  ctx.lineWidth = 3;
  for (let i = 1; i < wp.length; i += 1) {
    ctx.beginPath();
    ctx.moveTo(wp[i - 1].x, wp[i - 1].y);
    ctx.lineTo(wp[i].x, wp[i].y);
    ctx.stroke();
  }

  // a fork heads south from the village into Düsterhain
  const fork = levelOneData.southForest;
  const entrance = fork.dungeonEntrance;
  ctx.strokeStyle = "rgba(193, 177, 128, 0.34)";
  ctx.lineWidth = 50;
  ctx.beginPath();
  ctx.moveTo(fork.forkX, fork.forkY);
  ctx.bezierCurveTo(fork.forkX - 60, fork.forkY + 500, entrance.x + 80, entrance.y - 600, entrance.x, entrance.y - 60);
  ctx.stroke();
  ctx.strokeStyle = "rgba(40, 50, 38, 0.18)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 14; i += 1) {
    const t = i / 13;
    const x = fork.forkX - 30 + t * (entrance.x - fork.forkX + 30);
    const y = fork.forkY + t * (entrance.y - 60 - fork.forkY);
    pixelRect(x, y, 26, 5, "rgba(40,50,38,0.16)");
  }
  drawWorldLabel(fork.forkX, fork.forkY + 40, "Düsterhain ↓");
}

function drawLevelOneVillage() {
  const v = levelOneData.village;
  drawTownHouse(v.x - 140, v.y - 60, "#a9633f");
  drawTownHouse(v.x - 10, v.y - 90, "#8a5234");
  drawTownHouse(v.x - 140, v.y + 110, "#8a5234");
  drawTownHouse(v.x + 60, v.y + 90, "#a9633f");
  drawWorldLabel(v.x - 40, v.y - 140, v.name);
  const elder = levelOneData.elder;
  drawPixelTownsfolk(elder.x, elder.y, "#6b5a8a");
}

function drawLevelOneMountain() {
  const mountain = levelOneData.mountain;

  // snow-tinted ground the higher the path climbs
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#e8eef2";
  ctx.beginPath();
  ctx.ellipse(4500, 480, 750, 420, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  for (const rock of mountain.rocks) drawRock(rock);

  // summit marker — a weathered cairn at the top of the pass
  const summit = mountain.summit;
  pixelRect(summit.x - 10, summit.y + 10, 60, 10, "rgba(20,22,24,0.3)");
  pixelRect(summit.x - 26, summit.y - 4, 52, 22, "#9b9486");
  pixelRect(summit.x - 18, summit.y - 24, 36, 24, "#a8a194");
  pixelRect(summit.x - 9, summit.y - 40, 18, 20, "#b4ada0");
  pixelRect(summit.x - 4, summit.y - 56, 8, 18, "#7d5f3e");
  pixelRect(summit.x - 10, summit.y - 60, 20, 6, "#dac4ff");
  drawWorldLabel(summit.x, summit.y - 80, mountain.name);
}

function drawWaldverliesEntrance(entrance) {
  const x = entrance.x;
  const y = entrance.y;
  pixelRect(x - 70, y - 40, 140, 80, "rgba(20,22,24,0.4)");
  pixelRect(x - 60, y - 70, 120, 70, "#3a352c");
  pixelRect(x - 44, y - 90, 88, 30, "#2c2820");
  pixelRect(x - 36, y - 38, 72, 50, "#15110c");
  pixelRect(x - 30, y - 32, 60, 38, "#0c0906");
  for (let i = 0; i < 5; i += 1) {
    pixelRect(x - 70 + i * 30, y + 32, 26, 10, "#5a4a30");
  }
  drawWorldLabel(x, y - 110, entrance.name);
}

function drawGoddessShrine(x, y) {
  const pulse = 0.5 + Math.sin(game.time * 1.6) * 0.18;
  ctx.save();
  ctx.globalAlpha = 0.22 * pulse + 0.1;
  pixelRect(x - 50, y - 80, 100, 100, "rgba(180,231,238,0.5)");
  ctx.restore();

  // ground shadow
  pixelRect(x - 30, y + 22, 60, 10, "rgba(20,22,24,0.26)");
  // weathered stone gravestone, rounded top
  pixelRect(x - 26, y - 64, 52, 86, "#6b6b5e");
  pixelRect(x - 22, y - 78, 44, 20, "#76766a");
  pixelRect(x - 16, y - 88, 32, 14, "#7f7f72");
  // moss patches
  pixelRect(x - 24, y - 20, 18, 14, "#3f6b3f");
  pixelRect(x + 6, y - 50, 16, 12, "#3f6b3f");
  pixelRect(x - 10, y + 0, 22, 10, "#345e36");
  pixelRect(x - 22, y - 60, 10, 8, "#4a7a4a");
  // carved Goddess emblem — a halo over an open hand
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = "#dac4ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y - 40, 14, 0, TAU);
  ctx.stroke();
  ctx.restore();
  pixelRect(x - 3, y - 30, 6, 16, "#cfcfc2");
  pixelRect(x - 10, y - 16, 20, 6, "#cfcfc2");
  // offerings at the base
  drawFlower(x - 28, y + 30, "#f2a7b5");
  drawFlower(x + 24, y + 28, "#b4e7ee");
  drawWorldLabel(x, y - 110, "Schrein der Göttin");
}

function drawLevelOnePrompts() {
  const p = game.player;
  const cabin = levelOneData.cabin;
  if (dist(p.x, p.y, cabin.doorX, cabin.doorY) < 80) {
    drawWorldLabel(cabin.doorX, cabin.doorY - 110, "E: Enter Cabin");
  }
  const himmel = levelOneData.himmel;
  if (!himmel.questAccepted && dist(p.x, p.y, himmel.x, himmel.y) < 100) {
    drawWorldLabel(himmel.x, himmel.y - 130, "E: Talk to Himmel");
  }
  const elder = levelOneData.elder;
  if (dist(p.x, p.y, elder.x, elder.y) < 100) {
    drawWorldLabel(elder.x, elder.y - 100, "E: Talk");
  }
  for (const wagon of levelOneData.wagons) {
    if (dist(p.x, p.y, wagon.x, wagon.y) < 100) {
      drawWorldLabel(wagon.x, wagon.y - 92, "E: Fast Travel");
    }
  }
  const shrine = levelOneData.shrine;
  if (dist(p.x, p.y, shrine.x, shrine.y) < shrine.r + 30) {
    drawWorldLabel(shrine.x, shrine.y - 130, "R: Rest");
  }
  const dungeonEntrance = levelOneData.southForest.dungeonEntrance;
  if (dist(p.x, p.y, dungeonEntrance.x, dungeonEntrance.y) < 90) {
    drawWorldLabel(dungeonEntrance.x, dungeonEntrance.y - 100, "E: Enter Waldverlies");
  }
}

function drawForestDungeonScene() {
  const p = game.player;
  const floor = activeForestDungeonFloor();
  game.camera.x = clamp(p.x - VIEW_W * 0.42, 0, floor.width - VIEW_W);
  const camX = game.camera.x;

  // brown/tan earthen dungeon, distinct from Hohlgrund/Königsgrab's palette
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, "#4a3a24");
  bg.addColorStop(0.55, "#5a4a30");
  bg.addColorStop(1, "#2c2114");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.translate(-camX, 0);
  drawForestDungeonBackdrop(floor);
  for (const plat of floor.platforms) drawForestDungeonPlatform(plat);
  drawDungeonChest(floor.chest, forestDungeonData.openedChests);
  for (const spike of floor.spikes) drawSpikes(spike);
  drawForestDungeonGate(floor);
  for (const foe of game.forestDungeon.enemies) drawEnemy(foe, "forestDungeon");
  if (game.forestDungeon.boss) drawEnemy(game.forestDungeon.boss, "forestDungeon");
  drawProjectiles(game.forestDungeon.projectiles);
  drawProjectiles(game.forestDungeon.enemyProjectiles);
  drawMotes(game.forestDungeon.motes);
  drawPlayerSide(p);
  drawCompanion();
  ctx.restore();
}

function drawForestDungeonBackdrop(floor) {
  ctx.fillStyle = "rgba(122, 100, 70, 0.14)";
  for (let x = -120; x < floor.width + 200; x += 190) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 70, 720);
    ctx.lineTo(x + 125, 720);
    ctx.lineTo(x + 50, 0);
    ctx.closePath();
    ctx.fill();
  }
  for (let x = 80; x < floor.width; x += 180) {
    pixelRect(x, 118 + (x % 5) * 18, 48, 5, "rgba(220,196,150,0.1)");
    pixelRect(x + 20, 305 + (x % 7) * 12, 28, 4, "rgba(180,150,100,0.1)");
  }
}

function drawForestDungeonPlatform(plat) {
  ctx.fillStyle = "#5a4a30";
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  ctx.fillStyle = "#7a6446";
  ctx.fillRect(plat.x, plat.y, plat.w, 8);
  ctx.strokeStyle = "rgba(20,15,8,0.3)";
  ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
  for (let x = plat.x + 16; x < plat.x + plat.w - 8; x += 60) {
    pixelRect(x, plat.y + 12, 4, plat.h - 20, "rgba(20,15,8,0.18)");
  }
}

function drawForestDungeonGate(floor) {
  const door = floor.exit;
  const cleared = forestDungeonData.cleared;
  pixelRect(door.x, door.y, door.w, door.h, cleared ? "rgba(180,200,120,0.34)" : "rgba(58,48,34,0.7)");
  pixelRect(door.x + 7, door.y + 7, door.w - 14, door.h - 14, cleared ? "#5a6b34" : "#3a2c1c");
  pixelRect(door.x + 18, door.y + 16, 22, 70, cleared ? "#dac98b" : "#6b5638");
  if (rectContains(door, game.player.x, game.player.y - 35)) {
    drawWorldLabel(door.x + door.w / 2, door.y - 18, "E: Leave Waldverlies");
  }
}

function drawCabinInteriorScene() {
  const room = cabinInteriorData;
  const p = game.player;

  // fill the whole canvas first so the room never looks like it's floating
  // in a black void when it's smaller than the viewport
  const outerBg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  outerBg.addColorStop(0, "#241a14");
  outerBg.addColorStop(1, "#140f0b");
  ctx.fillStyle = outerBg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.translate((VIEW_W - room.width) / 2, (VIEW_H - room.height) / 2);

  pixelRect(-14, -14, room.width + 28, room.height + 28, "rgba(0,0,0,0.4)");

  const bg = ctx.createLinearGradient(0, 0, 0, room.height);
  bg.addColorStop(0, "#3a2c22");
  bg.addColorStop(1, "#2a1f18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, room.width, room.height);

  for (let x = 0; x < room.width; x += 56) {
    for (let y = 0; y < room.height; y += 56) {
      pixelRect(x, y, 54, 54, (Math.round(x / 56) + Math.round(y / 56)) % 2 ? "#5a4128" : "#523a23");
    }
  }

  // back-wall windows, daylight outside
  for (const win of room.windows) drawCabinWindow(win.x, win.y);

  // hearth, left wall
  pixelRect(40, 40, 70, 100, "#3a352c");
  pixelRect(54, 74, 42, 60, "#1c1712");
  pixelRect(64, 102, 22, 20, "#f5a23a");
  pixelRect(70, 30, 30, 14, "#5a4f42");

  // loft nook in the corner, reached by a ladder
  const nook = room.nook;
  pixelRect(nook.x, nook.y, nook.w, nook.h, "#2c2118");
  pixelRect(nook.x, nook.y + nook.h - 10, nook.w, 10, "#5a4128");
  pixelRect(nook.x + 14, nook.y + 14, nook.w - 28, 14, "#4a3a26");
  pixelRect(nook.x + 18, nook.y + 16, 16, 10, "#7d5f3e");
  pixelRect(nook.x + 44, nook.y + 16, 16, 10, "#7d5f3e");
  drawLadder(room.ladder.x, room.ladder.y, room.ladder.h);

  // bed, opposite corner
  const bed = room.bed;
  pixelRect(bed.x - 14, bed.y - 16, 100, 70, "#5a4128");
  pixelRect(bed.x - 8, bed.y - 10, 88, 36, "#cdb88f");
  pixelRect(bed.x - 8, bed.y - 10, 24, 36, "#fff6dc");
  pixelRect(bed.x - 8, bed.y + 26, 88, 10, "#3f7ab3");

  // table with an open book on it
  const table = room.table;
  pixelRect(table.x - 40, table.y - 10, 80, 50, "#6b4f33");
  pixelRect(table.x - 34, table.y - 16, 68, 10, "#7d5f3e");
  pixelRect(table.x - 14, table.y - 22, 28, 16, "#e8ddc0");
  pixelRect(table.x - 12, table.y - 20, 12, 12, "#cfc6ac");

  // bookshelf with the hidden grimoire tucked among ordinary books
  const shelf = room.bookshelf;
  pixelRect(shelf.x - 36, shelf.y - 90, 72, 170, "#3a2c1c");
  pixelRect(shelf.x - 40, shelf.y - 98, 80, 10, "#4a3a26");
  for (let row = 0; row < 4; row += 1) {
    const shelfY = shelf.y - 80 + row * 38;
    pixelRect(shelf.x - 30, shelfY + 28, 60, 6, "#241b12");
    for (let b = 0; b < 5; b += 1) {
      pixelRect(shelf.x - 28 + b * 12, shelfY, 9, 26, b % 2 ? "#7a1f24" : "#3f7ab3");
    }
  }
  const grimoireRow = 2;
  const grimoireSlot = 2;
  const grimoireX = shelf.x - 28 + grimoireSlot * 12;
  const grimoireY = shelf.y - 80 + grimoireRow * 38;
  if (!room.grimoireFound) {
    const pulse = 0.6 + Math.sin(game.time * 4) * 0.3;
    ctx.save();
    ctx.globalAlpha = pulse;
    pixelRect(grimoireX - 4, grimoireY - 4, 17, 34, "rgba(218,196,255,0.5)");
    ctx.restore();
    pixelRect(grimoireX, grimoireY, 9, 26, "#dac4ff");
  }

  // a few loose books left on the floor near the shelf
  pixelRect(shelf.x - 60, shelf.y + 70, 22, 14, "#7a1f24");
  pixelRect(shelf.x - 34, shelf.y + 76, 22, 14, "#3f7ab3");

  // exit rug back to Level 1
  pixelRect(room.exit.x, room.exit.y, room.exit.w, room.exit.h, "rgba(193,177,128,0.3)");
  if (rectContains(room.exit, p.x, p.y)) {
    drawWorldLabel(room.exit.x + room.exit.w / 2, room.exit.y - 16, "E: Leave Cabin");
  }
  if (dist(p.x, p.y, shelf.x, shelf.y) < 70) {
    drawWorldLabel(shelf.x, shelf.y - 110, room.grimoireFound ? "E: Search Shelf" : "E: Search Shelf");
  }

  drawPlayerTopDown(p);
  ctx.restore();
}

function drawCabinWindow(x, y) {
  pixelRect(x - 26, y, 52, 64, "#241b12");
  pixelRect(x - 20, y + 6, 40, 52, "#9fd6e0");
  pixelRect(x - 20, y + 6, 40, 18, "rgba(255,255,255,0.18)");
  pixelRect(x - 2, y + 6, 4, 52, "#241b12");
  pixelRect(x - 20, y + 30, 40, 4, "#241b12");
  pixelRect(x - 12, y + 14, 10, 10, "#2f7a4f");
}

function drawLadder(x, y, h) {
  pixelRect(x - 16, y, 6, h, "#7d5f3e");
  pixelRect(x + 10, y, 6, h, "#7d5f3e");
  for (let ry = y + 6; ry < y + h; ry += 18) pixelRect(x - 16, ry, 32, 5, "#7d5f3e");
}

function drawOverworld() {
  const p = game.player;
  game.camera.x = clamp(p.x - VIEW_W / 2, 0, overworldData.width - VIEW_W);
  game.camera.y = clamp(p.y - VIEW_H / 2, 0, overworldData.height - VIEW_H);
  const cam = game.camera;

  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  const grd = ctx.createLinearGradient(0, 0, overworldData.width, overworldData.height);
  grd.addColorStop(0, "#1f4a3a");
  grd.addColorStop(0.45, "#2e7a4f");
  grd.addColorStop(1, "#163c46");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, overworldData.width, overworldData.height);

  drawForestFloorTexture();
  drawWorldTexture();
  drawRoad();
  drawGroundDetails();
  drawPond();
  for (const tree of overworldData.trees) drawTree(tree.x, tree.y);
  for (const rock of overworldData.rocks) drawRock(rock);
  drawCamp(overworldData.camp.x, overworldData.camp.y);
  drawMoonwell();
  drawVillageSpellQuest();
  drawCastleTown();
  for (const wagon of mapData.wagons) drawWagonStation(wagon);

  for (const foe of game.overworld.enemies) drawEnemy(foe, "overworld");
  drawProjectiles(game.overworld.projectiles);
  drawProjectiles(game.overworld.enemyProjectiles);
  drawMotes(game.overworld.motes);
  drawPlayerTopDown(p);
  drawCompanion();
  drawOverworldPrompts();
  ctx.restore();
}

function drawForestFloorTexture() {
  const img = BACKGROUNDS.forestBack;
  if (!imageReady(img)) return;
  const scale = 2.4;
  const tileW = img.naturalWidth * scale;
  const tileH = img.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.filter = "hue-rotate(110deg) saturate(1.8) brightness(1.05)";
  for (let y = -tileH; y < overworldData.height + tileH; y += tileH) {
    for (let x = -tileW; x < overworldData.width + tileW; x += tileW) {
      ctx.drawImage(img, x, y, tileW, tileH);
    }
  }
  ctx.restore();
}

function drawWorldTexture() {
  for (let i = 0; i < 220; i += 1) {
    const x = (i * 173) % overworldData.width;
    const y = (i * 311) % overworldData.height;
    const color = i % 3 === 0 ? "rgba(220,232,180,0.10)" : "rgba(30,52,38,0.18)";
    pixelRect(x, y, 12 + (i % 5) * 5, 3, color);
    if (i % 7 === 0) pixelRect(x + 7, y - 8, 4, 11, "rgba(220,232,180,0.08)");
  }
}

function drawRoad() {
  const gate = overworldData.castleTown;
  ctx.strokeStyle = "rgba(193, 177, 128, 0.48)";
  ctx.lineWidth = 88;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(220, 1135);
  ctx.bezierCurveTo(570, 1005, 730, 790, 1040, 840);
  ctx.bezierCurveTo(1400, 900, 1455, 720, 1840, 765);
  ctx.stroke();

  ctx.lineWidth = 76;
  ctx.beginPath();
  ctx.moveTo(1840, 765);
  ctx.bezierCurveTo(2280, 820, 2620, 980, 2940, 1080);
  ctx.bezierCurveTo(3280, 1185, 3550, 1230, gate.gateX, gate.gateY);
  ctx.stroke();

  ctx.strokeStyle = "rgba(70, 61, 42, 0.16)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    ctx.moveTo(250 + i * 180, 1120 - i * 43);
    ctx.lineTo(315 + i * 180, 1095 - i * 36);
    ctx.stroke();
  }
  for (let i = 0; i < 22; i += 1) {
    const x = 230 + i * 84;
    const y = 1110 - Math.sin(i * 0.8) * 120 - i * 14;
    pixelRect(x, y, 34, 5, "rgba(91,78,49,0.18)");
    pixelRect(x + 16, y + 22, 26, 4, "rgba(238,224,166,0.16)");
  }

  for (let i = 0; i < 26; i += 1) {
    const t = i / 25;
    const x = 1840 + (gate.gateX - 1840) * t;
    const y = 765 + Math.sin(t * Math.PI) * 280 + (gate.gateY - 765) * t;
    pixelRect(x, y, 34, 5, "rgba(91,78,49,0.16)");
    pixelRect(x + 16, y + 20, 26, 4, "rgba(238,224,166,0.14)");
  }
}

function drawGroundDetails() {
  drawGardenBeds();
  drawFenceLine(404, 790, 245, 5);
  drawFenceLine(404, 934, 245, 5);
  drawFencePost(404, 790);
  drawFencePost(650, 790);
  drawFencePost(404, 934);
  drawFencePost(650, 934);

  for (const herb of overworldData.herbs) drawHerbClump(herb.x, herb.y);
  for (const flower of overworldData.flowers) drawFlower(flower.x, flower.y, flower.c);

  drawSign(438, 760, "Heine");
  drawCursePebbles();
}

function drawGardenBeds() {
  const beds = [
    { x: 432, y: 818, w: 136, h: 28 },
    { x: 432, y: 858, w: 136, h: 28 },
    { x: 432, y: 898, w: 136, h: 28 },
  ];
  for (const bed of beds) {
    pixelRect(bed.x, bed.y, bed.w, bed.h, "#4f4932");
    pixelRect(bed.x + 4, bed.y + 4, bed.w - 8, 6, "#685d3d");
    for (let x = bed.x + 12; x < bed.x + bed.w - 8; x += 24) {
      pixelRect(x, bed.y + 15, 12, 5, "#8eb36c");
      pixelRect(x + 4, bed.y + 9, 5, 12, "#6f9c58");
    }
  }
}

function drawFenceLine(x, y, w, posts) {
  pixelRect(x, y, w, 7, "#9a764a");
  pixelRect(x, y + 18, w, 7, "#7d5f3e");
  const gap = w / (posts - 1);
  for (let i = 0; i < posts; i += 1) drawFencePost(x + i * gap, y - 10);
}

function drawFencePost(x, y) {
  pixelRect(x - 5, y, 10, 46, "#7d5f3e");
  pixelRect(x - 6, y - 6, 12, 8, "#b18a56");
}

function drawHerbClump(x, y) {
  pixelRect(x - 8, y + 5, 16, 5, "#31472f");
  pixelRect(x - 6, y - 6, 5, 12, "#8eb36c");
  pixelRect(x + 1, y - 10, 5, 16, "#7aa65f");
  pixelRect(x + 7, y - 4, 5, 10, "#a9c97c");
}

function drawFlower(x, y, color) {
  pixelRect(x - 2, y - 10, 4, 12, "#5e8b52");
  pixelRect(x - 8, y - 15, 6, 6, color);
  pixelRect(x + 2, y - 15, 6, 6, color);
  pixelRect(x - 3, y - 20, 6, 6, "#fff6dc");
  pixelRect(x - 5, y + 1, 10, 4, "#38543a");
}

function drawSign(x, y, label) {
  pixelRect(x - 6, y + 22, 12, 38, "#65482f");
  pixelRect(x - 42, y, 84, 28, "#8b6a44");
  pixelRect(x - 36, y + 5, 72, 18, "#b58d58");
  pixelRect(x - 22, y + 11, label.length * 7, 4, "#4a3725");
}

function drawCursePebbles() {
  const bramble = overworldData.bramble;
  if (bramble.cleared) return;
  for (let i = 0; i < 14; i += 1) {
    const x = bramble.x + Math.cos(i * 1.7) * (58 + (i % 3) * 20);
    const y = bramble.y + Math.sin(i * 1.3) * (38 + (i % 4) * 14);
    pixelRect(x - 4, y - 4, 8, 8, i % 2 ? "#263e34" : "#4f6f64");
  }
}

function drawPond() {
  pixelRect(1010, 196, 420, 102, "#31555b");
  pixelRect(970, 226, 500, 54, "#31555b");
  pixelRect(1040, 182, 320, 24, "#3f6267");
  pixelRect(1060, 214, 190, 8, "rgba(211,238,231,0.24)");
  pixelRect(1260, 250, 140, 8, "rgba(211,238,231,0.16)");
}

function drawTree(x, y) {
  pixelRect(x - 9, y + 18, 18, 44, "#3a2c18");
  pixelRect(x - 5, y + 14, 8, 20, "#5a4226");
  pixelRect(x - 42, y - 38, 84, 58, "#15453f");
  pixelRect(x - 34, y - 58, 68, 44, "#1f7a4f");
  pixelRect(x - 28, y + 8, 56, 28, "#123a4a");
  pixelRect(x - 22, y - 35, 22, 28, "rgba(224,240,190,0.16)");
  pixelRect(x + 18, y - 28, 10, 10, "#3fae72");
  pixelRect(x - 30, y - 18, 8, 8, "rgba(120,210,224,0.14)");
  if ((Math.floor(x + y) % 3) === 0) {
    pixelRect(x + 10, y - 18, 7, 7, "#d9a655");
    pixelRect(x - 18, y - 6, 7, 7, "#d9a655");
  }
}

function drawRock(rock) {
  pixelRect(rock.x - rock.r, rock.y - rock.r * 0.45, rock.r * 2, rock.r * 0.9, "#555b55");
  pixelRect(rock.x - rock.r * 0.75, rock.y - rock.r * 0.65, rock.r * 1.35, rock.r * 0.32, "#6b7069");
  pixelRect(rock.x - rock.r * 0.45, rock.y - rock.r * 0.22, rock.r * 0.9, rock.r * 0.16, "rgba(255,255,255,0.12)");
}

function drawCamp(x, y) {
  pixelRect(x - 68, y - 58, 136, 116, "rgba(246,196,92,0.12)");
  pixelRect(x - 84, y - 26, 168, 52, "rgba(246,196,92,0.1)");
  pixelRect(x - 44, y + 20, 88, 12, "#6f4b2e");
  pixelRect(x - 26, y + 8, 52, 12, "#3f2b1d");
  pixelRect(x - 12, y - 32, 24, 56, "#f2b64f");
  pixelRect(x - 22, y - 4, 44, 28, "#d16c3e");
  pixelRect(x - 7, y - 22, 14, 36, "#fff0a6");
}

function drawMoonwell() {
  const { x, y } = overworldData.portal;
  pixelRect(x - 88, y - 54, 176, 108, "rgba(224,215,171,0.28)");
  pixelRect(x - 104, y - 30, 208, 60, "rgba(224,215,171,0.22)");
  pixelRect(x - 58, y - 58, 116, 116, game.overworld.shadeDefeated ? "rgba(108,224,236,0.28)" : "rgba(66,45,78,0.36)");
  pixelRect(x - 44, y - 44, 88, 88, game.overworld.shadeDefeated ? "rgba(126,218,232,0.42)" : "rgba(124,104,143,0.32)");
  pixelRect(x - 10, y - 68, 20, 136, game.overworld.shadeDefeated ? "#b4e7ee" : "#6d5367");
  pixelRect(x - 68, y - 10, 136, 20, game.overworld.shadeDefeated ? "#b4e7ee" : "#6d5367");
}

function drawCastleTown() {
  const town = overworldData.castleTown;
  const left = town.x - town.w / 2;
  const top = town.y - town.h / 2;
  const right = left + town.w;
  const bottom = top + town.h;
  const wallColor = "#8a8478";
  const wallShade = "#6b6659";
  const towerColor = "#9b9486";

  // plaza outside the gate, with overflow stalls
  pixelRect(town.gateX - 260, town.gateY - 90, 260, 180, "rgba(193,177,128,0.22)");
  drawMarketStall(town.gateX - 190, town.gateY - 50, "#b3503f");
  drawMarketStall(town.gateX - 120, town.gateY + 42, "#3f7ab3");

  // cobblestone courtyard fill inside the walls
  for (let i = 0; i < 220; i += 1) {
    const cx = left + 50 + ((i * 53) % (town.w - 100));
    const cy = top + 50 + ((i * 97) % (town.h - 100));
    pixelRect(cx, cy, 16, 6, i % 2 ? "rgba(150,140,120,0.16)" : "rgba(110,102,86,0.14)");
  }

  // outer wall ring
  pixelRect(left, top, town.w, 28, wallColor);
  pixelRect(left, bottom - 28, town.w, 28, wallColor);
  pixelRect(left, top, 28, town.h, wallColor);
  pixelRect(right - 28, top, 28, town.h, wallColor);
  pixelRect(left, top, town.w, 9, wallShade);
  for (let i = 0; i < 24; i += 1) {
    pixelRect(left + 6 + (i * (town.w - 12)) / 23, top - 10, 14, 12, wallColor);
  }

  // corner + mid-wall towers
  drawCastleTower(left + 8, top + 8, towerColor);
  drawCastleTower(right - 58, top + 8, towerColor);
  drawCastleTower(left + 8, bottom - 58, towerColor);
  drawCastleTower(right - 58, bottom - 58, towerColor);
  drawCastleTower(town.x - 25, top + 8, towerColor);
  drawCastleTower(town.x - 25, bottom - 58, towerColor);
  drawCastleTower(left + 8, town.y - 37, towerColor);

  // gatehouse cut into the west wall, facing the road
  pixelRect(town.gateX - 14, town.gateY - 90, 70, 180, "#4a3a2e");
  pixelRect(town.gateX - 4, town.gateY - 78, 50, 156, "#241b15");
  for (let i = 0; i < 6; i += 1) {
    pixelRect(town.gateX - 2, town.gateY - 70 + i * 26, 46, 6, "#6b5a44");
  }
  pixelRect(town.gateX - 26, town.gateY - 110, 24, 36, towerColor);
  pixelRect(town.gateX + 60, town.gateY - 110, 24, 36, towerColor);
  drawWorldLabel(town.gateX, town.gateY - 138, town.name);

  // market district, just inside the gate
  const marketX = town.gateX + 90;
  drawMarketStall(marketX, town.y - 160, "#9a6a2f");
  drawMarketStall(marketX + 90, town.y - 160, "#5a8a4a");
  drawMarketStall(marketX, town.y + 95, "#7a4a8a");
  drawMarketStall(marketX + 90, town.y + 95, "#b3503f");
  drawWorldLabel(marketX + 45, town.y - 200, "Marktplatz");
  drawPixelTownsfolk(marketX + 45, town.y - 120, "#7a4a8a");

  // town square + fountain at the center
  drawFountain(town.x, town.y);

  // residential district, framing the square
  drawTownHouse(town.x - 200, town.y - 230, "#a9633f");
  drawTownHouse(town.x - 70, town.y - 245, "#8a5234");
  drawTownHouse(town.x - 200, town.y + 215, "#8a5234");
  drawTownHouse(town.x - 70, town.y + 230, "#a9633f");
  drawPixelTownsfolk(town.x - 130, town.y - 90, "#3f7ab3");

  // gate guard standing watch just inside the gatehouse
  drawPixelTownsfolk(town.gateX + 20, town.gateY - 60, "#5a5a66");

  // castle keep, east end of the town
  const keepX = town.keepDoorX + 110;
  const keepY = town.keepDoorY;
  pixelRect(keepX - 130, keepY - 70, 260, 200, "#7f786a");
  pixelRect(keepX - 130, keepY - 70, 260, 14, "#615b4f");
  pixelRect(keepX - 105, keepY - 170, 70, 106, towerColor);
  pixelRect(keepX + 35, keepY - 170, 70, 106, towerColor);
  pixelRect(keepX - 18, keepY - 215, 36, 150, towerColor);
  for (const dx of [-105, 35]) {
    pixelRect(keepX + dx, keepY - 182, 70, 14, "#615b4f");
    pixelRect(keepX + dx + 28, keepY - 198, 4, 18, "#3a352c");
    pixelRect(keepX + dx + 18, keepY - 198, 24, 12, "#b33538");
  }
  pixelRect(keepX - 18, keepY - 227, 36, 14, "#3a352c");
  pixelRect(keepX - 4, keepY - 243, 4, 18, "#3a352c");
  pixelRect(keepX - 14, keepY - 243, 24, 12, "#f5dd8b");
  pixelRect(keepX - 6, keepY - 120, 12, 40, "rgba(255,255,255,0.08)");

  // keep entrance door, on the side facing the town
  pixelRect(town.keepDoorX - 4, town.keepDoorY - 60, 40, 120, "#4a3a2e");
  pixelRect(town.keepDoorX + 4, town.keepDoorY - 48, 24, 96, "#241b15");
  pixelRect(town.keepDoorX + 10, town.keepDoorY - 10, 10, 14, "#c7b06b");
  drawPixelTownsfolk(town.keepDoorX - 70, town.keepDoorY - 60, "#5a5a66");

  // sunken stairwell down into the Königsgrab crypt
  drawCryptEntrance(town.cryptEntranceX, town.cryptEntranceY);
}

function drawCryptEntrance(x, y) {
  pixelRect(x - 56, y - 40, 112, 80, "rgba(20,22,24,0.4)");
  pixelRect(x - 46, y - 32, 92, 64, "#3a352c");
  for (let i = 0; i < 5; i += 1) {
    pixelRect(x - 40 + i * 8, y - 26 + i * 8, 80 - i * 16, 10, "#2c2822");
  }
  pixelRect(x - 18, y - 36, 36, 14, "#615b4f");
  pixelRect(x - 12, y - 48, 24, 14, "#7f786a");
  pixelRect(x - 4, y - 60, 8, 14, "#dac4ff");
  drawWorldLabel(x, y - 80, "Königsgrab");
}

function drawCastleTower(x, y, color) {
  pixelRect(x, y, 50, 84, color);
  pixelRect(x, y, 50, 10, "#615b4f");
  pixelRect(x - 4, y - 14, 12, 16, color);
  pixelRect(x + 14, y - 14, 12, 16, color);
  pixelRect(x + 32, y - 14, 12, 16, color);
  pixelRect(x + 18, y + 26, 14, 18, "#3a352c");
}

function drawMarketStall(x, y, color) {
  pixelRect(x - 36, y - 6, 72, 8, "#5a4128");
  pixelRect(x - 40, y - 36, 80, 10, color);
  pixelRect(x - 32, y - 28, 64, 22, "rgba(244,241,232,0.14)");
  pixelRect(x - 36, y - 6, 6, 26, "#3f2b1d");
  pixelRect(x + 30, y - 6, 6, 26, "#3f2b1d");
  pixelRect(x - 26, y - 4, 14, 8, "#e9c46a");
  pixelRect(x - 8, y - 4, 14, 8, "#8bd6bd");
  pixelRect(x + 10, y - 4, 14, 8, "#f2a7b5");
}

function drawTownHouse(x, y, color) {
  pixelRect(x - 36, y - 10, 72, 50, color);
  pixelRect(x - 42, y - 36, 84, 30, "#4a3325");
  pixelRect(x - 8, y + 16, 22, 24, "#2c211b");
  pixelRect(x - 30, y + 4, 16, 14, "#cdb88f");
  pixelRect(x + 14, y + 4, 16, 14, "#cdb88f");
  pixelRect(x - 30, y + 4, 16, 2, "#6b5a44");
  pixelRect(x + 14, y + 4, 16, 2, "#6b5a44");
  pixelRect(x - 38, y - 38, 8, 12, "#2c211b");
}

function drawCabinExterior(cabin) {
  const x = cabin.x;
  const y = cabin.y;
  // mossy timber-framed cottage, matching Frieren's reference cabin
  pixelRect(x - 70, y - 16, 140, 90, "rgba(20,22,24,0.22)");
  pixelRect(x - 62, y - 12, 124, 76, "#cdb88f");
  pixelRect(x - 62, y - 12, 124, 76, "rgba(120,90,55,0.18)");
  // half-timber crossbeams
  pixelRect(x - 50, y - 10, 8, 72, "#5a4128");
  pixelRect(x + 42, y - 10, 8, 72, "#5a4128");
  pixelRect(x - 62, y + 14, 124, 8, "#5a4128");
  pixelRect(x - 30, y - 8, 10, 70, "#5a4128");
  pixelRect(x + 4, y - 8, 10, 70, "#5a4128");
  // stone footing
  pixelRect(x - 62, y + 56, 124, 8, "#8a8478");
  // roof, steep and moss-covered
  pixelRect(x - 80, y - 58, 160, 46, "#4a3a2e");
  pixelRect(x - 72, y - 50, 144, 30, "#3a3a2e");
  pixelRect(x - 70, y - 48, 60, 10, "#4f6b3f");
  pixelRect(x - 4, y - 46, 70, 10, "#3f5a34");
  pixelRect(x + 30, y - 50, 36, 8, "#4f6b3f");
  // chimney with a curl of smoke
  pixelRect(x + 44, y - 86, 16, 36, "#7a6a5a");
  pixelRect(x + 41, y - 92, 22, 8, "#5a4f42");
  drawChimneySmoke(x + 52, y - 96);
  // door
  pixelRect(x - 12, y + 4, 24, 42, "#3a2c22");
  pixelRect(x - 9, y + 10, 18, 30, "#2c211b");
  pixelRect(x + 5, y + 24, 3, 4, "#c7b06b");
  // shuttered windows
  pixelRect(x - 44, y + 4, 18, 16, "#241b15");
  pixelRect(x - 41, y + 7, 12, 10, "#9fd6e0");
  pixelRect(x + 22, y + 4, 18, 16, "#241b15");
  pixelRect(x + 25, y + 7, 12, 10, "#9fd6e0");
  // ladder leaning against the wall
  pixelRect(x - 68, y - 4, 6, 50, "#7d5f3e");
  pixelRect(x - 54, y - 4, 6, 50, "#7d5f3e");
  for (let ry = y + 4; ry < y + 44; ry += 12) pixelRect(x - 68, ry, 20, 4, "#7d5f3e");
  // flowers and shrubs around the base
  drawFlower(x - 78, y + 62, "#f2a7b5");
  drawFlower(x - 30, y + 64, "#e9c46a");
  drawFlower(x + 40, y + 64, "#b4e7ee");
  drawHerbClump(x + 66, y + 58);
  drawWorldLabel(x, y - 102, cabin.name);
}

function drawChimneySmoke(x, y) {
  for (let i = 0; i < 4; i += 1) {
    const t = (game.time * 0.6 + i * 0.6) % 4;
    const sway = Math.sin(game.time + i) * 6;
    ctx.save();
    ctx.globalAlpha = clamp(0.32 - t * 0.07, 0, 0.32);
    pixelRect(x + sway, y - t * 18, 10 + t * 3, 9, "#e8e2d8");
    ctx.restore();
  }
}

function drawFountain(x, y) {
  pixelRect(x - 60, y - 60, 120, 120, "rgba(193,177,128,0.2)");
  pixelRect(x - 46, y - 46, 92, 92, "#8b8478");
  pixelRect(x - 36, y - 36, 72, 72, "#31555b");
  pixelRect(x - 22, y - 22, 44, 44, "rgba(180,231,238,0.5)");
  pixelRect(x - 8, y - 48, 16, 24, "#8b8478");
  pixelRect(x - 4, y - 60, 8, 16, "rgba(180,231,238,0.6)");
}

function drawPixelTownsfolk(x, y, outfitColor) {
  pixelRect(-9 + x, 14 + y, 18, 5, "rgba(20,22,24,0.24)");
  pixelRect(-10 + x, -38 + y, 20, 34, outfitColor);
  pixelRect(-10 + x, -38 + y, 20, 8, "rgba(255,255,255,0.12)");
  pixelRect(-12 + x, 0 + y, 8, 14, "#352421");
  pixelRect(4 + x, 0 + y, 8, 14, "#352421");
  pixelRect(-7 + x, -48 + y, 14, 12, "#e0b896");
  pixelRect(-7 + x, -56 + y, 14, 9, "#4a3530");
  pixelRect(-4 + x, -44 + y, 3, 2, "#241813");
  pixelRect(1 + x, -44 + y, 3, 2, "#241813");
}

function drawWagonStation(wagon) {
  const x = wagon.x;
  const y = wagon.y;
  pixelRect(x - 50, y - 4, 100, 10, "rgba(20,22,24,0.22)");
  // station post + sign
  pixelRect(x - 70, y - 70, 8, 70, "#6f4b2e");
  pixelRect(x - 96, y - 80, 64, 26, "#8b6a44");
  pixelRect(x - 90, y - 75, 52, 16, "#b58d58");
  // cart body
  pixelRect(x - 24, y - 36, 70, 32, "#7a4a30");
  pixelRect(x - 24, y - 44, 70, 10, "#8b5a3a");
  pixelRect(x - 14, y - 12, 16, 16, "#3a2c22");
  pixelRect(x + 30, y - 12, 16, 16, "#3a2c22");
  pixelRect(x - 12, y - 8, 12, 12, "#1c1c1c");
  pixelRect(x + 32, y - 8, 12, 12, "#1c1c1c");
  // canopy hoops
  pixelRect(x - 20, y - 56, 4, 22, "#5a4128");
  pixelRect(x + 16, y - 56, 4, 22, "#5a4128");
  pixelRect(x - 22, y - 60, 64, 8, "#c7b06b");
  // horse silhouette
  pixelRect(x + 48, y - 38, 30, 26, "#4a3530");
  pixelRect(x + 70, y - 50, 12, 18, "#4a3530");
  pixelRect(x + 50, y - 12, 6, 14, "#2c211b");
  pixelRect(x + 68, y - 12, 6, 14, "#2c211b");
}

function drawCastleInteriorScene() {
  const room = castleInteriorData;
  const p = game.player;
  game.camera.x = clamp(p.x - VIEW_W / 2, 0, Math.max(0, room.width - VIEW_W));
  game.camera.y = clamp(p.y - VIEW_H / 2, 0, Math.max(0, room.height - VIEW_H));
  const cam = game.camera;

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  const bg = ctx.createLinearGradient(0, 0, 0, room.height);
  bg.addColorStop(0, "#211c2a");
  bg.addColorStop(1, "#14111a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, room.width, room.height);
  drawCastleHallBackground(cam.x, cam.y, room.width);

  // stone floor tiling, clipped to the walkable zones (corridors + rooms)
  for (const zone of room.zones) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(zone.x, zone.y, zone.w, zone.h);
    ctx.clip();
    for (let x = zone.x - (zone.x % 64); x < zone.x + zone.w; x += 64) {
      for (let y = zone.y - (zone.y % 64); y < zone.y + zone.h; y += 64) {
        pixelRect(x, y, 62, 62, (Math.round(x / 64) + Math.round(y / 64)) % 2 ? "#3a3242" : "#332c3a");
      }
    }
    if (zone.name !== "entry") {
      pixelRect(zone.x, zone.y + zone.h / 2 - 36, zone.w, 72, "#7a1f24");
      pixelRect(zone.x, zone.y + zone.h / 2 - 36, zone.w, 6, "#931f26");
      pixelRect(zone.x, zone.y + zone.h / 2 + 30, zone.w, 6, "#5e171b");
    }
    ctx.restore();
  }

  for (const wall of castleInteriorWalls()) drawCastleInteriorWall(wall);
  for (const torch of room.torches) drawTorch(torch.x, torch.y);

  for (const pillar of room.pillars) drawHallPillar(pillar.x, pillar.y);
  for (const guard of room.guards) drawPixelGuard(guard.x, guard.y);

  drawThroneAndKing(room.king);

  // exit door back to the town
  pixelRect(room.exit.x, room.exit.y, room.exit.w, room.exit.h, "#241b15");
  pixelRect(room.exit.x + 6, room.exit.y + 6, room.exit.w - 12, room.exit.h - 12, "#3a2c22");
  if (rectContains(room.exit, p.x, p.y)) {
    drawWorldLabel(room.exit.x + room.exit.w / 2, room.exit.y - 16, "E: Leave Castle");
  }
  if (dist(p.x, p.y, room.king.x, room.king.y) < 95) {
    drawWorldLabel(room.king.x, room.king.y - 140, "E: Speak to the Duke");
  }

  drawPlayerTopDown(p);
  ctx.restore();
}

function drawCastleInteriorWall(wall) {
  pixelRect(wall.x, wall.y, wall.w, wall.h, "#3a352c");
  pixelRect(wall.x, wall.y, wall.w, 6, "rgba(0,0,0,0.3)");
  pixelRect(wall.x, wall.y + wall.h - 6, wall.w, 6, "rgba(0,0,0,0.3)");
}

function drawTorch(x, y) {
  const flicker = 0.7 + Math.sin(game.time * 9 + x) * 0.15;
  ctx.save();
  ctx.globalAlpha = 0.5 * flicker;
  pixelRect(x - 26, y - 26, 52, 52, "rgba(245,180,90,0.5)");
  ctx.globalAlpha = 1;
  pixelRect(x - 4, y - 4, 8, 22, "#3a2c22");
  pixelRect(x - 7, y - 16, 14, 12, "#f5a23a");
  pixelRect(x - 4, y - 22, 8, 10, "#fff0a6");
  ctx.restore();
}

function drawHallPillar(x, y) {
  pixelRect(x - 28, y + 28, 56, 10, "rgba(0,0,0,0.3)");
  pixelRect(x - 26, y - 70, 52, 100, "#6b6659");
  pixelRect(x - 30, y - 78, 60, 14, "#7f786a");
  pixelRect(x - 30, y + 24, 60, 14, "#7f786a");
  pixelRect(x - 10, y - 60, 20, 80, "rgba(255,255,255,0.06)");
}

function drawThroneAndKing(king) {
  const x = king.x;
  const y = king.y;
  pixelRect(x - 70, y - 80, 140, 170, "rgba(0,0,0,0.22)");
  pixelRect(x - 50, y - 60, 100, 130, "#5a4128");
  pixelRect(x - 40, y - 130, 80, 76, "#7a1f24");
  pixelRect(x - 40, y - 130, 80, 10, "#f5dd8b");
  pixelRect(x - 34, y - 50, 68, 110, "#3a2c22");
  pixelRect(x - 24, y - 42, 48, 96, "#7a1f24");

  // king figure seated on the throne
  pixelRect(x - 14, y - 20, 28, 30, "#2c2236");
  pixelRect(x - 16, y - 44, 32, 26, "#5d3a8a");
  pixelRect(x - 10, y - 60, 20, 18, "#e0c9a8");
  pixelRect(x - 12, y - 68, 24, 10, "#f5dd8b");
  pixelRect(x - 8, y - 70, 4, 6, "#dac4ff");
  pixelRect(x + 4, y - 70, 4, 6, "#dac4ff");
  pixelRect(x - 6, y - 54, 3, 3, "#241813");
  pixelRect(x + 3, y - 54, 3, 3, "#241813");
}

function drawPixelGuard(x, y) {
  pixelRect(x - 10, y + 16, 20, 6, "rgba(0,0,0,0.26)");
  pixelRect(x - 12, y - 38, 24, 40, "#3a3f4a");
  pixelRect(x - 12, y - 38, 24, 8, "#52596b");
  pixelRect(x - 8, y - 52, 16, 16, "#e0b896");
  pixelRect(x - 9, y - 60, 18, 12, "#6b7080");
  pixelRect(x - 13, y - 6, 9, 14, "#262a32");
  pixelRect(x + 4, y - 6, 9, 14, "#262a32");
  pixelRect(x + 12, y - 50, 6, 60, "#6b6659");
  pixelRect(x + 6, y - 78, 18, 30, "#9b9486");
}

function pixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function pixelRects(rects, scale = 1) {
  for (const [x, y, w, h, color] of rects) {
    pixelRect(x * scale, y * scale, w * scale, h * scale, color);
  }
}

function drawVillageSpellQuest() {
  const villager = overworldData.villager;
  const bramble = overworldData.bramble;
  const grimoire = overworldData.grimoire;

  drawPixelHeine(villager.x, villager.y);
  drawWorldLabel(villager.x, villager.y - 82, villager.helped ? "Heine: Danke" : "Heine");

  if (!bramble.cleared) {
    drawPixelFluchdorn(bramble.x, bramble.y, bramble.r);
    ctx.fillStyle = "rgba(0,0,0,0.46)";
    ctx.fillRect(bramble.x - 34, bramble.y - bramble.r - 22, 68, 6);
    ctx.fillStyle = "#8bd6bd";
    ctx.fillRect(bramble.x - 34, bramble.y - bramble.r - 22, 68 * clamp(bramble.hp / bramble.maxHp, 0, 1), 6);
  }

  if (bramble.cleared && !grimoire.collected) {
    const bob = Math.sin(game.time * 4) * 5;
    pixelRect(grimoire.x - 38, grimoire.y - 36 + bob, 76, 72, "rgba(245,221,139,0.18)");
    pixelRect(grimoire.x - 26, grimoire.y - 28 + bob, 52, 56, "rgba(245,221,139,0.18)");
    pixelRect(grimoire.x - 19, grimoire.y - 24 + bob, 38, 48, "#efe0a1");
    pixelRect(grimoire.x - 13, grimoire.y - 17 + bob, 26, 34, "#6d5367");
    pixelRect(grimoire.x - 2, grimoire.y - 20 + bob, 4, 40, "#b4e7ee");
    pixelRect(grimoire.x + 23, grimoire.y - 32 + bob, 8, 8, "#fff6dc");
    pixelRect(grimoire.x - 31, grimoire.y + 20 + bob, 8, 8, "#fff6dc");
    if (dist(game.player.x, game.player.y, grimoire.x, grimoire.y) < 75) {
      drawWorldLabel(grimoire.x, grimoire.y - 58 + bob, "E: Grimoire");
    }
  }
}

function drawPixelHeine(x, y) {
  ctx.save();
  ctx.translate(x - 24, y - 78);
  pixelRects([
    [7, 4, 30, 6, "#2c211b"],
    [5, 10, 34, 7, "#6d4b34"],
    [10, 17, 25, 6, "#b07b55"],
    [9, 23, 27, 20, "#d9bc91"],
    [8, 30, 5, 5, "#5b3a2c"],
    [32, 30, 5, 5, "#5b3a2c"],
    [15, 31, 4, 4, "#23323b"],
    [28, 31, 4, 4, "#23323b"],
    [20, 39, 11, 4, "#b98268"],
    [12, 43, 24, 8, "#f0d2a6"],
    [8, 51, 31, 41, "#4c6b57"],
    [8, 51, 31, 7, "#7e9e73"],
    [16, 58, 15, 28, "#38503f"],
    [4, 57, 8, 29, "#384b3c"],
    [35, 57, 8, 29, "#384b3c"],
    [1, 82, 10, 8, "#d9bc91"],
    [38, 82, 10, 8, "#d9bc91"],
    [13, 92, 10, 25, "#2d3036"],
    [27, 92, 10, 25, "#2d3036"],
    [10, 115, 14, 8, "#7b6049"],
    [26, 115, 14, 8, "#7b6049"],
    [38, 62, 6, 23, "#b88f5d"],
    [40, 54, 10, 10, "#d9bc91"],
    [6, 72, 6, 14, "#8eb36c"],
  ], 0.92);
  ctx.restore();
}

function drawPixelFluchdorn(x, y, r) {
  const pulse = Math.floor(game.time * 5) % 2;
  ctx.save();
  ctx.translate(x, y);
  pixelRect(-50, 32, 100, 12, "rgba(18,35,27,0.34)");
  pixelRect(-36, -12, 72, 24, "#223326");
  pixelRect(-26, -26, 52, 52, "#273b2c");
  pixelRect(-14, -34, 28, 68, "#1c2a20");
  pixelRect(-46, -4, 92, 8, "#8bd6bd");
  pixelRect(-4, -46, 8, 92, "#8bd6bd");
  pixelRect(-34, -34, 12, 12, "#8bd6bd");
  pixelRect(22, -34, 12, 12, "#8bd6bd");
  pixelRect(-34, 22, 12, 12, "#8bd6bd");
  pixelRect(22, 22, 12, 12, "#8bd6bd");
  pixelRect(-r - 8, -4, 18, 8, pulse ? "#b4e7ee" : "#6dbfa8");
  pixelRect(r - 10, -4, 18, 8, pulse ? "#b4e7ee" : "#6dbfa8");
  pixelRect(-4, -r - 8, 8, 18, pulse ? "#b4e7ee" : "#6dbfa8");
  pixelRect(-4, r - 10, 8, 18, pulse ? "#b4e7ee" : "#6dbfa8");
  pixelRect(-12, -12, 24, 24, "#18231b");
  pixelRect(-5, -5, 10, 10, pulse ? "#263e34" : "#0f1a14");
  pixelRect(-24, -6, 8, 8, "#6dbfa8");
  pixelRect(16, 12, 8, 8, "#6dbfa8");
  ctx.restore();
}

function drawOverworldPrompts() {
  const p = game.player;
  if (dist(p.x, p.y, overworldData.camp.x, overworldData.camp.y) < 120) {
    drawWorldLabel(overworldData.camp.x, overworldData.camp.y - 95, "R: Rest");
  }
  if (dist(p.x, p.y, overworldData.villager.x, overworldData.villager.y) < 110) {
    drawWorldLabel(overworldData.villager.x, overworldData.villager.y - 126, "E: Talk");
  }
  if (dist(p.x, p.y, overworldData.portal.x, overworldData.portal.y) < 125) {
    drawWorldLabel(overworldData.portal.x, overworldData.portal.y - 105, "E: Enter dungeon");
  }
  for (const wagon of mapData.wagons) {
    if (dist(p.x, p.y, wagon.x, wagon.y) < 110) {
      drawWorldLabel(wagon.x, wagon.y - 92, "E / M: Fast Travel");
    }
  }
  const town = overworldData.castleTown;
  if (dist(p.x, p.y, town.keepDoorX, town.keepDoorY) < 90) {
    drawWorldLabel(town.keepDoorX, town.keepDoorY - 150, "E: Enter Castle");
  }
  if (dist(p.x, p.y, town.cryptEntranceX, town.cryptEntranceY) < 90) {
    drawWorldLabel(town.cryptEntranceX, town.cryptEntranceY - 70, "E: Enter Königsgrab");
  }
  for (const npc of town.npcs) {
    if (dist(p.x, p.y, npc.x, npc.y) < 95) {
      drawWorldLabel(npc.x, npc.y - 96, "E: Talk");
    }
  }
}

function drawProjectiles(projectiles) {
  for (const shot of projectiles) {
    const shade = shot.spell === "shadeBolt";
    const wraith = shot.spell === "wraithBolt";
    const breath = shot.spell === "dragonBreath";
    const blackhole = shot.spell === "blackhole";
    ctx.save();
    ctx.translate(shot.x, shot.y);
    if (blackhole) {
      const spin = game.time * 6;
      ctx.rotate(spin);
      ctx.fillStyle = "rgba(120,60,160,0.22)";
      ctx.beginPath();
      ctx.arc(0, 0, shot.r + 18, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#1a0f24";
      ctx.beginPath();
      ctx.arc(0, 0, shot.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(218,196,255,0.6)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, shot.r - 6, 0.4, 2.6);
      ctx.stroke();
      ctx.strokeStyle = "rgba(180,231,238,0.4)";
      ctx.beginPath();
      ctx.arc(0, 0, shot.r + 10, 2.2, 4.4);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.rotate(Math.atan2(shot.vy, shot.vx));
    if (breath) {
      pixelRect(-30, -16, 50, 32, "rgba(241,123,53,0.28)");
      pixelRect(-22, -9, 50, 18, "#d9551f");
      pixelRect(-10, -13, 30, 26, "#f9a23a");
      pixelRect(16, -5, 22, 10, "#ffe7b0");
      pixelRect(34, -3, 10, 6, "#ffe7b0");
    } else if (wraith) {
      pixelRect(-24, -12, 40, 24, "rgba(108,224,236,0.22)");
      pixelRect(-18, -6, 42, 12, "#3f8a96");
      pixelRect(-8, -10, 24, 20, "#b4e7ee");
      pixelRect(12, -4, 18, 8, "#eafcff");
      pixelRect(28, -2, 8, 4, "#eafcff");
    } else {
      pixelRect(-24, -12, 40, 24, shade ? "rgba(150,91,205,0.24)" : "rgba(91,170,205,0.24)");
      pixelRect(-18, -6, 42, 12, shade ? "#8a5ac8" : "#5aa5c8");
      pixelRect(-8, -10, 24, 20, shade ? "#dac4ff" : "#b4e7ee");
      pixelRect(12, -4, 18, 8, "#f4ecff");
      pixelRect(28, -2, 8, 4, "#f4ecff");
    }
    ctx.restore();
  }
}

function drawWorldLabel(x, y, text) {
  ctx.font = "800 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(12,13,14,0.68)";
  const width = ctx.measureText(text).width + 24;
  ctx.fillRect(x - width / 2, y - 24, width, 32);
  ctx.fillStyle = "#fff6dc";
  ctx.fillText(text, x, y - 2);
}

function drawDungeon() {
  const p = game.player;
  const floor = activeDungeonFloor();
  game.camera.x = clamp(p.x - VIEW_W * 0.42, 0, floor.width - VIEW_W);
  const camX = game.camera.x;

  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, "#151923");
  bg.addColorStop(0.55, "#20261f");
  bg.addColorStop(1, "#101210");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.translate(-camX, 0);
  drawDungeonBackdrop(camX);
  for (const plat of floor.platforms) drawPlatform(plat);
  for (const secret of floor.secrets) drawSecretWall(secret);
  for (const chest of visibleDungeonChests()) drawDungeonChest(chest);
  if (floor.finalMimic && game.dungeon.completed) drawFinalMimicChest(floor.finalMimic);
  for (const spike of floor.spikes) drawSpikes(spike);
  drawDungeonGate();
  for (const foe of game.dungeon.enemies) drawEnemy(foe, "dungeon");
  if (game.dungeon.boss) drawEnemy(game.dungeon.boss, "dungeon");
  drawProjectiles(game.dungeon.projectiles);
  drawProjectiles(game.dungeon.enemyProjectiles);
  drawMotes(game.dungeon.motes);
  drawPlayerSide(p);
  if (game.dungeon.mimicEvent) drawMimicGrab(game.dungeon.mimicEvent, p);
  ctx.restore();
}

function drawCrypt() {
  const p = game.player;
  const floor = activeCryptFloor();
  game.camera.x = clamp(p.x - VIEW_W * 0.42, 0, floor.width - VIEW_W);
  const camX = game.camera.x;

  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, "#1c1428");
  bg.addColorStop(0.55, "#241a1f");
  bg.addColorStop(1, "#100c14");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.translate(-camX, 0);
  drawCryptBackdrop(camX, floor.width);
  for (const plat of floor.platforms) drawCryptPlatform(plat);
  for (const secret of floor.secrets) drawSecretWall(secret, game.crypt.revealedSecrets);
  for (const chest of visibleCryptChests()) drawDungeonChest(chest, game.crypt.openedChests);
  for (const spike of floor.spikes) drawSpikes(spike);
  drawCryptGate();
  for (const foe of game.crypt.enemies) drawEnemy(foe, "crypt");
  if (game.crypt.boss) drawEnemy(game.crypt.boss, "crypt");
  drawProjectiles(game.crypt.projectiles);
  drawProjectiles(game.crypt.enemyProjectiles);
  drawMotes(game.crypt.motes);
  drawPlayerSide(p);
  ctx.restore();
}

function drawCryptBackdrop(camX, worldWidth) {
  drawParallaxLayerWorld(BACKGROUNDS.cryptMoon, camX, 0.06, 0, VIEW_H * 0.62, worldWidth);
  drawParallaxLayerWorld(BACKGROUNDS.cryptMountains, camX, 0.18, VIEW_H * 0.22, VIEW_H * 0.55, worldWidth);
  drawParallaxLayerWorld(BACKGROUNDS.cryptGraveyard, camX, 0.4, VIEW_H * 0.4, VIEW_H * 0.6, worldWidth);

  ctx.fillStyle = "rgba(124,104,143,0.08)";
  for (let x = -120; x < worldWidth + 200; x += 190) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 70, 720);
    ctx.lineTo(x + 125, 720);
    ctx.lineTo(x + 50, 0);
    ctx.closePath();
    ctx.fill();
  }
  for (let x = 80; x < worldWidth; x += 180) {
    pixelRect(x, 118 + (x % 5) * 18, 48, 5, "rgba(245,221,139,0.06)");
    pixelRect(x + 20, 305 + (x % 7) * 12, 28, 4, "rgba(218,196,255,0.08)");
  }
}

function drawCryptPlatform(plat) {
  ctx.fillStyle = "#3a3242";
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  ctx.fillStyle = "#5d4d63";
  ctx.fillRect(plat.x, plat.y, plat.w, 8);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
  for (let x = plat.x + 20; x < plat.x + plat.w - 10; x += 70) {
    pixelRect(x, plat.y + 14, 4, plat.h - 24, "rgba(0,0,0,0.18)");
  }
}

function drawCryptGate() {
  const floor = activeCryptFloor();
  if (floor.descent) {
    const gate = floor.descent;
    pixelRect(gate.x, gate.y, gate.w, gate.h, "#2c2433");
    pixelRect(gate.x + 10, gate.y + 10, gate.w - 20, gate.h - 20, "#5d4d63");
    for (let y = gate.y + 18; y < gate.y + gate.h - 10; y += 18) pixelRect(gate.x + 8, y, gate.w - 16, 5, "#9b8aa6");
    if (rectContains(gate, game.player.x, game.player.y - 35)) drawWorldLabel(gate.x + gate.w / 2, gate.y - 18, gate.label);
  }

  if (floor.exit) {
    const door = floor.exit;
    pixelRect(door.x, door.y, door.w, door.h, game.crypt.completed ? "rgba(245,221,139,0.34)" : "rgba(58,48,66,0.7)");
    pixelRect(door.x + 7, door.y + 7, door.w - 14, door.h - 14, game.crypt.completed ? "#6b5a2e" : "#44384a");
    pixelRect(door.x + 18, door.y + 16, 22, 70, game.crypt.completed ? "#f5dd8b" : "#867b8c");
    if (rectContains(door, game.player.x, game.player.y - 35)) drawWorldLabel(door.x + door.w / 2, door.y - 18, "E: Return");
  }
}

function drawMimicGrab(event, p) {
  const wiggle = Math.sin(game.time * 16) * 7;
  pixelRect(event.x - 50, event.y - 30, 100, 60, "#5a3a26");
  pixelRect(event.x - 44, event.y - 74, 88, 44, "#7a4a30");
  pixelRect(event.x - 40, event.y - 68, 12, 36, "#fff6dc");
  pixelRect(event.x + 28, event.y - 68, 12, 36, "#fff6dc");
  pixelRect(event.x - 18, event.y - 62, 12, 28, "#fff6dc");
  pixelRect(event.x + 6, event.y - 62, 12, 28, "#fff6dc");
  pixelRect(p.x - 34 + wiggle, p.y - 74, 9, 56, "#3a2a4a");
  pixelRect(p.x + 25 - wiggle, p.y - 74, 9, 56, "#3a2a4a");
  pixelRect(p.x - 22 - wiggle, p.y - 48, 9, 40, "#4f3760");
  pixelRect(p.x + 13 + wiggle, p.y - 48, 9, 40, "#4f3760");
  drawWorldLabel(p.x, event.y - 92, "Mash J!");
}

function drawDungeonBackdrop() {
  const floor = activeDungeonFloor();
  ctx.fillStyle = game.dungeon.floorIndex === 0
    ? "rgba(126,154,111,0.08)"
    : game.dungeon.floorIndex === 1
      ? "rgba(91,170,205,0.08)"
      : "rgba(124,104,143,0.10)";
  for (let x = -120; x < floor.width + 200; x += 190) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 70, 720);
    ctx.lineTo(x + 125, 720);
    ctx.lineTo(x + 50, 0);
    ctx.closePath();
    ctx.fill();
  }
  for (let x = 80; x < floor.width; x += 180) {
    pixelRect(x, 118 + (x % 5) * 18, 48, 5, "rgba(180,231,238,0.10)");
    pixelRect(x + 20, 305 + (x % 7) * 12, 28, 4, "rgba(245,221,139,0.08)");
  }
}

function drawPlatform(plat) {
  ctx.fillStyle = "#4b5147";
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  ctx.fillStyle = "#77775f";
  ctx.fillRect(plat.x, plat.y, plat.w, 8);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
}

function drawSpikes(spike) {
  const count = Math.max(2, Math.floor(spike.w / 18));
  for (let i = 0; i < count; i += 1) {
    const x = spike.x + (i / count) * spike.w;
    const w = spike.w / count;
    pixelRect(x + 2, spike.y + spike.h - 8, w - 4, 8, "#7d4648");
    pixelRect(x + w * 0.28, spike.y + 10, w * 0.44, spike.h - 8, "#9c5b58");
    pixelRect(x + w * 0.38, spike.y, w * 0.24, 12, "#d3a09a");
  }
}

function drawDungeonGate() {
  const floor = activeDungeonFloor();
  if (floor.descent) {
    const gate = floor.descent;
    pixelRect(gate.x, gate.y, gate.w, gate.h, "#3c362c");
    pixelRect(gate.x + 10, gate.y + 10, gate.w - 20, gate.h - 20, "#6f5135");
    for (let y = gate.y + 18; y < gate.y + gate.h - 10; y += 18) pixelRect(gate.x + 8, y, gate.w - 16, 5, "#b18a56");
    if (rectContains(gate, game.player.x, game.player.y - 35)) drawWorldLabel(gate.x + gate.w / 2, gate.y - 18, gate.label);
  }

  if (floor.exit) {
    const door = floor.exit;
    pixelRect(door.x, door.y, door.w, door.h, game.dungeon.completed ? "rgba(108,224,236,0.34)" : "rgba(58,48,66,0.7)");
    pixelRect(door.x + 7, door.y + 7, door.w - 14, door.h - 14, game.dungeon.completed ? "#31555b" : "#44384a");
    pixelRect(door.x + 18, door.y + 16, 22, 70, game.dungeon.completed ? "#b4e7ee" : "#867b8c");
    if (rectContains(door, game.player.x, game.player.y - 35)) drawWorldLabel(door.x + door.w / 2, door.y - 18, "E: Return");
  }
}

function drawSecretWall(secret, revealedSecrets = game.dungeon.revealedSecrets) {
  const revealed = revealedSecrets.has(secret.id);
  if (revealed) {
    pixelRect(secret.x - 4, secret.y, 6, secret.h, "rgba(180,231,238,0.18)");
    pixelRect(secret.x + secret.w - 2, secret.y, 6, secret.h, "rgba(180,231,238,0.18)");
    return;
  }
  pixelRect(secret.x, secret.y, secret.w, secret.h, "#3d433e");
  pixelRect(secret.x + 5, secret.y + 8, secret.w - 10, 8, "#5a6058");
  pixelRect(secret.x + 8, secret.y + 32, secret.w - 16, 5, "#7f7670");
  pixelRect(secret.x + 12, secret.y + 58, 5, 28, "#b4e7ee");
  pixelRect(secret.x + secret.w - 16, secret.y + 20, 5, 36, "#dac4ff");
}

function drawDungeonChest(chest, openedChests = game.dungeon.openedChests) {
  const open = openedChests.has(chest.id);
  pixelRect(chest.x, chest.y + 10, chest.w, chest.h - 10, open ? "#6f5135" : "#8b6238");
  pixelRect(chest.x + 3, chest.y, chest.w - 6, 14, open ? "#b18a56" : "#c7b06b");
  pixelRect(chest.x + chest.w / 2 - 4, chest.y + 16, 8, 8, open ? "#2f261d" : "#fff6dc");
  if (!open && dist(game.player.x, game.player.y - 28, chest.x + chest.w / 2, chest.y + chest.h / 2) < 82) {
    drawWorldLabel(chest.x + chest.w / 2, chest.y - 18, "E: Open");
  }
}

function drawFinalMimicChest(chest) {
  const p = game.player;
  if (game.dungeon.finalMimicOpen) {
    pixelRect(chest.x, chest.y + 12, chest.w, chest.h - 12, "#5a4128");
    pixelRect(chest.x + 4, chest.y - 6, chest.w - 8, 14, "#3a2a1c");
    return;
  }
  const near = dist(p.x, p.y - 28, chest.x + chest.w / 2, chest.y + chest.h / 2) < 92;
  pixelRect(chest.x, chest.y + 12, chest.w, chest.h - 12, "#8b6238");
  pixelRect(chest.x + 4, chest.y, chest.w - 8, 16, "#d0a85f");
  pixelRect(chest.x + 8, chest.y + 20, chest.w - 16, 8, "#513a26");
  pixelRect(chest.x + chest.w / 2 - 5, chest.y + 17, 10, 10, "#fff6dc");
  pixelRect(chest.x + 7, chest.y + 31, 8, 5, "#f4f1e8");
  pixelRect(chest.x + 23, chest.y + 31, 8, 5, "#f4f1e8");
  pixelRect(chest.x + 39, chest.y + 31, 8, 5, "#f4f1e8");
  if (!near) return;
  if (p.spells.mikheit.known) {
    drawWorldLabel(chest.x + chest.w / 2, chest.y - 52, "Mikheit: 99% Mimic");
    drawWorldLabel(chest.x + chest.w / 2, chest.y - 18, "E: Risk it");
  } else {
    drawWorldLabel(chest.x + chest.w / 2, chest.y - 18, "E: Open");
  }
}

function drawPlayerTopDown(p) {
  drawPlayerSprite(p, 0.24, false);
}

function drawPlayerSide(p) {
  drawPlayerSprite(p, 0.28, true);
}

function pickAnimRow(sheet, p, attackRowKey, attackDuration, aerial) {
  const acting = p.attackTime > 0;
  const airborne = aerial && !p.onGround;
  const moving = p.moving || Math.abs(p.vx) > 22 || Math.abs(p.vy) > 22;

  if (acting && sheet[attackRowKey]) {
    const t = clamp(1 - p.attackTime / attackDuration, 0, 1);
    return { rowKey: attackRowKey, idx: Math.floor(t * sheet[attackRowKey].count) };
  }
  if (airborne && sheet.jump) {
    const idx = p.vy < 0
      ? Math.floor(clamp((-p.vy / 650) * (sheet.jump.count / 2), 0, sheet.jump.count / 2 - 1))
      : sheet.jump.count - 1 - Math.floor(clamp((p.vy / 700) * (sheet.jump.count / 2), 0, sheet.jump.count / 2 - 1));
    return { rowKey: "jump", idx };
  }
  if (moving && sheet.run) {
    return { rowKey: "run", idx: Math.floor(game.time * 12) % sheet.run.count };
  }
  return { rowKey: "idle", idx: Math.floor(game.time * 4) % sheet.idle.count };
}

function drawPlayerSprite(p, scale, aerial) {
  const moving = p.moving || Math.abs(p.vx) > 22 || Math.abs(p.vy) > 22;
  const castFrame = p.attackTime > 0;
  const frameIndex = castFrame
    ? PLAYER_SPRITE.frames.cast
    : moving
      ? PLAYER_SPRITE.frames.walk[Math.floor(game.time * 8) % PLAYER_SPRITE.frames.walk.length]
      : PLAYER_SPRITE.frames.idle;
  const flip = p.facingX < -0.15;
  const srcX = frameIndex * PLAYER_SPRITE.frameW;

  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.hurtCd > 0 && Math.floor(game.time * 18) % 2 === 0) ctx.globalAlpha = 0.45;
  if (p.dodgeTime > 0) ctx.globalAlpha *= 0.78;
  if (p.flightTime > 0) drawFlugmagieAura(scale);

  if (p.character === "fern") {
    const { rowKey, idx } = pickAnimRow(FERN_SHEET, p, "cast", 0.18, aerial);
    const drawn = drawCharacterSheet(FERN_SHEET, rowKey, idx, CHAR_SHEET_SCALE, flip)
      || drawCharacterSheet(FERN_SHEET, "idle", 0, CHAR_SHEET_SCALE, flip);
    if (!drawn) drawSpritePlaceholder();
  } else if (p.character === "stark") {
    const { rowKey, idx } = pickAnimRow(STARK_SHEET, p, "attack", STURMKLINGE_SWING_DURATION, aerial);
    const drawn = drawCharacterSheet(STARK_SHEET, rowKey, idx, CHAR_SHEET_SCALE, flip)
      || drawCharacterSheet(STARK_SHEET, "idle", 0, CHAR_SHEET_SCALE, flip);
    if (!drawn) drawSpritePlaceholder();
  } else {
    ctx.scale(flip ? -scale : scale, scale);
    if (playerSprite.complete && playerSprite.naturalWidth > 0) {
      ctx.drawImage(
        playerSprite,
        srcX,
        0,
        PLAYER_SPRITE.frameW,
        PLAYER_SPRITE.frameH,
        -PLAYER_SPRITE.pivotX,
        -PLAYER_SPRITE.pivotY,
        PLAYER_SPRITE.frameW,
        PLAYER_SPRITE.frameH,
      );
    } else {
      ctx.fillStyle = "#f2efe8";
      ctx.fillRect(-12, -54, 24, 54);
    }
  }
  ctx.restore();
}

function drawSpritePlaceholder() {
  ctx.fillStyle = "rgba(244,241,232,0.55)";
  ctx.fillRect(-12, -54, 24, 54);
}

function drawFlugmagieAura(scale) {
  ctx.save();
  ctx.globalAlpha = 0.7;
  pixelRect(-26, -18, 52, 8, "rgba(180,231,238,0.42)");
  pixelRect(-38, -2, 18, 6, "rgba(180,231,238,0.36)");
  pixelRect(20, -2, 18, 6, "rgba(180,231,238,0.36)");
  pixelRect(-8, -92, 16, 5, "rgba(218,196,255,0.38)");
  ctx.restore();
}

function drawEnemy(foe, space) {
  if (!foe || foe.dead) return;
  ctx.save();
  ctx.translate(foe.x, foe.y);
  if (foe.hurt > 0) ctx.globalAlpha = 0.55;

  if (!drawEnemySprite(foe)) {
    if (foe.type === "wisp") {
      drawPixelWisp(foe);
    } else if (foe.type === "shade") {
      drawPixelShade(foe);
    } else if (foe.type === "wraith") {
      drawPixelWraith(foe);
    } else if (foe.type === "bat") {
      drawPixelBat(foe);
    } else if (foe.type === "dragon") {
      ctx.scale(foe.facing >= 0 ? 1 : -1, 1);
      drawPixelDragon(foe);
    } else {
      ctx.scale(foe.facing >= 0 ? 1 : -1, 1);
      if (foe.type === "knight") {
        drawPixelKnight(foe);
      } else if (foe.type === "cursed_king" || foe.type === "forest_guardian") {
        drawPixelCursedKing(foe);
      } else {
        drawPixelCrawler(foe);
      }
    }
  }

  drawEnemyHealth(foe, space);
  ctx.restore();
}

function drawPixelWisp(foe) {
  const bob = Math.round(Math.sin(game.time * 8 + foe.x) * 3);
  pixelRect(-28, -20 + bob, 56, 40, "rgba(90, 173, 197, 0.24)");
  pixelRect(-20, -24 + bob, 40, 48, "rgba(90, 173, 197, 0.24)");
  pixelRect(-16, -16 + bob, 32, 32, "#5aa5c8");
  pixelRect(-10, -10 + bob, 20, 20, "#92dbe7");
  pixelRect(-4, -4 + bob, 8, 8, "#e8fbff");
  pixelRect(-26, -2 + bob, 8, 8, "#7ed6e2");
  pixelRect(18, 6 + bob, 8, 8, "#7ed6e2");
  pixelRect(-6, 16 + bob, 5, 13, "rgba(180,231,238,0.55)");
  pixelRect(7, 18 + bob, 5, 10, "rgba(180,231,238,0.4)");
}

function drawPixelShade(foe) {
  const twitch = Math.floor(game.time * 6 + foe.x) % 2;
  pixelRect(-46, -40, 92, 80, "rgba(19, 16, 25, 0.5)");
  pixelRect(-34, -52, 68, 104, "#1b1622");
  pixelRect(-50, -28, 20, 56, "#21182a");
  pixelRect(30, -28, 20, 56, "#21182a");
  pixelRect(-24, -64, 48, 18, "#17111d");
  pixelRect(-30, 34, 22, 22, "#17111d");
  pixelRect(8, 34, 22, 22, "#17111d");
  pixelRect(-18, -16 + twitch, 12, 8, "#dac4ff");
  pixelRect(8, -16 - twitch, 12, 8, "#dac4ff");
  pixelRect(-6, 8, 12, 8, "#6d5367");
  pixelRect(-42, -58, 12, 22, "#21182a");
  pixelRect(30, -58, 12, 22, "#21182a");
  pixelRect(-8, -70, 16, 12, "#2b1d36");
}

function drawPixelWraith(foe) {
  const twitch = Math.floor(game.time * 6 + foe.x) % 2;
  pixelRect(-44, -38, 88, 78, "rgba(20, 50, 56, 0.5)");
  pixelRect(-32, -50, 64, 100, "#142a30");
  pixelRect(-46, -26, 18, 52, "#1b3a40");
  pixelRect(28, -26, 18, 52, "#1b3a40");
  pixelRect(-22, -62, 44, 16, "#0f2226");
  pixelRect(-28, 32, 20, 20, "#0f2226");
  pixelRect(6, 32, 20, 20, "#0f2226");
  pixelRect(-16, -16 + twitch, 12, 8, "#b4e7ee");
  pixelRect(6, -16 - twitch, 12, 8, "#b4e7ee");
  pixelRect(-6, 6, 12, 8, "#3f8a96");
  pixelRect(-40, -56, 12, 22, "#1b3a40");
  pixelRect(28, -56, 12, 22, "#1b3a40");
  pixelRect(-8, -68, 16, 12, "#264e56");
}

function drawPixelBat(foe) {
  const flap = Math.floor(game.time * 10 + foe.x) % 2;
  const wingY = flap ? -22 : -12;
  pixelRect(-8, -12, 16, 24, "#384a5c");
  pixelRect(-4, -20, 8, 8, "#6f8090");
  pixelRect(-42, wingY, 34, 12, "#52667a");
  pixelRect(8, wingY, 34, 12, "#52667a");
  pixelRect(-34, wingY + 12, 18, 10, "#303d4c");
  pixelRect(16, wingY + 12, 18, 10, "#303d4c");
  pixelRect(-12, -4, 6, 5, "#b4e7ee");
  pixelRect(6, -4, 6, 5, "#b4e7ee");
}

function drawPixelCrawler(foe) {
  pixelRect(-34, -2, 68, 9, "rgba(20,22,24,0.24)");
  pixelRect(-22, -38, 44, 32, "#545861");
  pixelRect(-16, -50, 32, 16, "#6c7078");
  pixelRect(-10, -46, 20, 8, "#8a8e8b");
  pixelRect(10, -28, 24, 8, "#909486");
  pixelRect(-30, -14, 12, 16, "#393c43");
  pixelRect(-8, -10, 12, 16, "#393c43");
  pixelRect(16, -14, 12, 16, "#393c43");
  pixelRect(28, -36, 10, 22, "#c7b06b");
  pixelRect(36, -42, 18, 6, "#c7b06b");
  pixelRect(8, -43, 6, 5, "#f06d59");
}

function drawPixelKnight(foe) {
  pixelRect(-36, 8, 72, 9, "rgba(20,22,24,0.28)");
  pixelRect(-28, -84, 56, 82, "#513944");
  pixelRect(-22, -96, 44, 22, "#7a5d63");
  pixelRect(-16, -88, 32, 10, "#d0c2a4");
  pixelRect(-10, -75, 20, 14, "#3e2f38");
  pixelRect(-18, -56, 36, 10, "#c7b06b");
  pixelRect(-34, -68, 12, 44, "#3a2c34");
  pixelRect(22, -68, 12, 44, "#3a2c34");
  pixelRect(-20, -2, 14, 18, "#2c2e37");
  pixelRect(6, -2, 14, 18, "#2c2e37");
  pixelRect(24, -54, 16, 50, "#c7b06b");
  pixelRect(36, -62, 34, 8, "#c7b06b");
  pixelRect(6, -84, 8, 6, "#dac4ff");
}

function drawPixelCursedKing(foe) {
  pixelRect(-40, 8, 80, 10, "rgba(20,22,24,0.3)");
  pixelRect(-30, -90, 60, 88, "#3a3a3e");
  pixelRect(-24, -104, 48, 24, "#544f56");
  pixelRect(-18, -94, 36, 12, "#cfc6b4");
  pixelRect(-12, -80, 24, 16, "#1c1c1e");
  pixelRect(-20, -60, 40, 10, "#dac4ff");
  pixelRect(-36, -74, 14, 48, "#2c2c30");
  pixelRect(24, -74, 14, 48, "#2c2c30");
  pixelRect(-22, -2, 16, 20, "#1c1c1e");
  pixelRect(6, -2, 16, 20, "#1c1c1e");
  pixelRect(26, -58, 18, 56, "#dac4ff");
  pixelRect(40, -68, 36, 9, "#dac4ff");
  pixelRect(-14, -104, 8, 14, "#f5dd8b");
  pixelRect(2, -104, 8, 14, "#f5dd8b");
  pixelRect(-4, -112, 6, 10, "#f5dd8b");
  pixelRect(4, -92, 6, 6, "#dac4ff");
}

function drawPixelDragon(foe) {
  const flap = Math.floor(game.time * 5 + foe.x) % 2;
  const wingY = flap ? -58 : -44;
  pixelRect(-70, 18, 140, 14, "rgba(20,22,24,0.28)");
  pixelRect(-58, -34, 116, 56, "#3a6b3f");
  pixelRect(-30, -64, 60, 36, "#477f4c");
  pixelRect(-14, -86, 30, 26, "#5a9a5f");
  pixelRect(-10, -98, 10, 14, "#8bd6bd");
  pixelRect(8, -98, 10, 14, "#8bd6bd");
  pixelRect(-8, -78, 8, 8, "#f06d59");
  pixelRect(6, -78, 8, 8, "#f06d59");
  pixelRect(-90, wingY, 70, 50, "rgba(58,107,63,0.9)");
  pixelRect(20, wingY, 70, 50, "rgba(58,107,63,0.9)");
  pixelRect(-86, wingY + 6, 60, 8, "#2a4a2e");
  pixelRect(26, wingY + 6, 60, 8, "#2a4a2e");
  pixelRect(60, -10, 56, 16, "#3a6b3f");
  pixelRect(104, -2, 26, 10, "#477f4c");
  pixelRect(-50, 12, 16, 22, "#2a4a2e");
  pixelRect(-10, 12, 16, 22, "#2a4a2e");
  pixelRect(28, 12, 16, 22, "#2a4a2e");
}

function drawEnemyHealth(foe, space) {
  const y = isSideViewSpace(space) ? -foe.r - 24 : -foe.r - 18;
  const width = foe.type === "dragon" ? 110
    : foe.type === "knight" || foe.type === "shade" || foe.type === "cursed_king"
      || foe.type === "wraith" || foe.type === "forest_guardian" ? 74
      : 44;
  ctx.fillStyle = "rgba(0,0,0,0.46)";
  ctx.fillRect(-width / 2, y, width, 6);
  ctx.fillStyle = "#ef7163";
  ctx.fillRect(-width / 2, y, width * clamp(foe.hp / foe.maxHp, 0, 1), 6);
}

function drawMotes(motes) {
  for (const mote of motes) {
    const alpha = clamp(mote.life / mote.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    if (mote.shape === "slash") {
      drawSlashFx(mote, alpha);
    } else if (mote.shape === "beam") {
      drawBeamFx(mote, alpha);
    } else {
      pixelRect(mote.x - 3, mote.y - 3, 6, 6, mote.color);
    }
    ctx.globalAlpha = 1;
  }
}

function drawBeamFx(mote, alpha) {
  ctx.save();
  ctx.translate(mote.x, mote.y);
  ctx.rotate(Math.atan2(mote.dirY, mote.dirX));
  const len = mote.range;
  const color = mote.color || "#b4e7ee";
  ctx.globalAlpha = alpha * 0.4;
  ctx.fillStyle = color;
  ctx.fillRect(0, -11, len, 22);
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillRect(0, -4, len, 8);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fff6dc";
  ctx.fillRect(0, -1.5, len, 3);
  ctx.restore();
}

function drawSlashFx(mote, alpha) {
  const grow = 1 - alpha;
  ctx.save();
  ctx.translate(mote.x, mote.y);
  ctx.scale(mote.dirX >= 0 ? 1 : -1, 1);
  ctx.strokeStyle = mote.color;
  ctx.lineWidth = 7 * alpha + 1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(-10, -20, 50 + grow * 26, -1.0, 0.95, false);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(-10, -20, 50 + grow * 26, -0.78, 0.72, false);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.5;
  ctx.fillStyle = mote.color;
  ctx.beginPath();
  ctx.arc(-10, -20, 50 + grow * 26, -0.5, 0.5, false);
  ctx.fill();
  ctx.restore();
}

let last = performance.now();
let gameLoopStarted = false;
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

const SAVE_KEY = "frieren-tr-saves";
const SAVE_SLOTS = 4;

function loadSlots() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "[]");
    const slots = new Array(SAVE_SLOTS).fill(null);
    for (let i = 0; i < SAVE_SLOTS; i += 1) slots[i] = raw[i] || null;
    return slots;
  } catch {
    return new Array(SAVE_SLOTS).fill(null);
  }
}

function writeSlots(slots) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(slots));
}

function serializeGame() {
  const p = game.player;
  return {
    character: p.character,
    savedAt: Date.now(),
    player: {
      character: p.character,
      hp: p.hp, maxHp: p.maxHp,
      stamina: p.stamina, maxStamina: p.maxStamina,
      mana: p.mana, maxMana: p.maxMana,
      x: p.x, y: p.y,
      relics: p.relics, gold: p.gold,
      spells: JSON.parse(JSON.stringify(p.spells)),
    },
    mode: game.mode,
    won: game.won,
    shadeDefeated: game.overworld.shadeDefeated,
    bramble: { hp: overworldData.bramble.hp, cleared: overworldData.bramble.cleared },
    grimoire: { collected: overworldData.grimoire.collected },
    villager: {
      helped: overworldData.villager.helped,
      talked: overworldData.villager.talked,
      questComplete: overworldData.villager.questComplete,
    },
    dungeon: {
      entered: game.dungeon.entered,
      completed: game.dungeon.completed,
      floorIndex: game.dungeon.floorIndex,
    },
    crypt: {
      entered: game.crypt.entered,
      completed: game.crypt.completed,
      floorIndex: game.crypt.floorIndex,
    },
    level1Started: game.level1.started,
    himmel: {
      talked: levelOneData.himmel.talked,
      questAccepted: levelOneData.himmel.questAccepted,
    },
    elder: {
      talked: levelOneData.elder.talked,
      questAccepted: levelOneData.elder.questAccepted,
      passCleared: levelOneData.elder.passCleared,
      rewardClaimed: levelOneData.elder.rewardClaimed,
    },
    grimoireFound: cabinInteriorData.grimoireFound,
    forestDungeonCleared: forestDungeonData.cleared,
    respawn: { mode: game.respawn.mode, x: game.respawn.x, y: game.respawn.y },
    kingGreeted: castleInteriorData.king.greeted,
    mapKnown: {
      cities: mapData.cities.map((c) => c.known),
      wagons: mapData.wagons.map((w) => w.discovered),
      dungeons: mapData.dungeons.map((d) => d.discovered),
      levelOneWagons: levelOneData.wagons.map((wagon) => wagon.discovered),
    },
  };
}

// Merges saved spell data onto the current defaults, key by key, so a save
// made before a spell (e.g. sturmklinge, blackhole) existed doesn't end up
// missing it entirely — which would crash the update loop on the next frame.
function mergeSpells(defaults, saved) {
  const merged = {};
  for (const key of Object.keys(defaults)) {
    merged[key] = Object.assign({}, defaults[key], (saved && saved[key]) || {});
  }
  return merged;
}

function applySave(data) {
  const p = game.player;
  const defaultSpells = p.spells;
  Object.assign(p, data.player);
  p.spells = mergeSpells(defaultSpells, data.player.spells);
  p.vx = 0; p.vy = 0; p.dx = 0; p.dy = 0;
  game.mode = data.mode;
  game.won = data.won;
  overworldData.bramble.hp = data.bramble.hp;
  overworldData.bramble.cleared = data.bramble.cleared;
  overworldData.grimoire.collected = data.grimoire.collected;
  overworldData.villager.helped = data.villager.helped;
  overworldData.villager.talked = data.villager.talked;
  overworldData.villager.questComplete = data.villager.questComplete;
  game.dungeon.entered = data.dungeon.entered;
  game.dungeon.completed = data.dungeon.completed;
  game.crypt.entered = Boolean(data.crypt && data.crypt.entered);
  game.crypt.completed = Boolean(data.crypt && data.crypt.completed);
  game.level1.started = Boolean(data.level1Started);
  levelOneData.himmel.talked = Boolean(data.himmel && data.himmel.talked);
  levelOneData.himmel.questAccepted = Boolean(data.himmel && data.himmel.questAccepted);
  levelOneData.elder.talked = Boolean(data.elder && data.elder.talked);
  levelOneData.elder.questAccepted = Boolean(data.elder && data.elder.questAccepted);
  levelOneData.elder.passCleared = Boolean(data.elder && data.elder.passCleared);
  levelOneData.elder.rewardClaimed = Boolean(data.elder && data.elder.rewardClaimed);
  cabinInteriorData.grimoireFound = Boolean(data.grimoireFound);
  if (data.respawn) {
    game.respawn = { mode: data.respawn.mode, x: data.respawn.x, y: data.respawn.y };
  }
  castleInteriorData.king.greeted = Boolean(data.kingGreeted);
  mapData.cities.forEach((c, i) => { c.known = data.mapKnown.cities[i]; });
  mapData.wagons.forEach((w, i) => { w.discovered = data.mapKnown.wagons[i]; });
  mapData.dungeons.forEach((d, i) => { d.discovered = data.mapKnown.dungeons[i]; });
  levelOneData.wagons.forEach((wagon, index) => {
    const saved = data.mapKnown.levelOneWagons?.[index];
    wagon.discovered = saved ?? (wagon.id === "l1-clearing" && game.level1.started);
  });
  forestDungeonData.cleared = Boolean(data.forestDungeonCleared);
  resetOverworldEnemies();
  resetDungeonEnemies();
  resetCryptEnemies();
  resetLevelOneEnemies();
  resetForestDungeonEnemies();
  game.overworld.shadeDefeated = data.shadeDefeated;
  if (data.dungeon.floorIndex) activateDungeonFloor(data.dungeon.floorIndex);
  if (data.crypt && data.crypt.floorIndex) activateCryptFloor(data.crypt.floorIndex);
}

function saveCurrentGame() {
  if (game.save.slotIndex === null) return;
  savedSlots[game.save.slotIndex] = serializeGame();
  writeSlots(savedSlots);
}

let savedSlots = loadSlots();

const menuRoot = document.querySelector("#start-menu");
const menuSlotsPanel = document.querySelector("#menu-slots");
const menuCharPanel = document.querySelector("#menu-characters");
const slotListEl = document.querySelector("#slot-list");
const characterListEl = document.querySelector("#character-list");
const menuButton = document.querySelector("#menu-button");
const characterBackBtn = document.querySelector("#character-back");

function renderSlotList() {
  slotListEl.innerHTML = "";
  savedSlots.forEach((slot, i) => {
    const card = document.createElement("div");
    card.className = "slot-card";
    if (slot) {
      const charDef = CHARACTERS[slot.character];
      const info = document.createElement("div");
      info.innerHTML = `<strong>Slot ${i + 1}: ${charDef ? charDef.name : slot.character}</strong><span>Gold ${slot.player.gold} · Relics ${slot.player.relics} · Saved ${new Date(slot.savedAt).toLocaleString()}</span>`;
      const del = document.createElement("button");
      del.className = "slot-delete";
      del.textContent = "Delete";
      del.addEventListener("click", (event) => {
        event.stopPropagation();
        savedSlots[i] = null;
        writeSlots(savedSlots);
        renderSlotList();
      });
      card.appendChild(info);
      card.appendChild(del);
      card.addEventListener("click", () => continueGame(i));
    } else {
      const info = document.createElement("div");
      info.innerHTML = `<strong>Slot ${i + 1}: Empty</strong><span>Start a new journey</span>`;
      card.appendChild(info);
      card.addEventListener("click", () => openCharacterSelect(i));
    }
    slotListEl.appendChild(card);
  });
}

function openCharacterSelect(slotIndex) {
  characterListEl.innerHTML = "";
  Object.entries(CHARACTERS).forEach(([id, def]) => {
    const card = document.createElement("div");
    card.className = "character-card";
    const info = document.createElement("div");
    info.innerHTML = `<strong>${def.name} — ${def.title}</strong><span>${def.blurb}</span>`;
    card.appendChild(info);
    card.addEventListener("click", () => startNewGame(slotIndex, id));
    characterListEl.appendChild(card);
  });
  menuSlotsPanel.hidden = true;
  menuCharPanel.hidden = false;
}

characterBackBtn.addEventListener("click", () => {
  menuCharPanel.hidden = true;
  menuSlotsPanel.hidden = false;
});

function resetWorldStateForNewGame() {
  overworldData.bramble.hp = overworldData.bramble.maxHp;
  overworldData.bramble.cleared = false;
  overworldData.grimoire.collected = false;
  overworldData.villager.helped = false;
  overworldData.villager.talked = false;
  overworldData.villager.questComplete = false;
  game.overworld.shadeDefeated = false;
  game.dungeon.entered = false;
  game.dungeon.completed = false;
  game.crypt.entered = false;
  game.crypt.completed = false;
  game.level1.started = false;
  levelOneData.himmel.talked = false;
  levelOneData.himmel.questAccepted = false;
  levelOneData.elder.talked = false;
  levelOneData.elder.questAccepted = false;
  levelOneData.elder.passCleared = false;
  levelOneData.elder.rewardClaimed = false;
  game.level1.bossIntroShown = false;
  forestDungeonData.cleared = false;
  forestDungeonData.bossIntroShown = false;
  forestDungeonData.openedChests = new Set();
  cabinInteriorData.grimoireFound = false;
  game.respawn = { mode: "overworld", x: overworldData.camp.x + 40, y: overworldData.camp.y };
  castleInteriorData.king.greeted = false;
  mapData.cities.forEach((c) => { c.known = c.id === "heiterfeld"; });
  mapData.wagons.forEach((w) => { w.discovered = w.id === "heiterfeld"; });
  mapData.dungeons.forEach((d) => { d.discovered = false; });
  levelOneData.wagons.forEach((wagon) => {
    wagon.discovered = false;
  });
}

function startNewGame(slotIndex, characterId) {
  game.save.slotIndex = slotIndex;
  const p = game.player;
  p.character = characterId;
  p.gold = 0;
  p.relics = 0;
  p.x = 245;
  p.y = 1090;
  p.vx = 0; p.vy = 0;
  game.mode = "overworld";
  game.won = false;
  CHARACTERS[characterId].apply(p);
  resetWorldStateForNewGame();
  resetOverworldEnemies();
  resetDungeonEnemies();
  resetCryptEnemies();
  resetLevelOneEnemies();
  resetForestDungeonEnemies();
  saveCurrentGame();
  closeMenu();
  showToast(`Playing as ${CHARACTERS[characterId].name}. ${characterId === "stark" ? "Press J to swing Cleaving Light." : "Press J to cast."}`);
}

function continueGame(slotIndex) {
  const slot = savedSlots[slotIndex];
  if (!slot) return;
  game.save.slotIndex = slotIndex;
  applySave(slot);
  closeMenu();
  const charDef = CHARACTERS[slot.character];
  showToast(`Welcome back, ${charDef ? charDef.name : slot.character}.`);
}

function openMenu() {
  savedSlots = loadSlots();
  game.paused = true;
  game.map.open = false;
  menuCharPanel.hidden = true;
  menuSlotsPanel.hidden = false;
  renderSlotList();
  menuRoot.hidden = false;
}

function closeMenu() {
  menuRoot.hidden = true;
  game.paused = false;
  if (!gameLoopStarted) {
    gameLoopStarted = true;
    requestAnimationFrame(loop);
  }
}

menuButton.addEventListener("click", () => {
  saveCurrentGame();
  openMenu();
});

renderSlotList();
