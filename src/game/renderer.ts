import type { Atlas } from "./assets";
import {
  CELL,
  COLS,
  ENEMY_DRAW,
  KEEP,
  KEEP_GATE,
  KEEPLET_DRAW,
  HEIGHT_RANGE,
  RETAINER_DRAW,
  RETAINERS,
  ROWS,
  TOWER_DRAW,
  TOWERS,
  WALL_TIERS,
  WORK_DRAW,
  WORLD_H,
  WORLD_W,
} from "./config";
import type { GameEngine } from "./engine";
import type { BuildKind, Enemy } from "./types";

const PATH_COLOR = "rgba(232, 224, 212, 0.16)";
const RANGE_FILL = "rgba(200, 194, 180, 0.1)";
const RANGE_STROKE = "rgba(232, 224, 212, 0.55)";
const OK_FILL = "rgba(122, 138, 104, 0.28)";
const BAD_FILL = "rgba(169, 74, 66, 0.32)";
const GRID = "rgba(232, 224, 212, 0.05)";

function frameIndex(anim: number, count: number) {
  const i = Math.floor(anim) % count;
  return i < 0 ? 0 : i;
}

function isTower(kind: BuildKind) {
  return kind === "longbow" || kind === "ballista" || kind === "catapult" || kind === "warden";
}

