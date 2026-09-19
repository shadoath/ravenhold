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
import type { BuildKind, Enemy, Work } from "./types";

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

type Links = { n: boolean; e: boolean; s: boolean; w: boolean };

function workLinks(engine: GameEngine, col: number, row: number, kind: "wall" | "ditch"): Links {
  const match = (c: number, r: number) => engine.works.some((o) => o.col === c && o.row === r && o.kind === kind);
  return {
    n: match(col, row - 1),
    e: match(col + 1, row),
    s: match(col, row + 1),
    w: match(col - 1, row),
  };
}

function linked(links: Links) {
  return links.n || links.e || links.s || links.w;
}

function linkedBox(cx: number, cy: number, links: Links, insetX: number, insetY: number) {
  const half = CELL / 2;
  return {
    x: cx - half + (links.w ? 0 : insetX),
    y: cy - half + (links.n ? 0 : insetY),
    w: CELL - (links.w ? 0 : insetX) - (links.e ? 0 : insetX),
    h: CELL - (links.n ? 0 : insetY) - (links.s ? 0 : insetY),
  };
}

function drawDitchCell(ctx: CanvasRenderingContext2D, engine: GameEngine, atlas: Atlas, w: Work) {
  const links = workLinks(engine, w.col, w.row, "ditch");
  const box = linkedBox(w.x, w.y, links, 8, 11);
  ctx.save();
  ctx.fillStyle = "rgba(36, 26, 18, 0.88)";
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, linked(links) ? 4 : 12);
  ctx.fill();
  ctx.fillStyle = "rgba(92, 64, 42, 0.9)";
  ctx.beginPath();
  ctx.roundRect(box.x + 3, box.y + 4, box.w - 6, box.h - 8, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(22, 18, 14, 0.55)";
  ctx.beginPath();
  ctx.roundRect(box.x + 8, box.y + box.h * 0.38, box.w - 16, Math.max(6, box.h * 0.28), 6);
  ctx.fill();
  if (!linked(links)) {
    const size = WORK_DRAW.ditch;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(atlas.works.ditch, w.x - size.w / 2, w.y - size.h / 2, size.w, size.h);
  }
  ctx.restore();
}

function drawWallBody(ctx: CanvasRenderingContext2D, w: Work, links: Links) {
  const tier = w.hasKeep ? 2 : w.wallTier;
  const box = linkedBox(w.x, w.y, links, tier === 0 ? 12 : 4, tier === 0 ? 10 : 6);
  if (tier === 0) {
    ctx.fillStyle = "#5a4634";
    const stakeW = 5;
    const start = box.x + 2;
    const count = Math.max(2, Math.floor(box.w / 9));
    for (let i = 0; i < count; i++) {
      const sx = start + (i + 0.5) * (box.w / count) - stakeW / 2;
      ctx.fillRect(sx, box.y, stakeW, box.h);
      ctx.fillStyle = "#8a6a48";
      ctx.fillRect(sx + 1, box.y, 1.5, box.h);
      ctx.fillStyle = "#5a4634";
    }
    ctx.fillStyle = "#6a5340";
    ctx.fillRect(box.x, box.y + box.h * 0.28, box.w, 3);
    ctx.fillRect(box.x, box.y + box.h * 0.62, box.w, 3);
    return;
  }
  if (tier === 1) {
    ctx.fillStyle = "#4a3828";
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, 3);
    ctx.fill();
    ctx.fillStyle = "#7a5c3c";
    const planks = Math.max(3, Math.floor(box.w / 8));
    for (let i = 0; i < planks; i++) {
      const px = box.x + i * (box.w / planks) + 1;
      ctx.fillRect(px, box.y + 2, Math.max(4, box.w / planks - 2), box.h - 4);
      ctx.fillStyle = "#5a4634";
      ctx.fillRect(px + Math.max(4, box.w / planks - 2) - 1, box.y + 2, 1, box.h - 4);
      ctx.fillStyle = "#7a5c3c";
    }
    ctx.fillStyle = "#c4b38a";
    ctx.fillRect(box.x, box.y, box.w, 3);
    return;
  }
  ctx.fillStyle = "#5c5850";
  ctx.beginPath();
  ctx.roundRect(box.x, box.y - (w.hasKeep ? 6 : 0), box.w, box.h + (w.hasKeep ? 6 : 0), 4);
  ctx.fill();
  ctx.fillStyle = "#7a7468";
  ctx.fillRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
  ctx.strokeStyle = "rgba(42, 40, 36, 0.45)";
  ctx.lineWidth = 1;
  for (let x = box.x + 10; x < box.x + box.w; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, box.y);
    ctx.lineTo(x, box.y + box.h);
    ctx.stroke();
  }
  for (let y = box.y + 10; y < box.y + box.h; y += 11) {
    ctx.beginPath();
    ctx.moveTo(box.x, y);
    ctx.lineTo(box.x + box.w, y);
    ctx.stroke();
  }
  if (!links.n) {
    ctx.fillStyle = "#c8c2b4";
    ctx.fillRect(box.x, box.y - 3, box.w, 4);
    const merlons = Math.max(2, Math.floor(box.w / 14));
    for (let i = 0; i < merlons; i++) {
      const mx = box.x + 2 + i * (box.w / merlons);
      ctx.fillStyle = "#8a8478";
      ctx.fillRect(mx, box.y - 10, Math.max(6, box.w / merlons - 6), 8);
    }
  }
}

