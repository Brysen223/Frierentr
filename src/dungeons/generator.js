const FLOOR_NAMES = [
  "Hohlgrund I: Moss Gallery",
  "Hohlgrund II: Echo Cistern",
  "Hohlgrund III: Sunless Reliquary",
];

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function hashSeed(text) {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function key(x, y) {
  return `${x},${y}`;
}

function parseKey(value) {
  return value.split(",").map(Number);
}

function walkableCells(grid) {
  const cells = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      if (grid[y][x] === 0) cells.push([x, y]);
    }
  }
  return cells;
}

function farthestCell(grid, start) {
  const queue = [start];
  const distance = new Map([[key(...start), 0]]);
  const parent = new Map();
  let farthest = start;

  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    const currentDistance = distance.get(key(x, y));
    if (currentDistance > distance.get(key(...farthest))) farthest = [x, y];

    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!grid[ny] || grid[ny][nx] !== 0) continue;
      const nextKey = key(nx, ny);
      if (distance.has(nextKey)) continue;
      distance.set(nextKey, currentDistance + 1);
      parent.set(nextKey, key(x, y));
      queue.push([nx, ny]);
    }
  }

  return { cell: farthest, distance, parent };
}

function pathBetween(grid, start, end) {
  const result = farthestCell(grid, start);
  const path = [];
  let cursor = key(...end);
  const startKey = key(...start);

  while (cursor) {
    path.push(parseKey(cursor));
    if (cursor === startKey) break;
    cursor = result.parent.get(cursor);
  }

  return path.reverse();
}

function generateTopology(seed, floorIndex) {
  const ROT = globalThis.ROT;
  if (!ROT?.Map?.Digger || !ROT?.RNG) {
    throw new Error("ROT.js did not load before dungeon generation.");
  }

  ROT.RNG.setSeed(hashSeed(`${seed}:floor:${floorIndex}`));
  const width = 34;
  const height = 18;
  const grid = Array.from({ length: height }, () => Array(width).fill(1));
  const digger = new ROT.Map.Digger(width, height, {
    roomWidth: [4, 8],
    roomHeight: [3, 6],
    corridorLength: [2, 7],
    dugPercentage: 0.28,
    timeLimit: 500,
  });

  digger.create((x, y, value) => {
    grid[y][x] = value === 1 ? 1 : 0;
  });

  const cells = walkableCells(grid);
  const first = cells[0] || [1, 1];
  const entrance = farthestCell(grid, first).cell;
  const objective = farthestCell(grid, entrance).cell;
  const criticalPath = pathBetween(grid, entrance, objective);

  return {
    width,
    height,
    tiles: grid.map((row) => row.join("")),
    entrance,
    objective,
    criticalPath,
  };
}

function randomItem(items) {
  return items[Math.floor(globalThis.ROT.RNG.getUniform() * items.length)];
}

function createPlatforms(sectionCount, floorIndex, route) {
  const platforms = [];
  const spikes = [];
  const sectionWidth = 510;
  const groundY = 630;

  for (let index = 0; index < sectionCount; index += 1) {
    const x = index * sectionWidth;
    const routeCell = route[Math.floor((index / Math.max(1, sectionCount - 1)) * (route.length - 1))];
    const elevation = routeCell ? ((routeCell[1] + floorIndex) % 3) * 28 : 0;
    const y = groundY - elevation;
    const gap = index < sectionCount - 1 ? 54 + Math.floor(globalThis.ROT.RNG.getUniform() * 36) : 0;
    const width = sectionWidth - gap;

    platforms.push({ x, y, w: width, h: 720 - y });

    if (gap) {
      spikes.push({ x: x + width, y: 620, w: gap, h: 28 });
    }

    if (index > 0 && index < sectionCount - 1) {
      const upperWidth = 150 + Math.floor(globalThis.ROT.RNG.getUniform() * 90);
      const upperX = x + 85 + Math.floor(globalThis.ROT.RNG.getUniform() * 110);
      const upperY = y - 120 - Math.floor(globalThis.ROT.RNG.getUniform() * 70);
      platforms.push({ x: upperX, y: upperY, w: upperWidth, h: 24 });
    }
  }

  return { platforms, spikes, width: sectionCount * sectionWidth };
}

function createEnemies(floorIndex, sectionCount, sectionWidth) {
  const enemyTables = [
    ["crawler", "crawler", "bat"],
    ["crawler", "bat", "bat", "shade"],
    ["crawler", "bat", "shade", "shade"],
  ];
  const enemies = [];

  for (let section = 1; section < sectionCount - 1; section += 1) {
    if (globalThis.ROT.RNG.getUniform() < 0.28) continue;
    const type = randomItem(enemyTables[floorIndex]);
    const x = section * sectionWidth + 180 + Math.floor(globalThis.ROT.RNG.getUniform() * 170);
    const isBat = type === "bat";
    enemies.push([
      type,
      x,
      isBat ? 390 : 610,
      isBat ? 28 : type === "shade" ? 52 : 32,
      42 + floorIndex * 18 + (type === "shade" ? 45 : 0),
      74 + floorIndex * 18,
    ]);
  }

  return enemies;
}

function createSecrets(floorIndex, sectionWidth) {
  const section = 2 + floorIndex;
  const wallX = section * sectionWidth + 84;
  const secretId = `generated-${floorIndex}-crevice`;
  return {
    secrets: [
      {
        id: secretId,
        x: wallX,
        y: 382,
        w: 34,
        h: 176,
        hint: ["A root-choked crevice", "An echo behind wet stone", "A reliquary seam"][floorIndex],
      },
    ],
    chests: [
      {
        id: `generated-${floorIndex}-cache`,
        x: wallX + 92,
        y: 340,
        w: 38,
        h: 34,
        loot: ["flugmagie", "range", "mana"][floorIndex],
        secretId,
      },
    ],
  };
}

function createFloor(seed, floorIndex) {
  const topology = generateTopology(seed, floorIndex);
  const sectionCount = 7 + floorIndex;
  const sectionWidth = 510;
  const geometry = createPlatforms(sectionCount, floorIndex, topology.criticalPath);
  const hidden = createSecrets(floorIndex, sectionWidth);
  const finalFloor = floorIndex === FLOOR_NAMES.length - 1;
  const gateX = geometry.width - 118;
  const floor = {
    name: FLOOR_NAMES[floorIndex],
    width: geometry.width,
    start: { x: 84, y: 500 },
    platforms: geometry.platforms,
    spikes: geometry.spikes,
    secrets: hidden.secrets,
    chests: hidden.chests,
    enemies: createEnemies(floorIndex, sectionCount, sectionWidth),
    topology,
  };

  if (finalFloor) {
    floor.exit = { x: gateX, y: 486, w: 58, h: 132 };
    floor.finalMimic = { x: gateX - 130, y: 590, w: 50, h: 40 };
    floor.enemies.push(["knight", gateX - 330, 620, 62, 260, 180]);
  } else {
    floor.descent = { x: gateX, y: 486, w: 64, h: 132, label: "E: Descend" };
    floor.chests.push({
      id: `generated-${floorIndex}-visible`,
      x: gateX - 230,
      y: 570,
      w: 38,
      h: 34,
      loot: floorIndex === 0 ? "heal" : "power",
    });
  }

  return floor;
}

export function createHohlgrundDungeon(seed = "hohlgrund-test-v1") {
  return {
    seed,
    height: 720,
    floors: FLOOR_NAMES.map((_, index) => createFloor(seed, index)),
  };
}
