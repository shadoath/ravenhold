import type {
  BuildKind,
  EnemyDef,
  EnemyKind,
  RetainerDef,
  RetainerKind,
  TowerDef,
  TowerKind,
  WallTier,
  WaveSpec,
  WorkDef,
  WorkKind,
} from "./types";

export const WORLD_W = 1600;
export const WORLD_H = 900;
export const COLS = 32;
export const ROWS = 18;
export const CELL = WORLD_W / COLS;
export const FIXED_DT = 1 / 60;
export const START_GOLD = 280;
export const START_LIVES = 20;
export const SELL_RATIO = 0.55;
export const MAX_DMG_LEVEL = 2;
export const MAX_RATE_LEVEL = 2;
export const DMG_UP_COST = [55, 100] as const;
export const RATE_UP_COST = [50, 90] as const;
export const DMG_UP_BONUS = 0.35;
export const RATE_UP_BONUS = 0.22;

export const TOWER_KINDS: TowerKind[] = ["longbow", "ballista", "catapult", "warden"];
export const WORK_KINDS: WorkKind[] = ["wall", "ditch"];
export const RETAINER_KINDS: RetainerKind[] = ["watch", "hero"];
export const BUILD_KINDS: BuildKind[] = [...WORK_KINDS, ...RETAINER_KINDS, ...TOWER_KINDS];

export const TOWERS: Record<TowerKind, TowerDef> = {
  longbow: {
    kind: "longbow",
    name: "Longbow",
    blurb: "Cheap watchtower. Honest range, single target.",
    cost: 75,
    range: 158,
    damage: 13,
    fireRate: 1.2,
    projectileSpeed: 460,
    splash: 0,
    slow: 0,
    armorPierce: 0,
    homing: true,
    projectile: "arrow",
  },
  ballista: {
    kind: "ballista",
    name: "Ballista",
    blurb: "Long reach. Slow, brutal bolts.",
    cost: 155,
    range: 228,
    damage: 44,
    fireRate: 0.42,
    projectileSpeed: 580,
    splash: 0,
    slow: 0,
    armorPierce: 0.15,
    homing: true,
    projectile: "bolt",
  },
  catapult: {
    kind: "catapult",
    name: "Catapult",
    blurb: "Lobs stone. Splashes a cluster.",
    cost: 190,
    range: 178,
    damage: 28,
    fireRate: 0.48,
    projectileSpeed: 300,
    splash: 78,
    slow: 0,
    armorPierce: 0.55,
    homing: false,
    projectile: "stone",
  },
  warden: {
    kind: "warden",
    name: "Warden",
    blurb: "Rune fire. Fast, and it slows the host.",
    cost: 130,
    range: 142,
    damage: 9,
    fireRate: 1.75,
    projectileSpeed: 400,
    splash: 0,
    slow: 0.28,
    armorPierce: 1,
    homing: true,
    projectile: "orb",
  },
};

export const WORKS: Record<WorkKind, WorkDef> = {
  wall: {
    kind: "wall",
    name: "Stakes",
    blurb: "Thin sticks. Drag a line — they lash together. Then timber, stone, a tower.",
    cost: 12,
    hp: 48,
  },
  ditch: {
    kind: "ditch",
    name: "Ditch",
    blurb: "They wade it slow, or walk around. Ladders ignore it.",
    cost: 9,
    hp: 1,
  },
};

export const WALL_TIERS: {
  name: string;
  blurb: string;
  hp: number;
  upgradeCost: number;
  pathCost: number;
  draw: { w: number; h: number };
}[] = [
  {
    name: "Stakes",
    blurb: "Thin sticks. Cheap. They smash these first.",
    hp: 48,
    upgradeCost: 0,
    pathCost: 14,
    draw: { w: 48, h: 52 },
  },
  {
    name: "Palisade",
    blurb: "Proper timber. Holds a line.",
    hp: 112,
    upgradeCost: 24,
    pathCost: 20,
    draw: { w: 56, h: 64 },
  },
  {
    name: "Stone",
    blurb: "Masonry. Raise a tower on it.",
    hp: 220,
    upgradeCost: 52,
    pathCost: 28,
    draw: { w: 62, h: 72 },
  },
];

export const KEEPLET_COST = 78;
export const KEEPLET_HP = 310;
export const KEEPLET_PATH_COST = 36;
export const KEEPLET_DRAW = { w: 78, h: 118 };
export const MOUNT_COST_RATIO = 0.58;
export const HEIGHT_RANGE = 1.42;

export function wallPathCost(tier: WallTier, hasKeep: boolean) {
  if (hasKeep) return KEEPLET_PATH_COST;
  return WALL_TIERS[tier]!.pathCost;
}

export function mountCost(kind: TowerKind) {
  return Math.floor(TOWERS[kind].cost * MOUNT_COST_RATIO);
}

export function elevatedRange(kind: TowerKind) {
  return Math.round(TOWERS[kind].range * HEIGHT_RANGE);
}

