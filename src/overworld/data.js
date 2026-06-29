import { dist, TAU } from "../core/math.js";

export const overworldData = {
  width: 5300,
  height: 2400,
  camp: { x: 355, y: 1160, r: 80 },
  portal: { x: 1845, y: 765, r: 74 },
  castleTown: {
    name: "Königsburg",
    gateX: 4100,
    gateY: 1300,
    keepDoorX: 4950,
    keepDoorY: 1300,
    cryptEntranceX: 4390,
    cryptEntranceY: 1620,
    x: 4650,
    y: 1300,
    w: 1100,
    h: 900,
    npcs: [
      {
        id: "guard-captain",
        name: "Wachhauptmann Berthold",
        x: 4185,
        y: 1230,
        lines: [
          "Halt. ...Ah, a traveler with a grimoire-bound look about her. Pass, then.",
          "Königsburg has stood since before the last demon lord fell. The walls remember more than the duke does.",
        ],
      },
      {
        id: "market-vendor",
        name: "Marktfrau Greta",
        x: 4360,
        y: 1150,
        lines: [
          "Fresh bread, mended boots, the occasional cursed trinket. No refunds on the last one.",
          "If you're heading back out on the road, take a waterskin. The wagons don't wait for thirsty heroes.",
        ],
      },
    ],
  },
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
    { x: 2480, y: 420, r: 88 },
    { x: 2650, y: 700, r: 64 },
    { x: 2900, y: 1500, r: 96 },
    { x: 2380, y: 1880, r: 70 },
    { x: 1620, y: 1980, r: 58 },
    { x: 3100, y: 980, r: 80 },
    { x: 540, y: 1850, r: 66 },
    { x: 1150, y: 2150, r: 74 },
    { x: 3550, y: 1620, r: 70 },
    { x: 3680, y: 920, r: 84 },
    { x: 4550, y: 760, r: 76 },
    { x: 4600, y: 1900, r: 88 },
  ],
  trees: [
    { x: 250, y: 240 }, { x: 430, y: 260 }, { x: 565, y: 210 },
    { x: 820, y: 1280 }, { x: 900, y: 1390 }, { x: 1115, y: 1320 },
    { x: 2040, y: 410 }, { x: 2115, y: 540 }, { x: 2125, y: 980 },
    { x: 1750, y: 1370 }, { x: 1880, y: 1450 }, { x: 335, y: 1390 },
    { x: 2500, y: 260 }, { x: 2640, y: 330 }, { x: 2780, y: 220 },
    { x: 2950, y: 1180 }, { x: 3080, y: 1320 }, { x: 3220, y: 1240 },
    { x: 2200, y: 1700 }, { x: 2330, y: 1850 }, { x: 2050, y: 2000 },
    { x: 1450, y: 2200 }, { x: 1280, y: 2300 }, { x: 760, y: 2150 },
    { x: 480, y: 2000 }, { x: 320, y: 1850 }, { x: 3000, y: 600 },
    { x: 3450, y: 700 }, { x: 3550, y: 550 }, { x: 3500, y: 1850 },
    { x: 3620, y: 1980 }, { x: 4150, y: 700 }, { x: 4350, y: 600 },
    { x: 4200, y: 1980 }, { x: 4400, y: 2050 }, { x: 4900, y: 2080 },
    { x: 5050, y: 700 }, { x: 5150, y: 1980 },
  ],
  flowers: [
    { x: 420, y: 1010, c: "#e9c46a" }, { x: 455, y: 1038, c: "#f2a7b5" },
    { x: 492, y: 1018, c: "#b4e7ee" }, { x: 575, y: 988, c: "#e9c46a" },
    { x: 630, y: 1005, c: "#f2a7b5" }, { x: 760, y: 955, c: "#b4e7ee" },
    { x: 300, y: 1125, c: "#f2a7b5" }, { x: 390, y: 1248, c: "#e9c46a" },
    { x: 1220, y: 1010, c: "#f2a7b5" }, { x: 1295, y: 960, c: "#e9c46a" },
    { x: 1715, y: 690, c: "#b4e7ee" }, { x: 1930, y: 900, c: "#f2a7b5" },
    { x: 2600, y: 850, c: "#e9c46a" }, { x: 2700, y: 920, c: "#f2a7b5" },
    { x: 2150, y: 1600, c: "#b4e7ee" }, { x: 2250, y: 1680, c: "#e9c46a" },
    { x: 1500, y: 1850, c: "#f2a7b5" }, { x: 900, y: 2050, c: "#b4e7ee" },
    { x: 3780, y: 1180, c: "#e9c46a" }, { x: 3820, y: 1420, c: "#f2a7b5" },
  ],
  herbs: [
    { x: 462, y: 840 }, { x: 498, y: 842 }, { x: 534, y: 842 },
    { x: 462, y: 875 }, { x: 498, y: 877 }, { x: 534, y: 875 },
  ],
};