function drawKeep(ctx: CanvasRenderingContext2D, engine: GameEngine, atlas: Atlas) {
  ctx.save();
  ctx.fillStyle = "rgba(18, 17, 16, 0.38)";
  ctx.beginPath();
  ctx.ellipse(KEEP.x - 8, KEEP.y + 10, KEEP.w * 0.36, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(atlas.keep, KEEP.x - KEEP.w / 2, KEEP.y - KEEP.h + 18, KEEP.w, KEEP.h);

  const pulse = 0.35 + 0.25 * Math.sin(engine.time * 2.1);
  const g = ctx.createRadialGradient(KEEP_GATE.x, KEEP_GATE.y, 8, KEEP_GATE.x, KEEP_GATE.y, 54);
  g.addColorStop(0, `rgba(232, 224, 212, ${0.16 + pulse * 0.12})`);
  g.addColorStop(1, "rgba(232, 224, 212, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(KEEP_GATE.x, KEEP_GATE.y, 42, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  const plaqueX = KEEP.x - 86;
  const plaqueY = KEEP.y - KEEP.h + 36;
  ctx.fillStyle = "rgba(18, 17, 16, 0.72)";
  ctx.beginPath();
  ctx.roundRect(plaqueX, plaqueY, 132, 44, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(232, 224, 212, 0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = "600 11px Cinzel, serif";
  ctx.fillStyle = "#e8e0d4";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("The Keep", plaqueX + 12, plaqueY + 18);
  ctx.font = "600 13px 'Source Sans 3', sans-serif";
  ctx.fillStyle = engine.lives <= 5 ? "#a94a42" : "#e8e0d4";
  ctx.fillText(`${engine.lives} ${engine.lives === 1 ? "life" : "lives"}`, plaqueX + 12, plaqueY + 36);
  ctx.restore();
}

function drawGear(ctx: CanvasRenderingContext2D, e: Enemy) {
  if (e.gear === "none") return;
  ctx.save();
  if (e.gear === "ladder") {
    ctx.strokeStyle = "#6a5340";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -18);
    ctx.lineTo(8, 4);
    ctx.moveTo(14, -18);
    ctx.lineTo(14, 4);
    ctx.moveTo(8, -12);
    ctx.lineTo(14, -12);
    ctx.moveTo(8, -6);
    ctx.lineTo(14, -6);
    ctx.moveTo(8, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#6a6458";
    ctx.beginPath();
    ctx.ellipse(10, -4, 12, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a8478";
    ctx.fillRect(2, -6, 16, 3);
  }
  ctx.restore();
}

export function renderWorld(ctx: CanvasRenderingContext2D, engine: GameEngine, atlas: Atlas) {
  const shake = engine.shakeAmount();
  ctx.save();
  if (shake > 0) {
    const t = engine.time;
    ctx.translate(Math.sin(t * 73.1) * 14 * shake, Math.cos(t * 51.7) * 11 * shake);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(atlas.map, 0, 0, WORLD_W, WORLD_H);
  drawKeep(ctx, engine, atlas);

  for (const w of engine.works) {
    if (w.kind !== "ditch") continue;
    const size = WORK_DRAW.ditch;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(atlas.works.ditch, w.x - size.w / 2, w.y - size.h / 2, size.w, size.h);
    ctx.globalAlpha = 1;
  }

  const placing = engine.selectedKind !== null && engine.phase === "playing";
  if (placing) {
    ctx.fillStyle = "rgba(18, 17, 16, 0.16)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.strokeStyle = PATH_COLOR;
    ctx.lineWidth = 36;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 448);
    ctx.lineTo(KEEP_GATE.x, KEEP_GATE.y);
    ctx.stroke();

    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(COLS * CELL, r * CELL);
      ctx.stroke();
    }
  }

  const hc = engine.hoverCol;
  const hr = engine.hoverRow;
  if (placing && hc >= 0 && engine.selectedKind) {
    const kind = engine.selectedKind;
    const ok = engine.canPlace(hc, hr, kind);
    ctx.fillStyle = ok ? OK_FILL : BAD_FILL;
    ctx.fillRect(hc * CELL, hr * CELL, CELL, CELL);
    const x = (hc + 0.5) * CELL;
    const y = (hr + 0.5) * CELL;
    if (ok && isTower(kind)) {
      const def = TOWERS[kind];
      ctx.beginPath();
      ctx.arc(x, y, def.range, 0, Math.PI * 2);
      ctx.fillStyle = RANGE_FILL;
      ctx.fill();
      ctx.strokeStyle = RANGE_STROKE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      const size = TOWER_DRAW[kind];
      ctx.drawImage(atlas.towers[kind], x - size.w / 2, y - size.h + 10, size.w, size.h);
      ctx.globalAlpha = 1;
    } else if (ok && (kind === "wall" || kind === "ditch")) {
      ctx.globalAlpha = 0.6;
      if (kind === "ditch") {
        const size = WORK_DRAW.ditch;
        ctx.drawImage(atlas.works.ditch, x - size.w / 2, y - size.h / 2, size.w, size.h);
      } else {
        const size = WALL_TIERS[0]!.draw;
        ctx.drawImage(atlas.walls[0], x - size.w / 2, y - size.h + 10, size.w, size.h);
      }
      ctx.globalAlpha = 1;
    } else if (ok && (kind === "watch" || kind === "hero")) {
      const def = RETAINERS[kind];
      ctx.beginPath();
      ctx.arc(x, y, def.range, 0, Math.PI * 2);
      ctx.fillStyle = RANGE_FILL;
      ctx.fill();
      ctx.strokeStyle = RANGE_STROKE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 0.6;
      const size = RETAINER_DRAW[kind];
      ctx.drawImage(atlas.retainers[kind][0]!, x - size.w / 2, y - size.h + 8, size.w, size.h);
      ctx.globalAlpha = 1;
    }
  }

  const selected = engine.towers.find((t) => t.id === engine.selectedTowerId);
  if (selected) {
    ctx.beginPath();
    ctx.arc(selected.x, selected.y, TOWERS[selected.kind].range, 0, Math.PI * 2);
    ctx.fillStyle = RANGE_FILL;
    ctx.fill();
    ctx.strokeStyle = RANGE_STROKE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const selWall = engine.works.find((w) => w.id === engine.selectedWorkId && w.mount);
  if (selWall && selWall.mount) {
    ctx.beginPath();
    ctx.arc(selWall.x, selWall.y, TOWERS[selWall.mount].range * HEIGHT_RANGE, 0, Math.PI * 2);
    ctx.fillStyle = RANGE_FILL;
    ctx.fill();
    ctx.strokeStyle = RANGE_STROKE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const selRet = engine.retainers.find((t) => t.id === engine.selectedRetainerId);
  if (selRet) {
    ctx.beginPath();
    ctx.arc(selRet.x, selRet.y, RETAINERS[selRet.kind].range, 0, Math.PI * 2);
    ctx.fillStyle = RANGE_FILL;
    ctx.fill();
    ctx.strokeStyle = RANGE_STROKE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (selRet.kind === "hero") {
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(232, 224, 212, 0.45)";
      ctx.beginPath();
      ctx.moveTo(selRet.homeX, selRet.homeY);
      ctx.lineTo(selRet.hasPatrol ? selRet.patrolX : engine.hoverCol >= 0 ? (engine.hoverCol + 0.5) * CELL : selRet.homeX, selRet.hasPatrol ? selRet.patrolY : engine.hoverRow >= 0 ? (engine.hoverRow + 0.5) * CELL : selRet.homeY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  type DrawItem =
    | { y: number; kind: "tower"; id: number }
    | { y: number; kind: "enemy"; id: number }
    | { y: number; kind: "wall"; id: number }
    | { y: number; kind: "retainer"; id: number };
  const items: DrawItem[] = [];
  for (const t of engine.towers) items.push({ y: t.y, kind: "tower", id: t.id });
  for (const e of engine.enemies) items.push({ y: e.y, kind: "enemy", id: e.id });
  for (const w of engine.works) if (w.kind === "wall") items.push({ y: w.y, kind: "wall", id: w.id });
  for (const r of engine.retainers) items.push({ y: r.y, kind: "retainer", id: r.id });
  items.sort((a, b) => a.y - b.y);

  for (const item of items) {
    if (item.kind === "tower") {
      const t = engine.towers.find((x) => x.id === item.id);
      if (!t) continue;
      const size = TOWER_DRAW[t.kind];
      const img = atlas.towers[t.kind];
      ctx.fillStyle = "rgba(18, 17, 16, 0.28)";
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + 8, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      if (t.id === engine.selectedTowerId) {
        ctx.beginPath();
        ctx.arc(t.x, t.y + 6, 16, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(232, 224, 212, 0.18)";
        ctx.fill();
      }
      ctx.drawImage(img, t.x - size.w / 2, t.y - size.h + 12, size.w, size.h);
      if (t.dmgLevel + t.rateLevel > 0) {
        ctx.fillStyle = "rgba(18, 17, 16, 0.7)";
        const pips = t.dmgLevel + t.rateLevel;
        ctx.fillRect(t.x - 10, t.y + 8, 6 * pips + 4, 6);
        for (let i = 0; i < pips; i++) {
          ctx.fillStyle = i < t.dmgLevel ? "#c4b38a" : "#9db8a8";
          ctx.fillRect(t.x - 8 + i * 6, t.y + 10, 4, 2);
        }
      }
    } else if (item.kind === "wall") {
      const w = engine.works.find((x) => x.id === item.id);
      if (!w) continue;
      const size = w.hasKeep ? KEEPLET_DRAW : WALL_TIERS[w.wallTier]!.draw;
      const img = w.hasKeep ? atlas.keeplet : atlas.walls[w.wallTier];
      if (w.flash > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(w.flash * 18);
      ctx.drawImage(img, w.x - size.w / 2, w.y - size.h + 12, size.w, size.h);
      if (w.mount) {
        const gun = TOWER_DRAW[w.mount];
        const scale = 0.62;
        ctx.drawImage(
          atlas.towers[w.mount],
          w.x - (gun.w * scale) / 2,
          w.y - size.h + 18,
          gun.w * scale,
          gun.h * scale,
        );
      }
      ctx.globalAlpha = 1;
      if (w.hp < w.maxHp) {
        const ratio = Math.max(0, w.hp / w.maxHp);
        ctx.fillStyle = "rgba(18, 17, 16, 0.75)";
        ctx.fillRect(w.x - 16, w.y - size.h - 4, 32, 4);
        ctx.fillStyle = ratio > 0.4 ? "#c4b38a" : "#a94a42";
        ctx.fillRect(w.x - 16, w.y - size.h - 4, 32 * ratio, 4);
      }
    } else if (item.kind === "retainer") {
      const r = engine.retainers.find((x) => x.id === item.id);
      if (!r) continue;
      const size = RETAINER_DRAW[r.kind];
      const frames = atlas.retainers[r.kind];
      const img = frames[frameIndex(r.anim, frames.length)]!;
      ctx.fillStyle = "rgba(18, 17, 16, 0.35)";
      ctx.beginPath();
      ctx.ellipse(r.x, r.y + 6, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.scale(r.facing, 1);
      if (r.flash > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(r.flash * 20);
      ctx.drawImage(img, -size.w / 2, -size.h + 8, size.w, size.h);
      ctx.restore();
      if (r.hp < r.maxHp) {
        const ratio = Math.max(0, r.hp / r.maxHp);
        ctx.fillStyle = "rgba(18, 17, 16, 0.75)";
        ctx.fillRect(r.x - 16, r.y - size.h - 6, 32, 4);
        ctx.fillStyle = "#7a8a68";
        ctx.fillRect(r.x - 16, r.y - size.h - 6, 32 * ratio, 4);
      }
    } else {
      const e = engine.enemies.find((x) => x.id === item.id);
      if (!e) continue;
      const size = ENEMY_DRAW[e.kind];
      const frames = atlas.enemies[e.kind];
      const img = frames[frameIndex(e.anim, frames.length)]!;
      const bob = e.state === "attack" ? 0 : Math.abs(Math.sin(e.anim * Math.PI)) * 3.2;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = "rgba(18, 17, 16, 0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 7, size.w * 0.28, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.scale(e.facing, 1);
      if (e.flash > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(e.flash * 20);
      ctx.drawImage(img, -size.w / 2, -size.h + 8 - bob, size.w, size.h);
      drawGear(ctx, e);
      ctx.restore();
      if (e.hp < e.maxHp) {
        const bw = e.kind === "warlord" ? 50 : 30;
        const ratio = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = "rgba(18, 17, 16, 0.75)";
        ctx.fillRect(e.x - bw / 2, e.y - size.h - 8 - bob, bw, 4);
        ctx.fillStyle = ratio > 0.45 ? "#7a8a68" : "#a94a42";
        ctx.fillRect(e.x - bw / 2, e.y - size.h - 8 - bob, bw * ratio, 4);
      }
      if (e.slowUntil > engine.time) {
        ctx.fillStyle = "rgba(122, 154, 136, 0.55)";
        ctx.beginPath();
        ctx.arc(e.x, e.y + 4, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (const p of engine.projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.kind === "arrow" || p.kind === "bolt") {
      const w = p.kind === "bolt" ? 28 : 22;
      const h = p.kind === "bolt" ? 10 : 8;
      ctx.drawImage(atlas.arrow, -w / 2, -h / 2, w, h);
    } else if (p.kind === "stone") {
      ctx.fillStyle = "#6a6458";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a8478";
      ctx.beginPath();
      ctx.arc(-2, -2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 8);
      g.addColorStop(0, "#d7efe4");
      g.addColorStop(0.5, "#6f9a86");
      g.addColorStop(1, "rgba(80, 120, 100, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (const p of engine.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.font = "600 13px 'Source Sans 3', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of engine.floaters) {
    const a = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  const leak = engine.leakFlash();
  if (leak > 0) {
    ctx.fillStyle = `rgba(169, 74, 66, ${0.22 * leak})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  ctx.restore();
}

export function pointerToWorld(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / WORLD_W, rect.height / WORLD_H);
  const ox = (rect.width - WORLD_W * scale) / 2;
  const oy = (rect.height - WORLD_H * scale) / 2;
  return {
    x: (clientX - rect.left - ox) / scale,
    y: (clientY - rect.top - oy) / scale,
  };
}
