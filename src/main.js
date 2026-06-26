const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const hud = {
  hp: document.querySelector("#hp-bar"),
  stamina: document.querySelector("#stamina-bar"),
  mana: document.querySelector("#mana-bar"),
  status: document.querySelector("#status-line"),
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
const TAU = Math.PI * 2;
const input = { down: new Set(), tap: new Set() };
const playerSprite = new Image();
playerSprite.src = "assets/sprites/frieren-sprite-sheet-packed.png";
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

const overworldData = {
  width: 2300,
  height: 1650,
  camp: { x: 355, y: 1160, r: 80 },
  portal: { x: 1845, y: 765, r: 74 },
  villager: {
    name: "Heine",
    x: 525,
    y: 910,
    helped: false,
    talked: false,
    questComplete: false,
  },
  bramble: { x: 705, y: 905, r: 44, hp: 36, maxHp: 36, cleared: false },
  grimoire: {
    id: "zoltraak-formel-i",
    name: "Kleines Zauberbuch: Zoltraak Formel I",
    x: 602,
    y: 895,
    r: 24,
    collected: false,
    kind: "spellBoost",
    spell: "zoltraak",
    rangeBoost: 150,
    powerBoost: 12,
    manaBoost: 12,
  },
  rocks: [
    { x: 610, y: 380, r: 62 },
    { x: 730, y: 435, r: 48 },
    { x: 1410, y: 315, r: 92 },
    { x: 1570, y: 1160, r: 84 },
    { x: 1980, y: 1150, r: 74 },
    { x: 995, y: 935, r: 60 },
  ],
  trees: [
    { x: 250, y: 240 }, { x: 430, y: 260 }, { x: 565, y: 210 },
    { x: 820, y: 1280 }, { x: 900, y: 1390 }, { x: 1115, y: 1320 },
    { x: 2040, y: 410 }, { x: 2115, y: 540 }, { x: 2125, y: 980 },
    { x: 1750, y: 1370 }, { x: 1880, y: 1450 }, { x: 335, y: 1390 },
  ],
  flowers: [
    { x: 420, y: 1010, c: "#e9c46a" }, { x: 455, y: 1038, c: "#f2a7b5" },
    { x: 492, y: 1018, c: "#b4e7ee" }, { x: 575, y: 988, c: "#e9c46a" },
    { x: 630, y: 1005, c: "#f2a7b5" }, { x: 760, y: 955, c: "#b4e7ee" },
    { x: 300, y: 1125, c: "#f2a7b5" }, { x: 390, y: 1248, c: "#e9c46a" },
    { x: 1220, y: 1010, c: "#f2a7b5" }, { x: 1295, y: 960, c: "#e9c46a" },
    { x: 1715, y: 690, c: "#b4e7ee" }, { x: 1930, y: 900, c: "#f2a7b5" },
  ],
  herbs: [
    { x: 462, y: 840 }, { x: 498, y: 842 }, { x: 534, y: 842 },
    { x: 462, y: 875 }, { x: 498, y: 877 }, { x: 534, y: 875 },
  ],
};

const dungeonData = {
  height: 720,
  floors: [
    {
      name: "Hohlgrund I: Moss Gallery",
      width: 2960,
      start: { x: 112, y: 510 },
      descent: { x: 2825, y: 512, w: 64, h: 118, label: "E: Descend" },
      platforms: [
        { x: 0, y: 642, w: 520, h: 78 },
        { x: 575, y: 594, w: 420, h: 42 },
        { x: 1035, y: 524, w: 350, h: 38 },
        { x: 1460, y: 594, w: 450, h: 42 },
        { x: 2020, y: 642, w: 940, h: 78 },
        { x: 380, y: 456, w: 150, h: 24 },
        { x: 755, y: 412, w: 155, h: 24 },
        { x: 1200, y: 372, w: 190, h: 24 },
        { x: 1655, y: 452, w: 190, h: 24 },
        { x: 2140, y: 488, w: 165, h: 24 },
      ],
      spikes: [
        { x: 520, y: 632, w: 80, h: 28 },
        { x: 980, y: 626, w: 90, h: 28 },
        { x: 1375, y: 626, w: 80, h: 28 },
        { x: 1920, y: 632, w: 92, h: 28 },
      ],
      secrets: [
        { id: "moss-left", x: 510, y: 455, w: 32, h: 142, hint: "Hairline crack" },
      ],
      chests: [
        { id: "moss-flugmagie", x: 430, y: 414, w: 38, h: 34, loot: "flugmagie", secretId: "moss-left" },
        { id: "moss-visible", x: 2210, y: 450, w: 38, h: 34, loot: "heal" },
      ],
      enemies: [
        ["crawler", 700, 594, 30, 42, 70],
        ["crawler", 1510, 594, 30, 50, 70],
        ["bat", 1120, 390, 28, 34, 84],
      ],
    },
    {
      name: "Hohlgrund II: Echo Cistern",
      width: 3180,
      start: { x: 96, y: 510 },
      descent: { x: 3020, y: 405, w: 64, h: 118, label: "E: Descend" },
      platforms: [
        { x: 0, y: 642, w: 470, h: 78 },
        { x: 520, y: 574, w: 380, h: 42 },
        { x: 950, y: 642, w: 360, h: 78 },
        { x: 1345, y: 555, w: 420, h: 42 },
        { x: 1810, y: 604, w: 470, h: 42 },
        { x: 2380, y: 548, w: 800, h: 42 },
        { x: 440, y: 430, w: 175, h: 24 },
        { x: 825, y: 390, w: 205, h: 24 },
        { x: 1190, y: 330, w: 185, h: 24 },
        { x: 1490, y: 410, w: 150, h: 24 },
        { x: 1710, y: 430, w: 185, h: 24 },
        { x: 2190, y: 452, w: 220, h: 24 },
      ],
      spikes: [
        { x: 470, y: 632, w: 86, h: 28 },
        { x: 1290, y: 632, w: 92, h: 28 },
        { x: 1760, y: 626, w: 72, h: 28 },
        { x: 2256, y: 632, w: 116, h: 28 },
      ],
      secrets: [
        { id: "cistern-high", x: 1038, y: 276, w: 34, h: 112, hint: "Damp false wall" },
        { id: "cistern-low", x: 2318, y: 548, w: 34, h: 96, hint: "Loose stone" },
      ],
      chests: [
        { id: "cistern-grimoire", x: 1160, y: 244, w: 38, h: 34, loot: "range", secretId: "cistern-high" },
        { id: "cistern-cache", x: 2495, y: 506, w: 38, h: 34, loot: "power", secretId: "cistern-low" },
      ],
      enemies: [
        ["bat", 730, 460, 28, 42, 84],
        ["bat", 1580, 450, 28, 48, 84],
        ["crawler", 2025, 604, 32, 68, 90],
        ["shade", 2625, 520, 52, 105, 128],
      ],
    },
    {
      name: "Hohlgrund III: Sunless Reliquary",
      width: 3420,
      start: { x: 110, y: 510 },
      exit: { x: 3305, y: 424, w: 58, h: 112 },
      finalMimic: { x: 3188, y: 598, w: 50, h: 40 },
      platforms: [
        { x: 0, y: 642, w: 420, h: 78 },
        { x: 500, y: 590, w: 360, h: 42 },
        { x: 910, y: 540, w: 390, h: 42 },
        { x: 1370, y: 606, w: 400, h: 42 },
        { x: 1810, y: 548, w: 450, h: 42 },
        { x: 2360, y: 642, w: 1060, h: 78 },
        { x: 330, y: 450, w: 170, h: 24 },
        { x: 700, y: 390, w: 190, h: 24 },
        { x: 1080, y: 344, w: 160, h: 24 },
        { x: 1265, y: 334, w: 200, h: 24 },
        { x: 1655, y: 430, w: 200, h: 24 },
        { x: 2100, y: 394, w: 210, h: 24 },
      ],
      spikes: [
        { x: 425, y: 632, w: 90, h: 28 },
        { x: 1288, y: 632, w: 96, h: 28 },
        { x: 1760, y: 632, w: 82, h: 28 },
        { x: 2248, y: 632, w: 110, h: 28 },
      ],
      secrets: [
        { id: "reliquary-roof", x: 898, y: 330, w: 34, h: 78, hint: "Moon-scratched wall" },
        { id: "reliquary-under", x: 2298, y: 548, w: 34, h: 96, hint: "Cold draft" },
      ],
      chests: [
        { id: "reliquary-formula", x: 1015, y: 478, w: 38, h: 34, loot: "formula", secretId: "reliquary-roof" },
        { id: "reliquary-cache", x: 2460, y: 598, w: 38, h: 34, loot: "mana", secretId: "reliquary-under" },
      ],
      enemies: [
        ["bat", 640, 430, 30, 52, 96],
        ["shade", 1180, 470, 54, 120, 128],
        ["crawler", 2020, 548, 34, 82, 90],
        ["knight", 2880, 642, 62, 260, 180],
      ],
    },
  ],
};

const game = {
  mode: "overworld",
  time: 0,
  shake: 0,
  toastTimer: 0,
  won: false,
  camera: { x: 0, y: 0 },
  player: {
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
    dodgeTime: 0,
    hurtCd: 0,
    onGround: false,
    coyote: 0,
    flightTime: 0,
    fallStartY: 0,
    lastLandingVy: 0,
    relics: 0,
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
};

function resetOverworldEnemies() {
  game.overworld.enemies = [
    enemy("wisp", 785, 690, 34, 34, 74),
    enemy("wisp", 1080, 1090, 34, 34, 74),
    enemy("soldier", 1360, 780, 44, 58, 92),
    enemy("shade", 1810, 760, 70, 175, 128),
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

function enemy(type, x, y, r, hp, xp) {
  return {
    type, x, y, r, hp, maxHp: hp, xp, vx: 0, vy: 0, facing: -1,
    hurt: 0, attackCd: 0, rangedCd: type === "shade" ? 1.2 : 0, dead: false, patrol: x, onGround: false,
  };
}

resetOverworldEnemies();
resetDungeonEnemies();

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

function dist(a, b, c, d) {
  return Math.hypot(a - c, b - d);
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
    showToast("You collapsed. Resting at the campfire...");
    p.hp = p.maxHp;
    p.stamina = p.maxStamina;
    p.mana = p.maxMana;
    switchToOverworld(true);
  }
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

function updateMotes(motes, dt) {
  for (const mote of motes) {
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;
    mote.vx *= 0.96;
    mote.vy *= 0.96;
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

function castZoltraak(space) {
  const p = game.player;
  const spell = p.spells.zoltraak;
  if (!spell.known || spell.cooldown > 0) return;
  if (p.mana < spell.cost) {
    showToast("Not enough mana for Zoltraak.");
    return;
  }

  p.mana -= spell.cost;
  spell.cooldown = 0.34;
  p.attackTime = 0.18;
  const sideView = space === "dungeon";
  const dirX = sideView ? Math.sign(p.facingX || 1) : p.facingX || 1;
  const dirY = sideView ? 0 : p.facingY || 0;
  const mag = Math.hypot(dirX, dirY) || 1;
  const bucket = sideView ? game.dungeon.projectiles : game.overworld.projectiles;

  bucket.push({
    spell: "zoltraak",
    x: p.x + (dirX / mag) * 26,
    y: sideView ? p.y - 35 : p.y + (dirY / mag) * 26,
    vx: (dirX / mag) * spell.speed,
    vy: (dirY / mag) * spell.speed,
    traveled: 0,
    range: spell.range,
    damage: spell.power,
    r: 9,
    life: 0.75,
  });
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
        showToast("Heine's herb path is clear. A grimoire appears.");
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
  addMote(bucket, foe.x, foe.y, foe.type === "shade" || foe.type === "knight" ? "#dac4ff" : "#b4e7ee", 10);
  game.shake = Math.max(game.shake, 0.08);
  if (foe.hp > 0) return;

  foe.dead = true;
  if (foe.type === "shade") {
    game.overworld.shadeDefeated = true;
    showToast("Der Mondbrunnen-Schatten breaks. The Hohlgrund gate opens.");
  }
  if (foe.type === "knight") {
    game.dungeon.completed = true;
    game.player.relics = 1;
    game.player.spells.mikheit.known = true;
    showSpellLearned(
      "Mikheit",
      "Reads the magical density of a sealed container, 99% accurate against mimics. The other 1% of the time, it is hiding the kind of grimoire worth the risk.",
    );
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

const mimicExcuses = [
  "Just a little longer. A grimoire left unread haunts me worse than any monster could.",
  "I once let a spellbook rot at the bottom of a ravine. I am not making that mistake again.",
  "The odds have to be in my favor by now. That is how probability works. Probably.",
];

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
  if (count < mimicExcuses.length) {
    showCutscene(
      "Frieren",
      [mimicExcuses[count]],
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
  game.time += dt;
  game.shake = Math.max(0, game.shake - dt);
  game.toastTimer = Math.max(0, game.toastTimer - dt);
  if (game.toastTimer <= 0) hud.toast.classList.remove("show");

  const p = game.player;
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.attackTime = Math.max(0, p.attackTime - dt);
  p.dodgeTime = Math.max(0, p.dodgeTime - dt);
  p.hurtCd = Math.max(0, p.hurtCd - dt);
  p.flightTime = Math.max(0, p.flightTime - dt);
  p.spells.zoltraak.cooldown = Math.max(0, p.spells.zoltraak.cooldown - dt);
  p.stamina = clamp(p.stamina + 23 * dt, 0, p.maxStamina);
  p.mana = clamp(p.mana + 8 * dt, 0, p.maxMana);

  if (handleSpellPopupInput()) return;
  if (handleDialogueInput()) return;

  if (game.mode === "overworld") updateOverworld(dt);
  if (game.mode === "dungeon") updateDungeon(dt);

  updateHud();
  input.tap.clear();
}

function updateOverworld(dt) {
  const p = game.player;
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

  if (tapped("j") && p.attackCd <= 0) {
    p.attackCd = 0.22;
    castZoltraak("overworld");
  }

  if (tapped("r") && dist(p.x, p.y, overworldData.camp.x, overworldData.camp.y) < 110) {
    p.hp = p.maxHp;
    p.stamina = p.maxStamina;
    p.mana = p.maxMana;
    showToast("Rested at camp. Overworld enemies return.");
    resetOverworldEnemies();
    game.overworld.shadeDefeated = false;
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

  updateOverworldEnemies(dt);
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
    const awake = foe.type === "shade" ? 650 : 420;
    if (gap < awake) {
      const nx = (p.x - foe.x) / (gap || 1);
      const ny = (p.y - foe.y) / (gap || 1);
      if (foe.type === "shade" && gap > foe.r + 70) {
        if (foe.rangedCd <= 0) {
          foe.rangedCd = 1.6;
          fireShadeBolt(foe, nx, ny, game.overworld.enemyProjectiles);
        }
      } else {
        const speed = foe.type === "soldier" ? 82 : foe.type === "shade" ? 72 : 105;
        foe.x += nx * speed * dt + foe.vx * dt;
        foe.y += ny * speed * dt + foe.vy * dt;
      }
      foe.facing = Math.sign(nx || foe.facing);
      if (gap < foe.r + 24 && foe.attackCd <= 0) {
        foe.attackCd = foe.type === "shade" ? 1.05 : 0.8;
        hurtPlayer(foe.type === "shade" ? 16 : 9, nx * 150, ny * 150);
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

function switchToOverworld(fromDeath = false) {
  game.mode = "overworld";
  const p = game.player;
  p.x = fromDeath ? overworldData.camp.x + 40 : overworldData.portal.x - 92;
  p.y = fromDeath ? overworldData.camp.y : overworldData.portal.y + 48;
  p.vx = 0;
  p.vy = 0;
  p.facingX = -1;
  p.facingY = 0;
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
    castZoltraak("dungeon");
  }

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

function updateHud() {
  const p = game.player;
  hud.hp.style.width = `${(p.hp / p.maxHp) * 100}%`;
  hud.stamina.style.width = `${(p.stamina / p.maxStamina) * 100}%`;
  hud.mana.style.width = `${(p.mana / p.maxMana) * 100}%`;
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
  } else {
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
  if (game.mode === "dungeon") drawDungeon();
  ctx.restore();
}

function drawOverworld() {
  const p = game.player;
  game.camera.x = clamp(p.x - VIEW_W / 2, 0, overworldData.width - VIEW_W);
  game.camera.y = clamp(p.y - VIEW_H / 2, 0, overworldData.height - VIEW_H);
  const cam = game.camera;

  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  const grd = ctx.createLinearGradient(0, 0, overworldData.width, overworldData.height);
  grd.addColorStop(0, "#344b38");
  grd.addColorStop(0.45, "#5a6241");
  grd.addColorStop(1, "#263b36");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, overworldData.width, overworldData.height);

  drawWorldTexture();
  drawRoad();
  drawGroundDetails();
  drawPond();
  for (const tree of overworldData.trees) drawTree(tree.x, tree.y);
  for (const rock of overworldData.rocks) drawRock(rock);
  drawCamp(overworldData.camp.x, overworldData.camp.y);
  drawMoonwell();
  drawVillageSpellQuest();

  for (const foe of game.overworld.enemies) drawEnemy(foe, "overworld");
  drawProjectiles(game.overworld.projectiles);
  drawProjectiles(game.overworld.enemyProjectiles);
  drawMotes(game.overworld.motes);
  drawPlayerTopDown(p);
  drawOverworldPrompts();
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
  ctx.strokeStyle = "rgba(193, 177, 128, 0.48)";
  ctx.lineWidth = 88;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(220, 1135);
  ctx.bezierCurveTo(570, 1005, 730, 790, 1040, 840);
  ctx.bezierCurveTo(1400, 900, 1455, 720, 1840, 765);
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
  pixelRect(x - 9, y + 18, 18, 44, "#322817");
  pixelRect(x - 5, y + 14, 8, 20, "#523b24");
  pixelRect(x - 42, y - 38, 84, 58, "#12392e");
  pixelRect(x - 34, y - 58, 68, 44, "#184535");
  pixelRect(x - 28, y + 8, 56, 28, "#0f3028");
  pixelRect(x - 22, y - 35, 22, 28, "rgba(214,224,177,0.12)");
  pixelRect(x + 18, y - 28, 10, 10, "#1f5b42");
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
}

function drawProjectiles(projectiles) {
  for (const shot of projectiles) {
    const shade = shot.spell === "shadeBolt";
    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(Math.atan2(shot.vy, shot.vx));
    pixelRect(-24, -12, 40, 24, shade ? "rgba(150,91,205,0.24)" : "rgba(91,170,205,0.24)");
    pixelRect(-18, -6, 42, 12, shade ? "#8a5ac8" : "#5aa5c8");
    pixelRect(-8, -10, 24, 20, shade ? "#dac4ff" : "#b4e7ee");
    pixelRect(12, -4, 18, 8, "#f4ecff");
    pixelRect(28, -2, 8, 4, "#f4ecff");
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

function drawSecretWall(secret) {
  const revealed = game.dungeon.revealedSecrets.has(secret.id);
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

function drawDungeonChest(chest) {
  const open = game.dungeon.openedChests.has(chest.id);
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
  drawPlayerSprite(p, 0.24);
}

function drawPlayerSide(p) {
  drawPlayerSprite(p, 0.28);
}

function drawPlayerSprite(p, scale) {
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
  ctx.restore();
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

  if (foe.type === "wisp") {
    drawPixelWisp(foe);
  } else if (foe.type === "shade") {
    drawPixelShade(foe);
  } else if (foe.type === "bat") {
    drawPixelBat(foe);
  } else {
    ctx.scale(foe.facing >= 0 ? 1 : -1, 1);
    if (foe.type === "knight") {
      drawPixelKnight(foe);
    } else {
      drawPixelCrawler(foe);
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

function drawEnemyHealth(foe, space) {
  const y = space === "dungeon" ? -foe.r - 24 : -foe.r - 18;
  const width = foe.type === "knight" || foe.type === "shade" ? 74 : 44;
  ctx.fillStyle = "rgba(0,0,0,0.46)";
  ctx.fillRect(-width / 2, y, width, 6);
  ctx.fillStyle = "#ef7163";
  ctx.fillRect(-width / 2, y, width * clamp(foe.hp / foe.maxHp, 0, 1), 6);
}

function drawMotes(motes) {
  for (const mote of motes) {
    ctx.globalAlpha = clamp(mote.life / mote.maxLife, 0, 1);
    pixelRect(mote.x - 3, mote.y - 3, 6, 6, mote.color);
    ctx.globalAlpha = 1;
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

showToast("Zoltraak learned. Find grimoires to deepen the spell.");
requestAnimationFrame(loop);