export const mapData = {
  cities: [
    { id: "heiterfeld", name: "Heiterfeld", x: 460, y: 950, known: true },
    { id: "ostwacht", name: "Ostwacht Outpost", x: 2950, y: 1550, known: false, discoverRadius: 260 },
    { id: "konigsburg", name: "Königsburg", x: 4650, y: 1300, known: false, discoverRadius: 480 },
  ],
  dungeons: [
    { id: "hohlgrund", name: "Hohlgrund", x: 1845, y: 765, discovered: false },
    { id: "konigsgrab", name: "Königsgrab", x: 4390, y: 1620, discovered: false },
  ],
  wagons: [
    { id: "heiterfeld", name: "Heiterfeld Station", x: 355, y: 1160, discovered: true },
    { id: "ostwacht", name: "Ostwacht Station", x: 2950, y: 1550, discovered: false, discoverRadius: 260 },
    { id: "konigsburg", name: "Königsburg Station", x: 3880, y: 1380, discovered: false, discoverRadius: 480 },
  ],
};

// Castle interior: a peaceful dungeon-styled hall (stone corridors, torches,
// vaulted rooms) but with no hostile enemies — nobles and guards live here.
// Walkable "zones" are stitched together below into solid wall rectangles
// that frame each room/corridor and leave only the connecting doorways open.
export const castleInteriorData = {
  width: 2300,
  height: 900,
  zones: [
    { name: "entry", x: 0, y: 160, w: 520, h: 580 },
    { name: "corridor1", x: 520, y: 380, w: 140, h: 140 },
    { name: "guardRoom", x: 660, y: 120, w: 520, h: 660 },
    { name: "corridor2", x: 1180, y: 380, w: 140, h: 140 },
    { name: "greatHall", x: 1320, y: 80, w: 980, h: 740 },
  ],
  entry: { x: 150, y: 450 },
  exit: { x: 40, y: 380, w: 70, h: 140 },
  torches: [
    { x: 300, y: 200 }, { x: 300, y: 700 },
    { x: 720, y: 180 }, { x: 720, y: 720 },
    { x: 1120, y: 180 }, { x: 1120, y: 720 },
    { x: 1420, y: 140 }, { x: 1420, y: 760 },
    { x: 2150, y: 140 }, { x: 2150, y: 760 },
  ],
  pillars: [
    { x: 760, y: 250, r: 30 }, { x: 760, y: 650, r: 30 },
    { x: 1080, y: 250, r: 30 }, { x: 1080, y: 650, r: 30 },
    { x: 1500, y: 220, r: 30 }, { x: 1500, y: 680, r: 30 },
    { x: 1800, y: 220, r: 30 }, { x: 1800, y: 680, r: 30 },
  ],
  guards: [
    { x: 820, y: 400 },
    { x: 1020, y: 400 },
  ],
  king: {
    name: "Herzog Heinrich von Königsburg",
    x: 2150,
    y: 450,
    greeted: false,
    linesFirst: [
      "So. The elf-mage from Heiterfeld's road finally finds her way to my hall.",
      "Heine speaks well of you, when his letters bother to mention anything at all.",
      "Hohlgrund has plagued the trade road for longer than I have worn this seat. Keep clearing it, and the seat remembers its debts.",
    ],
    linesRepeat: [
      "Still adventuring? Good. The throne is a dull post for those who'd rather be useful.",
      "The road to Heiterfeld should be safer with you on it. Don't make a liar of me.",
    ],
    questOffer: [
      "You've returned the grimoire to Heine, and the road home held. Good. But that was the rehearsal, elf-mage.",
      "There is a true task waiting beyond Königsburg's walls — older, and worse, than a bramble patch and a sealed cave.",
      "I will not order you. But if you accept, your journey starts in truth, and there is no rehearsing what comes after.",
    ],
    questDeclineLines: [
      "Wise enough not to leap. Come back when you've slept on it.",
    ],
    questAcceptLines: [
      "So be it. Walk through that door, and do not look back until it's done.",
    ],
    questAcceptedRepeat: [
      "You're still here? The road won't walk itself, elf-mage.",
      "Whatever you find out there, Königsburg will still be standing when you're done.",
    ],
  },
};

