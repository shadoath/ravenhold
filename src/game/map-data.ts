import { CELL, COLS, KEEP_GATE, ROWS, WORLD_H, WORLD_W } from "./config";
import type { Vec } from "./types";

/** The old road — preferred flow, not a rail. */
export const WAYPOINTS: Vec[] = [
  { x: 0, y: 448 },
  { x: 90, y: 458 },
  { x: 180, y: 450 },
  { x: 280, y: 412 },
  { x: 380, y: 368 },
  { x: 490, y: 348 },
  { x: 600, y: 354 },
  { x: 710, y: 440 },
  { x: 810, y: 498 },
  { x: 910, y: 544 },
  { x: 1010, y: 548 },
  { x: 1110, y: 490 },
  { x: 1210, y: 438 },
  { x: 1320, y: 428 },
  { x: 1404, y: 444 },
  { x: 1468, y: 458 },
];

type Circle = { x: number; y: number; r: number };

const BLOCK_CIRCLES: Circle[] = [
  { x: 70, y: 110, r: 120 },
  { x: 180, y: 60, r: 90 },
  { x: 40, y: 250, r: 70 },
  { x: 90, y: 720, r: 110 },
  { x: 210, y: 820, r: 90 },
  { x: 360, y: 40, r: 70 },
  { x: 520, y: 90, r: 55 },
  { x: 700, y: 50, r: 80 },
  { x: 880, y: 80, r: 70 },
  { x: 1080, y: 70, r: 90 },
  { x: 1280, y: 90, r: 80 },
  { x: 420, y: 820, r: 70 },
  { x: 620, y: 840, r: 80 },
  { x: 840, y: 820, r: 75 },
  { x: 1100, y: 800, r: 85 },
  { x: 980, y: 250, r: 42 },
  { x: 760, y: 220, r: 38 },
  { x: 300, y: 620, r: 40 },
  { x: 470, y: 700, r: 36 },
  { x: 1320, y: 620, r: 48 },
  { x: 1180, y: 700, r: 44 },
  { x: 1520, y: 430, r: 118 },
];

const PATH_HALF = 44;
const KEEP_MIN_X = 1488;

const pathCells = new Set<string>();
const blockedCells = new Set<string>();
const spawnCells: Vec[] = [];
let pathLength = 0;
const prefix: number[] = [0];

function key(c: number, r: number) {
  return `${c},${r}`;
}

function cellCenter(c: number, r: number): Vec {
  return { x: (c + 0.5) * CELL, y: (r + 0.5) * CELL };
}

function inBounds(c: number, r: number) {
  return c >= 0 && r >= 0 && c < COLS && r < ROWS;
}

function markDisk(x: number, y: number, radius: number, into: Set<string>) {
  const minC = Math.max(0, Math.floor((x - radius) / CELL));
  const maxC = Math.min(COLS - 1, Math.floor((x + radius) / CELL));
  const minR = Math.max(0, Math.floor((y - radius) / CELL));
  const maxR = Math.min(ROWS - 1, Math.floor((y + radius) / CELL));
  const r2 = radius * radius;
  for (let c = minC; c <= maxC; c++) {
    for (let r = minR; r <= maxR; r++) {
      const p = cellCenter(c, r);
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy <= r2) into.add(key(c, r));
    }
  }
}

(function build() {
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const a = WAYPOINTS[i]!;
    const b = WAYPOINTS[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    pathLength += len;
    prefix.push(pathLength);
    const steps = Math.max(2, Math.ceil(len / 8));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      markDisk(a.x + dx * t, a.y + dy * t, PATH_HALF, pathCells);
    }
  }

  for (const circle of BLOCK_CIRCLES) markDisk(circle.x, circle.y, circle.r, blockedCells);

  for (let c = 0; c < COLS; c++) {
    blockedCells.add(key(c, 0));
    if (c >= 28) {
      for (let r = 0; r < ROWS; r++) {
        const p = cellCenter(c, r);
        if (p.x >= KEEP_MIN_X) blockedCells.add(key(c, r));
      }
    }
  }

  const gate = worldToCell(KEEP_GATE.x, KEEP_GATE.y);
  blockedCells.delete(key(gate.c, gate.r));

  for (let r = 5; r <= 13; r++) {
    if (!blockedCells.has(key(0, r))) spawnCells.push(cellCenter(0, r));
    if (!blockedCells.has(key(1, r))) spawnCells.push(cellCenter(1, r));
  }
})();

export function worldToCell(x: number, y: number) {
  return { c: Math.floor(x / CELL), r: Math.floor(y / CELL) };
}

export function isPathCell(c: number, r: number) {
  return pathCells.has(key(c, r));
}

export function isBlockedCell(c: number, r: number) {
  return blockedCells.has(key(c, r));
}

export function inMap(c: number, r: number) {
  return inBounds(c, r);
}

export function isBuildableCell(c: number, r: number) {
  if (!inBounds(c, r)) return false;
  if (pathCells.has(key(c, r))) return false;
  if (blockedCells.has(key(c, r))) return false;
  return true;
}

/** Walls and ditches may sit on the road. */
export function isWorkCell(c: number, r: number) {
  if (!inBounds(c, r)) return false;
  if (blockedCells.has(key(c, r))) return false;
  return true;
}

export function cellWorld(c: number, r: number): Vec {
  return cellCenter(c, r);
}

export function spawnPoints() {
  return spawnCells;
}

export function gateCell() {
  return worldToCell(KEEP_GATE.x, KEEP_GATE.y);
}

export function totalPathLength() {
  return pathLength;
}

export { WORLD_W, WORLD_H, COLS, ROWS, CELL };