export const RETAINERS: Record<RetainerKind, RetainerDef> = {
  watch: {
    kind: "watch",
    name: "Watch",
    blurb: "A spearman. Place him, then tap a far post — he walks the line.",
    cost: 90,
    hp: 120,
    range: 52,
    damage: 12,
    fireRate: 1.15,
    speed: 58,
  },
  hero: {
    kind: "hero",
    name: "Marshal",
    blurb: "One captain. Set patrol posts A and B; he holds the whole run.",
    cost: 210,
    hp: 260,
    range: 64,
    damage: 24,
    fireRate: 1.4,
    speed: 72,
  },
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  raider: {
    kind: "raider",
    name: "Raider",
    hp: 34,
    speed: 58,
    gold: 8,
    lives: 1,
    armor: 0,
    radius: 14,
    melee: 9,
    animSpeed: 8,
  },
  wolf: {
    kind: "wolf",
    name: "Wolf-rider",
    hp: 20,
    speed: 98,
    gold: 11,
    lives: 1,
    armor: 0,
    radius: 16,
    melee: 6,
    animSpeed: 12,
  },
  shield: {
    kind: "shield",
    name: "Shieldman",
    hp: 118,
    speed: 40,
    gold: 16,
    lives: 1,
    armor: 0.4,
    radius: 16,
    melee: 16,
    animSpeed: 6,
  },
  warlord: {
    kind: "warlord",
    name: "Warlord",
    hp: 780,
    speed: 34,
    gold: 90,
    lives: 3,
    armor: 0.22,
    radius: 22,
    melee: 34,
    animSpeed: 5,
  },
};

export const WAVES: WaveSpec[] = [
  {
    name: "Scouts",
    hint: "A thin line from the west",
    entries: [{ kind: "raider", count: 12, interval: 0.08, delay: 0 }],
  },
  {
    name: "The line swells",
    hint: "Two ranks across the field",
    entries: [
      { kind: "raider", count: 14, interval: 0.07, delay: 0 },
      { kind: "raider", count: 14, interval: 0.07, delay: 5.4 },
    ],
  },
  {
    name: "Outriders",
    hint: "Wolves on the flanks",
    entries: [
      { kind: "raider", count: 10, interval: 0.08, delay: 0 },
      { kind: "wolf", count: 10, interval: 0.08, delay: 1.6 },
      { kind: "raider", count: 8, interval: 0.08, delay: 6.2 },
    ],
  },
  {
    name: "Iron in the grass",
    entries: [
      { kind: "raider", count: 12, interval: 0.07, delay: 0 },
      { kind: "shield", count: 6, interval: 0.18, delay: 2.2 },
      { kind: "raider", count: 10, interval: 0.08, delay: 6.5 },
    ],
  },
  {
    name: "Ladders",
    hint: "They walk the ditches",
    entries: [
      { kind: "raider", count: 14, interval: 0.07, delay: 0, gear: "ladder" },
      { kind: "wolf", count: 10, interval: 0.07, delay: 2.4, gear: "ladder" },
    ],
  },
  {
    name: "Mixed host",
    entries: [
      { kind: "raider", count: 12, interval: 0.07, delay: 0 },
      { kind: "wolf", count: 10, interval: 0.06, delay: 1.2 },
      { kind: "shield", count: 5, interval: 0.2, delay: 3.4 },
      { kind: "raider", count: 10, interval: 0.07, delay: 7.2 },
    ],
  },
  {
    name: "Shield wall",
    hint: "A wide iron front",
    entries: [
      { kind: "shield", count: 12, interval: 0.1, delay: 0 },
      { kind: "wolf", count: 10, interval: 0.07, delay: 2.8 },
      { kind: "shield", count: 8, interval: 0.12, delay: 6.4 },
    ],
  },
  {
    name: "Rams",
    hint: "They smash palisades",
    entries: [
      { kind: "shield", count: 12, interval: 0.1, delay: 0, gear: "ram" },
      { kind: "raider", count: 12, interval: 0.07, delay: 2.4 },
      { kind: "shield", count: 8, interval: 0.12, delay: 6.8, gear: "ram" },
    ],
  },
  {
    name: "No quarter",
    hint: "Ladders and rams together",
    entries: [
      { kind: "raider", count: 12, interval: 0.06, delay: 0, gear: "ladder" },
      { kind: "wolf", count: 12, interval: 0.06, delay: 1.1, gear: "ladder" },
      { kind: "shield", count: 10, interval: 0.1, delay: 3.2, gear: "ram" },
      { kind: "raider", count: 10, interval: 0.07, delay: 7.5 },
    ],
  },
  {
    name: "The warlord",
    hint: "The ram at the head of the host",
    entries: [
      { kind: "warlord", count: 1, interval: 1, delay: 0.4, gear: "ram" },
      { kind: "shield", count: 12, interval: 0.1, delay: 1.2, gear: "ram" },
      { kind: "raider", count: 14, interval: 0.06, delay: 2.8, gear: "ladder" },
      { kind: "wolf", count: 12, interval: 0.06, delay: 4.2 },
      { kind: "shield", count: 8, interval: 0.12, delay: 8, gear: "ram" },
    ],
  },
];

export const TOWER_DRAW: Record<TowerKind, { w: number; h: number }> = {
  longbow: { w: 70, h: 92 },
  ballista: { w: 84, h: 72 },
  catapult: { w: 80, h: 74 },
  warden: { w: 58, h: 90 },
};

export const ENEMY_DRAW: Record<EnemyKind, { w: number; h: number }> = {
  raider: { w: 52, h: 80 },
  wolf: { w: 88, h: 70 },
  shield: { w: 58, h: 82 },
  warlord: { w: 86, h: 112 },
};

export const ENEMY_STRIDE: Record<EnemyKind, number> = {
  raider: 13,
  wolf: 16,
  shield: 15,
  warlord: 19,
};

export const WORK_DRAW: Record<WorkKind, { w: number; h: number }> = {
  wall: { w: 56, h: 58 },
  ditch: { w: 54, h: 36 },
};

export const RETAINER_DRAW: Record<RetainerKind, { w: number; h: number }> = {
  watch: { w: 48, h: 74 },
  hero: { w: 56, h: 82 },
};

/** Landmark keep drawn on the eastern rise. Feet at (x, y). */
export const KEEP = { x: 1510, y: 524, w: 360, h: 420 };
export const KEEP_GATE = { x: 1418, y: 458 };
export const LEAK_RADIUS = 34;