// Generic helper: turns a room's "zones" (walkable rectangles) into solid
// wall rectangles filling everything above/below each zone, leaving only the
// zones themselves walkable. Used by any top-down multi-room interior.
export function zoneWalls(room) {
  const walls = [];
  for (const zone of room.zones) {
    if (zone.y > 0) walls.push({ x: zone.x, y: 0, w: zone.w, h: zone.y });
    const bottomY = zone.y + zone.h;
    if (bottomY < room.height) walls.push({ x: zone.x, y: bottomY, w: zone.w, h: room.height - bottomY });
  }
  return walls;
}

export function castleInteriorWalls() {
  return zoneWalls(castleInteriorData);
}

// The Schartenpass: a long switchback climb east of the village, ending at a
// dragon's lair. Waypoints defined once and reused both for the path itself
// and to auto-place flanking rocks, so the longer route doesn't need every
// rock hand-placed.
export const MOUNTAIN_WAYPOINTS = [
  { x: 3420, y: 1300 }, { x: 3680, y: 1260 }, { x: 3880, y: 1050 },
  { x: 3700, y: 860 }, { x: 3980, y: 720 }, { x: 4220, y: 780 },
  { x: 4180, y: 520 }, { x: 4460, y: 460 }, { x: 4400, y: 260 },
  { x: 4700, y: 220 }, { x: 4950, y: 340 }, { x: 5200, y: 280 },
  { x: 5150, y: 100 }, { x: 5450, y: 80 }, { x: 5700, y: 200 },
  { x: 6000, y: 150 }, { x: 6250, y: 260 }, { x: 6500, y: 200 },
  { x: 6700, y: 250 }, { x: 6850, y: 300 },
];

export function buildMountainRocks(waypoints) {
  const rocks = [];
  for (let i = 1; i < waypoints.length; i += 1) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const side = i % 2 === 0 ? 1 : -1;
    rocks.push({ x: mx + px * 95 * side, y: my + py * 95 * side, r: 50 + (i % 3) * 10 });
    if (i % 2 === 0) {
      rocks.push({ x: mx - px * 115 * side, y: my - py * 115 * side, r: 46 + (i % 4) * 8 });
    }
  }
  return rocks;
}