function fakeWork(kind: "wall" | "ditch", col: number, row: number, x: number, y: number): Work {
  return {
    id: -1,
    kind,
    col,
    row,
    x,
    y,
    hp: 1,
    maxHp: 1,
    spent: 0,
    flash: 0,
    wallTier: 0,
    hasKeep: false,
    mount: null,
    cooldown: 0,
    dmgLevel: 0,
    rateLevel: 0,
    aim: 0,
  };
}

function drawPost(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = "rgba(18, 17, 16, 0.55)";
  ctx.beginPath();
  ctx.arc(x, y + 1, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#121110";
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
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
    drawDitchCell(ctx, engine, atlas, w);
  }

  const placing = engine.selectedKind !== null && engine.phase === "playing";
  if (placing) {
    ctx.fillStyle = "rgba(18, 17, 16, 0.12)";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
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
      ctx.globalAlpha = 0.7;
      if (kind === "ditch") {
        drawDitchCell(ctx, engine, atlas, fakeWork("ditch", hc, hr, x, y));
      } else {
        const ghost = fakeWork("wall", hc, hr, x, y);
        const links = workLinks(engine, hc, hr, "wall");
        if (linked(links)) drawWallBody(ctx, ghost, links);
        else {
          const size = WALL_TIERS[0]!.draw;
          ctx.drawImage(atlas.walls[0], x - size.w / 2, y - size.h + 10, size.w, size.h);
        }
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
    const hoverX = engine.hoverCol >= 0 ? (engine.hoverCol + 0.5) * CELL : selRet.homeX;
    const hoverY = engine.hoverRow >= 0 ? (engine.hoverRow + 0.5) * CELL : selRet.homeY;
    const setting = engine.patrolEdit?.id === selRet.id;
    const aX = setting && engine.patrolEdit?.step === "a" ? hoverX : selRet.homeX;
    const aY = setting && engine.patrolEdit?.step === "a" ? hoverY : selRet.homeY;
    const bX = setting && engine.patrolEdit?.step === "b" ? hoverX : selRet.hasPatrol ? selRet.patrolX : hoverX;
    const bY = setting && engine.patrolEdit?.step === "b" ? hoverY : selRet.hasPatrol ? selRet.patrolY : hoverY;
    const showLine = selRet.hasPatrol || setting || engine.selectedRetainerId === selRet.id;
    if (showLine) {
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = "rgba(232, 224, 212, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(aX, aY);
      ctx.lineTo(bX, bY);
      ctx.stroke();
      ctx.setLineDash([]);
      drawPost(ctx, aX, aY, "#c4b38a");
      drawPost(ctx, bX, bY, "#e8e0d4");
      ctx.font = "600 11px 'Source Sans 3', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#e8e0d4";
      ctx.fillText("A", aX, aY - 12);
      ctx.fillText("B", bX, bY - 12);
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
      const links = workLinks(engine, w.col, w.row, "wall");
      const connected = linked(links);
      if (w.flash > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(w.flash * 18);
      if (w.hasKeep) {
        drawWallBody(ctx, w, links);
        const size = KEEPLET_DRAW;
        ctx.drawImage(atlas.keeplet, w.x - size.w / 2, w.y - size.h + 12, size.w, size.h);
      } else if (connected) {
        drawWallBody(ctx, w, links);
        if (w.wallTier === 0) {
          const size = WALL_TIERS[0]!.draw;
          ctx.globalAlpha = (w.flash > 0 ? 0.55 + 0.45 * Math.sin(w.flash * 18) : 1) * 0.5;
          ctx.drawImage(atlas.walls[0], w.x - size.w * 0.38, w.y - size.h * 0.7 + 8, size.w * 0.76, size.h * 0.76);
          ctx.globalAlpha = w.flash > 0 ? 0.55 + 0.45 * Math.sin(w.flash * 18) : 1;
        }
      } else {
        const size = WALL_TIERS[w.wallTier]!.draw;
        ctx.drawImage(atlas.walls[w.wallTier], w.x - size.w / 2, w.y - size.h + 12, size.w, size.h);
      }
      if (w.mount) {
        const gun = TOWER_DRAW[w.mount];
        const scale = 0.62;
        const size = w.hasKeep ? KEEPLET_DRAW : WALL_TIERS[w.wallTier]!.draw;
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
        const size = w.hasKeep ? KEEPLET_DRAW : WALL_TIERS[w.wallTier]!.draw;
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
