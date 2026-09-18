import { CELL, COLS, ROWS } from "./config";

const N = COLS * ROWS;
const SQRT2 = 1.41421356;
const DIRS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

export type CostFn = (c: number, r: number) => number;

export type FlowField = {
  dist: Float64Array;
  dirX: Float32Array;
  dirY: Float32Array;
};

export function createField(): FlowField {
  return {
    dist: new Float64Array(N),
    dirX: new Float32Array(N),
    dirY: new Float32Array(N),
  };
}

function idx(c: number, r: number) {
  return r * COLS + c;
}

export function rebuildField(field: FlowField, costAt: CostFn, goalC: number, goalR: number) {
  const { dist, dirX, dirY } = field;
  dist.fill(Infinity);
  dirX.fill(0);
  dirY.fill(0);
  if (goalC < 0 || goalR < 0 || goalC >= COLS || goalR >= ROWS) return;

  const heap: number[] = [];
  const g0 = idx(goalC, goalR);
  dist[g0] = 0;
  heap.push(g0);

  const pop = () => {
    let bestI = 0;
    let best = dist[heap[0]!]!;
    for (let i = 1; i < heap.length; i++) {
      const d = dist[heap[i]!]!;
      if (d < best) {
        best = d;
        bestI = i;
      }
    }
    const node = heap[bestI]!;
    heap[bestI] = heap[heap.length - 1]!;
    heap.pop();
    return node;
  };

  while (heap.length) {
    const i = pop();
    const c = i % COLS;
    const r = (i / COLS) | 0;
    const here = dist[i]!;
    for (const [dc, dr, step] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      if (dc !== 0 && dr !== 0) {
        if (!Number.isFinite(costAt(c + dc, r)) || !Number.isFinite(costAt(c, r + dr))) continue;
      }
      const tile = costAt(nc, nr);
      if (!Number.isFinite(tile)) continue;
      const ni = idx(nc, nr);
      const next = here + step * tile;
      if (next + 1e-6 < dist[ni]!) {
        dist[ni] = next;
        heap.push(ni);
      }
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = idx(c, r);
      if (!Number.isFinite(dist[i]!)) continue;
      let best = dist[i]!;
      let bx = 0;
      let by = 0;
      for (const [dc, dr] of DIRS) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const d = dist[idx(nc, nr)]!;
        if (d + 0.02 < best) {
          best = d;
          bx = dc;
          by = dr;
        }
      }
      const len = Math.hypot(bx, by) || 1;
      dirX[i] = bx / len;
      dirY[i] = by / len;
    }
  }
}

export function sampleFlow(field: FlowField, x: number, y: number) {
  const gx = x / CELL - 0.5;
  const gy = y / CELL - 0.5;
  const c0 = Math.floor(gx);
  const r0 = Math.floor(gy);
  const tx = gx - c0;
  const ty = gy - r0;

  const grab = (c: number, r: number) => {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return { x: 0, y: 0, d: Infinity };
    const i = idx(c, r);
    return { x: field.dirX[i]!, y: field.dirY[i]!, d: field.dist[i]! };
  };

  const a = grab(c0, r0);
  const b = grab(c0 + 1, r0);
  const c = grab(c0, r0 + 1);
  const d = grab(c0 + 1, r0 + 1);
  const w = (cell: { d: number }) => (Number.isFinite(cell.d) ? 1 : 0);
  const w00 = (1 - tx) * (1 - ty) * w(a);
  const w10 = tx * (1 - ty) * w(b);
  const w01 = (1 - tx) * ty * w(c);
  const w11 = tx * ty * w(d);
  const sum = w00 + w10 + w01 + w11;
  if (sum <= 0) return { x: 1, y: 0, dist: Infinity };
  return {
    x: (a.x * w00 + b.x * w10 + c.x * w01 + d.x * w11) / sum,
    y: (a.y * w00 + b.y * w10 + c.y * w01 + d.y * w11) / sum,
    dist: Math.min(a.d, b.d, c.d, d.d),
  };
}

export function cellDist(field: FlowField, c: number, r: number) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return Infinity;
  return field.dist[idx(c, r)]!;
}