// Level 1: a quiet forest clearing where Frieren wakes after accepting the
// Duke's true quest. A lake fills the northwest, her own cabin sits in the
// southwest, and a long forest path leads east to a small village — beyond
// which the Schartenpass climbs to a dragon's lair.
export const levelOneData = {
  width: 7200,
  height: 2900,
  spawn: { x: 1700, y: 1500 },
  lakeBlobs: [
    { x: 0, y: 0, w: 980, h: 540 },
    { x: 0, y: 460, w: 700, h: 280 },
    { x: 640, y: 0, w: 360, h: 800 },
  ],
  cabin: {
    name: "Frierens Hütte",
    x: 340,
    y: 1900,
    doorX: 340,
    doorY: 1965,
  },
  village: {
    name: "Waldlichtung-Dorf",
    x: 3120,
    y: 1320,
  },
  elder: {
    name: "Ältestin Roswitha",
    x: 3060,
    y: 1380,
    talked: false,
    questAccepted: false,
    passCleared: false,
    rewardClaimed: false,
  },
  mountain: {
    name: "Hoher Schartenpass",
    base: { x: 3420, y: 1300 },
    summit: { x: 6850, y: 300 },
    waypoints: MOUNTAIN_WAYPOINTS,
    rocks: buildMountainRocks(MOUNTAIN_WAYPOINTS),
    enemies: [
      ["wisp", 3700, 1200, 34, 60, 110],
      ["soldier", 3850, 1000, 44, 95, 150],
      ["soldier", 3750, 800, 44, 100, 150],
      ["wraith", 4050, 700, 55, 190, 200],
      ["shade", 4300, 550, 62, 210, 210],
      ["soldier", 4350, 350, 44, 100, 150],
      ["wraith", 4600, 250, 55, 190, 200],
      ["wisp", 4900, 300, 34, 65, 110],
      ["shade", 5150, 200, 62, 220, 220],
      ["soldier", 5350, 150, 44, 105, 160],
      ["wraith", 5650, 220, 55, 200, 210],
      ["shade", 6000, 200, 62, 230, 230],
      ["soldier", 6250, 230, 44, 110, 160],
      ["wraith", 6500, 220, 55, 210, 220],
    ],
    boss: ["dragon", 6850, 300, 140, 1400, 900],
  },
  southForest: {
    name: "Düsterhain",
    forkX: 3120,
    forkY: 1420,
    dungeonEntrance: { x: 3100, y: 2650, name: "Waldverlies" },
    enemies: [
      ["soldier", 2950, 1700, 44, 90, 140],
      ["wisp", 3250, 1850, 34, 55, 100],
      ["soldier", 3050, 2050, 44, 95, 150],
      ["wraith", 3280, 2250, 55, 160, 190],
      ["shade", 2980, 2400, 60, 180, 200],
      ["wisp", 3200, 2500, 34, 60, 100],
    ],
  },
  wagons: [
    { id: "l1-clearing", name: "Lichtung-Station", x: 1700, y: 1640 },
    { id: "l1-village", name: "Dorf-Station", x: 3050, y: 1420 },
  ],
  shrine: { x: 1500, y: 1700, r: 60 },
  himmel: {
    name: "Himmel",
    x: 1860,
    y: 1430,
    talked: false,
    questAccepted: false,
  },
  flowerField: { x: 1280, y: 1140, w: 900, h: 460 },
  flowers: (() => {
    const colors = ["#f2a7b5", "#e9c46a", "#b4e7ee", "#cdb8e0", "#fff6dc"];
    const clusters = [
      { x: 1380, y: 1230 }, { x: 1560, y: 1300 }, { x: 1750, y: 1200 },
      { x: 1950, y: 1280 }, { x: 2080, y: 1380 }, { x: 1420, y: 1480 },
      { x: 1640, y: 1540 }, { x: 1860, y: 1560 }, { x: 2040, y: 1500 },
      { x: 1550, y: 1400 },
    ];
    const list = [];
    clusters.forEach((cluster, ci) => {
      for (let i = 0; i < 9; i += 1) {
        const angle = (i / 9) * TAU + ci;
        const radius = 16 + (i % 4) * 13;
        list.push({
          x: cluster.x + Math.cos(angle) * radius,
          y: cluster.y + Math.sin(angle) * radius * 0.6,
          c: colors[(ci + i) % colors.length],
        });
      }
    });
    return list;
  })(),
  // dense flanking trees plus a few scattered near the clearing
  trees: [
    { x: 1100, y: 1000 }, { x: 1180, y: 1700 }, { x: 1080, y: 1850 },
    { x: 2300, y: 1050 }, { x: 2350, y: 1750 },
    { x: 1700, y: 950 }, { x: 1900, y: 1750 },
    // lakeshore treeline
    { x: 1000, y: 200 }, { x: 1050, y: 400 }, { x: 1000, y: 650 },
    { x: 750, y: 850 }, { x: 950, y: 900 },
    // forest corridor flanking the path (north side)
    { x: 2420, y: 1180 }, { x: 2560, y: 1140 }, { x: 2700, y: 1190 },
    { x: 2840, y: 1150 }, { x: 2980, y: 1200 },
    // forest corridor flanking the path (south side)
    { x: 2440, y: 1460 }, { x: 2580, y: 1500 }, { x: 2720, y: 1450 },
    { x: 2860, y: 1500 }, { x: 2990, y: 1460 },
    // around the cabin
    { x: 180, y: 1800 }, { x: 200, y: 2050 }, { x: 480, y: 2050 },
    { x: 520, y: 1830 },
    // around the village
    { x: 2980, y: 1080 }, { x: 3260, y: 1100 }, { x: 3280, y: 1500 },
    { x: 3000, y: 1560 },
  ].concat((() => {
    // Düsterhain: a dense forest filling the southern fork, with a clearing
    // kept open around the dungeon entrance so it stays reachable.
    const dense = [];
    const entrance = { x: 3100, y: 2650 };
    for (let i = 0; i < 130; i += 1) {
      const x = 2680 + ((i * 113) % 900);
      const y = 1520 + ((i * 197) % 1200);
      if (dist(x, y, entrance.x, entrance.y) < 180) continue;
      if (dist(x, y, 3120, 1420) < 90) continue;
      dense.push({ x, y });
    }
    return dense;
  })()),
};

export const cabinInteriorData = {
  width: 780,
  height: 540,
  entry: { x: 390, y: 522 },
  exit: { x: 355, y: 450, w: 70, h: 60 },
  bed: { x: 110, y: 420 },
  windows: [{ x: 300, y: 30 }, { x: 480, y: 30 }],
  nook: { x: 630, y: 20, w: 130, h: 160 },
  ladder: { x: 660, y: 70, h: 120 },
  table: { x: 380, y: 300 },
  bookshelf: { x: 660, y: 340 },
  grimoireFound: false,
};

// Waldverlies: a side-view platformer dungeon, same style as Hohlgrund and
// Königsgrab. Himmel follows in here using side-view companion AI (gravity +
// platform snapping + a jump heuristic) so he can still fight alongside
// Frieren despite the dungeon no longer being top-down.
