import { createHohlgrundDungeon } from "./generator.js";

export const forestDungeonData = {
  height: 720,
  floors: [
    {
      name: "Waldverlies",
      width: 2800,
      start: { x: 110, y: 480 },
      exit: { x: 2680, y: 424, w: 58, h: 112 },
      platforms: [
        { x: 0, y: 612, w: 420, h: 108 },
        { x: 480, y: 560, w: 320, h: 42 },
        { x: 860, y: 500, w: 300, h: 38 },
        { x: 1220, y: 560, w: 340, h: 42 },
        { x: 1620, y: 500, w: 300, h: 38 },
        { x: 1980, y: 612, w: 820, h: 108 },
        { x: 360, y: 420, w: 140, h: 24 },
        { x: 700, y: 380, w: 150, h: 24 },
        { x: 1060, y: 340, w: 160, h: 24 },
        { x: 1480, y: 400, w: 160, h: 24 },
        { x: 1850, y: 440, w: 160, h: 24 },
      ],
      spikes: [
        { x: 420, y: 602, w: 56, h: 28 },
        { x: 800, y: 590, w: 56, h: 28 },
        { x: 1180, y: 602, w: 36, h: 28 },
        { x: 1560, y: 590, w: 56, h: 28 },
      ],
      chest: { id: "waldverlies-chest", x: 2200, y: 570, w: 38, h: 34, loot: "gold" },
      enemies: [
        ["crawler", 650, 560, 30, 90, 130],
        ["bat", 1100, 320, 28, 70, 110],
        ["crawler", 1500, 380, 32, 100, 140],
        ["bat", 1900, 420, 28, 80, 120],
        ["shade", 2050, 560, 55, 160, 180],
      ],
      boss: ["forest_guardian", 2500, 612, 60, 950, 700],
    },
  ],
  openedChests: new Set(),
  cleared: false,
  bossIntroShown: false,
};

export const dungeonData = createHohlgrundDungeon();

export const cryptData = {
  height: 720,
  floors: [
    {
      name: "Königsgrab I: Ahnenkammer",
      width: 2880,
      start: { x: 110, y: 480 },
      descent: { x: 2760, y: 480, w: 64, h: 118, label: "E: Descend" },
      platforms: [
        { x: 0, y: 612, w: 480, h: 108 },
        { x: 540, y: 560, w: 360, h: 42 },
        { x: 980, y: 500, w: 340, h: 38 },
        { x: 1400, y: 560, w: 420, h: 42 },
        { x: 1920, y: 612, w: 960, h: 108 },
        { x: 360, y: 420, w: 150, h: 24 },
        { x: 700, y: 372, w: 160, h: 24 },
        { x: 1120, y: 330, w: 190, h: 24 },
        { x: 1560, y: 410, w: 190, h: 24 },
        { x: 2060, y: 450, w: 170, h: 24 },
      ],
      spikes: [
        { x: 480, y: 602, w: 84, h: 28 },
        { x: 930, y: 590, w: 86, h: 28 },
        { x: 1340, y: 602, w: 90, h: 28 },
        { x: 1850, y: 602, w: 96, h: 28 },
      ],
      secrets: [
        { id: "ahnenkammer-vault", x: 690, y: 332, w: 32, h: 144, hint: "A sarcophagus seam" },
      ],
      chests: [
        { id: "ahnenkammer-relic", x: 612, y: 292, w: 38, h: 34, loot: "vigor", secretId: "ahnenkammer-vault" },
        { id: "ahnenkammer-cache", x: 2150, y: 410, w: 38, h: 34, loot: "heal" },
      ],
      enemies: [
        ["crawler", 660, 560, 30, 48, 76],
        ["bat", 1080, 360, 28, 38, 88],
        ["wraith", 1640, 410, 50, 110, 132],
      ],
    },
    {
      name: "Königsgrab II: Grabkammer des gefallenen Königs",
      width: 3100,
      start: { x: 110, y: 480 },
      exit: { x: 2980, y: 400, w: 58, h: 112 },
      platforms: [
        { x: 0, y: 612, w: 440, h: 108 },
        { x: 500, y: 560, w: 360, h: 42 },
        { x: 920, y: 500, w: 380, h: 42 },
        { x: 1380, y: 566, w: 400, h: 42 },
        { x: 1840, y: 508, w: 440, h: 42 },
        { x: 2380, y: 612, w: 720, h: 108 },
        { x: 330, y: 420, w: 170, h: 24 },
        { x: 700, y: 360, w: 190, h: 24 },
        { x: 1100, y: 320, w: 170, h: 24 },
        { x: 1660, y: 392, w: 200, h: 24 },
        { x: 2120, y: 360, w: 210, h: 24 },
      ],
      spikes: [
        { x: 440, y: 602, w: 90, h: 28 },
        { x: 1310, y: 602, w: 96, h: 28 },
        { x: 1800, y: 602, w: 82, h: 28 },
        { x: 2280, y: 602, w: 110, h: 28 },
      ],
      secrets: [
        { id: "grabkammer-niche", x: 1098, y: 246, w: 34, h: 78, hint: "A crumbling royal niche" },
      ],
      chests: [
        { id: "grabkammer-crown", x: 1230, y: 210, w: 38, h: 34, loot: "crown", secretId: "grabkammer-niche" },
      ],
      enemies: [
        ["wraith", 760, 380, 52, 118, 134],
        ["crawler", 1480, 566, 32, 76, 92],
        ["wraith", 2000, 460, 54, 124, 136],
        ["cursed_king", 2820, 612, 64, 280, 200],
      ],
    },
  ],
};
