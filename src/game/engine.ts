import { isMuted, setMuted, sfx } from "./audio";
import {
  BUILD_KINDS,
  DMG_UP_BONUS,
  DMG_UP_COST,
  elevatedRange,
  ENEMIES,
  ENEMY_STRIDE,
  FIXED_DT,
  HEIGHT_RANGE,
  KEEP_GATE,
  KEEPLET_COST,
  KEEPLET_HP,
  KEEPLET_PATH_COST,
  LEAK_RADIUS,
  MAX_DMG_LEVEL,
  MAX_RATE_LEVEL,
  mountCost,
  RATE_UP_BONUS,
  RATE_UP_COST,
  RETAINERS,
  SELL_RATIO,
  START_GOLD,
  START_LIVES,
  TOWER_KINDS,
  TOWERS,
  WALL_TIERS,
  WAVES,
  WORKS,
} from "./config";
import { cellDist, createField, rebuildField, sampleFlow, type FlowField } from "./flow";
import {
  CELL,
  cellWorld,
  COLS,
  gateCell,
  inMap,
  isBlockedCell,
  isBuildableCell,
  isPathCell,
  isWorkCell,
  ROWS,
  spawnPoints,
  worldToCell,
} from "./map-data";
import type {
  BuildKind,
  Enemy,
  EnemyKind,
  Floater,
  GearKind,
  HudSnapshot,
  Particle,
  Phase,
  Projectile,
  Retainer,
  RetainerKind,
  SelectedWorkInfo,
  Tower,
  TowerKind,
  WallTier,
  Work,
  WorkKind,
} from "./types";

const MAX_PARTICLES = 360;
const MAX_FLOATERS = 64;
const MAX_PROJECTILES = 120;
const DITCH_COST = 7.2;
const GRASS_COST = 1.28;
const PATH_COST = 1;
const LADDER_WALL = 4.4;
const LADDER_DITCH = 1.12;
const RAM_MELEE = 3.1;

function hypot2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function isTowerKind(kind: BuildKind): kind is TowerKind {
  return kind === "longbow" || kind === "ballista" || kind === "catapult" || kind === "warden";
}
function isWorkKind(kind: BuildKind): kind is WorkKind {
  return kind === "wall" || kind === "ditch";
}
function isRetainerKind(kind: BuildKind): kind is RetainerKind {
  return kind === "watch" || kind === "hero";
}

export class GameEngine {
  phase: Phase = "menu";
  gold = START_GOLD;
  lives = START_LIVES;
  wave = 0;
  spawning = false;
  time = 0;
  freeze = 0;
  trauma = 0;
  selectedKind: BuildKind | null = null;
  selectedTowerId: number | null = null;
  selectedWorkId: number | null = null;
  selectedRetainerId: number | null = null;
  hoverCol = -1;
  hoverRow = -1;
  reducedMotion = false;
  announce = "";
  announceT = 0;

  enemies: Enemy[] = [];
  towers: Tower[] = [];
  works: Work[] = [];
  retainers: Retainer[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];

  private nextId = 1;
  private occupied = new Map<string, number>();
  private workAt = new Map<string, number>();
  private spawnQueue: { kind: EnemyKind; at: number; gear: GearKind }[] = [];
  private spawnClock = 0;
  private flashRed = 0;
  private flowNormal = createField();
  private flowLadder = createField();
  private flowDirty = true;
  private spawnI = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }

  reset() {
    this.phase = "playing";
    this.gold = START_GOLD;
    this.lives = START_LIVES;
    this.wave = 0;
    this.spawning = false;
    this.time = 0;
    this.freeze = 0;
    this.trauma = 0;
    this.selectedKind = null;
    this.selectedTowerId = null;
    this.selectedWorkId = null;
    this.selectedRetainerId = null;
    this.announce = "";
    this.announceT = 0;
    this.enemies = [];
    this.towers = [];
    this.works = [];
    this.retainers = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.nextId = 1;
    this.occupied.clear();
    this.workAt.clear();
    this.spawnQueue = [];
    this.spawnClock = 0;
    this.flashRed = 0;
    this.flowDirty = true;
    this.spawnI = 0;
    this.rebuildFlow();
  }

  snapshot(): HudSnapshot {
    const selected = this.towers.find((t) => t.id === this.selectedTowerId) ?? null;
    const work = this.works.find((w) => w.id === this.selectedWorkId) ?? null;
    const ret = this.retainers.find((r) => r.id === this.selectedRetainerId) ?? null;
    const canAfford = {} as Record<BuildKind, boolean>;
    for (const kind of BUILD_KINDS) {
      if (isTowerKind(kind)) canAfford[kind] = this.gold >= TOWERS[kind].cost;
      else if (isWorkKind(kind)) canAfford[kind] = this.gold >= WORKS[kind].cost;
      else canAfford[kind] = this.gold >= RETAINERS[kind].cost && (kind !== "hero" || !this.retainers.some((r) => r.kind === "hero"));
    }
    const def = selected ? TOWERS[selected.kind] : null;
    const next = this.wave < WAVES.length ? WAVES[this.wave] : null;
    return {
      phase: this.phase,
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      waveTotal: WAVES.length,
      waveName: this.wave > 0 ? (WAVES[this.wave - 1]?.name ?? "") : "The field is quiet",
      nextWaveName: next?.name ?? "",
      nextWaveHint: next?.hint ?? "",
      spawning: this.spawning,
      enemiesAlive: this.enemies.length,
      remaining: this.enemies.length + this.spawnQueue.length,
      towersBuilt: this.towers.length,
      worksBuilt: this.works.length,
      announce: this.announceT > 0 ? this.announce : "",
      selectedKind: this.selectedKind,
      selectedTower:
        selected && def
          ? {
              id: selected.id,
              kind: selected.kind,
              name: def.name,
              dmgLevel: selected.dmgLevel,
              rateLevel: selected.rateLevel,
              sellValue: Math.floor(selected.spent * SELL_RATIO),
              dmgCost: selected.dmgLevel < MAX_DMG_LEVEL ? DMG_UP_COST[selected.dmgLevel]! : null,
              rateCost: selected.rateLevel < MAX_RATE_LEVEL ? RATE_UP_COST[selected.rateLevel]! : null,
              damage: Math.round(def.damage * (1 + DMG_UP_BONUS * selected.dmgLevel)),
              fireRate: def.fireRate * (1 + RATE_UP_BONUS * selected.rateLevel),
              range: def.range,
              blurb: def.blurb,
            }
          : null,
      selectedWork: work ? this.describeWork(work) : null,
      selectedRetainer: ret
        ? {
            id: ret.id,
            kind: ret.kind,
            name: RETAINERS[ret.kind].name,
            hp: Math.ceil(ret.hp),
            maxHp: ret.maxHp,
            sellValue: Math.floor(ret.spent * SELL_RATIO),
            blurb: RETAINERS[ret.kind].blurb,
            hasPatrol: ret.hasPatrol,
          }
        : null,
      canStartWave: this.phase === "playing" && !this.spawning && this.wave < WAVES.length,
      canAfford,
      muted: isMuted(),
      heroPlaced: this.retainers.some((r) => r.kind === "hero"),
    };
  }

  private describeWork(work: Work): SelectedWorkInfo {
    if (work.kind === "ditch") {
      return {
        id: work.id,
        kind: "ditch",
        name: WORKS.ditch.name,
        hp: Math.ceil(work.hp),
        maxHp: work.maxHp,
        sellValue: Math.floor(work.spent * SELL_RATIO),
        blurb: WORKS.ditch.blurb,
        wallTier: 0,
        hasKeep: false,
        mount: null,
        mountName: null,
        upgradeName: null,
        upgradeCost: null,
        keepCost: null,
        mountOptions: null,
        range: null,
        damage: null,
        fireRate: null,
        dmgLevel: 0,
        rateLevel: 0,
        dmgCost: null,
        rateCost: null,
      };
    }
    const tier = WALL_TIERS[work.wallTier]!;
    const next = !work.hasKeep && work.wallTier < 2 ? WALL_TIERS[work.wallTier + 1] : null;
    const mountDef = work.mount ? TOWERS[work.mount] : null;
    return {
      id: work.id,
      kind: "wall",
      name: work.hasKeep ? (work.mount ? `${TOWERS[work.mount].name} keep` : "Tower") : tier.name,
      hp: Math.ceil(work.hp),
      maxHp: work.maxHp,
      sellValue: Math.floor(work.spent * SELL_RATIO),
      blurb: work.hasKeep
        ? work.mount
          ? `Height. Range ${elevatedRange(work.mount)}.`
          : "Empty battlement. Mount a defense for the extra range."
        : tier.blurb,
      wallTier: work.wallTier,
      hasKeep: work.hasKeep,
      mount: work.mount,
      mountName: mountDef?.name ?? null,
      upgradeName: next?.name ?? null,
      upgradeCost: next?.upgradeCost ?? null,
      keepCost: work.wallTier === 2 && !work.hasKeep ? KEEPLET_COST : null,
      mountOptions:
        work.hasKeep && !work.mount
          ? TOWER_KINDS.map((kind) => ({ kind, name: TOWERS[kind].name, cost: mountCost(kind) }))
          : null,
      range: work.mount ? elevatedRange(work.mount) : null,
      damage: mountDef ? Math.round(mountDef.damage * (1 + DMG_UP_BONUS * work.dmgLevel)) : null,
      fireRate: mountDef ? mountDef.fireRate * (1 + RATE_UP_BONUS * work.rateLevel) : null,
      dmgLevel: work.dmgLevel,
      rateLevel: work.rateLevel,
      dmgCost: work.mount && work.dmgLevel < MAX_DMG_LEVEL ? DMG_UP_COST[work.dmgLevel]! : null,
      rateCost: work.mount && work.rateLevel < MAX_RATE_LEVEL ? RATE_UP_COST[work.rateLevel]! : null,
    };
  }

  toggleMute() {
    setMuted(!isMuted());
  }

  selectKind(kind: BuildKind | null) {
    if (this.phase !== "playing" && this.phase !== "paused") return;
    this.selectedKind = this.selectedKind === kind ? null : kind;
    if (this.selectedKind) {
      this.selectedTowerId = null;
      this.selectedWorkId = null;
      this.selectedRetainerId = null;
    }
    sfx.ui();
  }

  hover(x: number, y: number) {
    if (x < 0 || y < 0 || x >= COLS * CELL || y >= ROWS * CELL) {
      this.hoverCol = -1;
      this.hoverRow = -1;
      return;
    }
    const { c, r } = worldToCell(x, y);
    this.hoverCol = c;
    this.hoverRow = r;
  }

  tap(x: number, y: number) {
    if (this.phase !== "playing") return;
    const { c, r } = worldToCell(x, y);
    const occ = this.occupied.get(`${c},${r}`);
    if (occ) {
      const work = this.works.find((w) => w.id === occ);
      if (work && this.selectedKind && isTowerKind(this.selectedKind) && work.hasKeep && !work.mount) {
        this.selectedWorkId = work.id;
        this.selectedTowerId = null;
        this.selectedRetainerId = null;
        this.mountDefense(this.selectedKind);
        this.selectedKind = null;
        return;
      }
      this.pickOccupied(occ);
      this.selectedKind = null;
      sfx.ui();
      return;
    }
    if (this.selectedKind) {
      this.tryPlace(c, r, this.selectedKind);
      return;
    }
    const hero = this.retainers.find((h) => h.id === this.selectedRetainerId && h.kind === "hero");
    if (hero && isWorkCell(c, r)) {
      const pos = cellWorld(c, r);
      hero.patrolX = pos.x;
      hero.patrolY = pos.y;
      hero.hasPatrol = true;
      this.float(pos.x, pos.y - 18, "Patrol", "#e8e0d4");
      sfx.ui();
      return;
    }
    this.selectedTowerId = null;
    this.selectedWorkId = null;
    this.selectedRetainerId = null;
  }

  canPlace(c: number, r: number, kind: BuildKind) {
    if (this.occupied.has(`${c},${r}`)) return false;
    if (isTowerKind(kind) || isRetainerKind(kind)) return isBuildableCell(c, r);
    return isWorkCell(c, r);
  }

  private pickOccupied(id: number) {
    if (this.towers.some((t) => t.id === id)) {
      this.selectedTowerId = id;
      this.selectedWorkId = null;
      this.selectedRetainerId = null;
      return;
    }
    if (this.works.some((w) => w.id === id)) {
      this.selectedWorkId = id;
      this.selectedTowerId = null;
      this.selectedRetainerId = null;
      return;
    }
    this.selectedRetainerId = id;
    this.selectedTowerId = null;
    this.selectedWorkId = null;
  }

  tryPlace(c: number, r: number, kind: BuildKind) {
    if (!this.canPlace(c, r, kind)) {
      sfx.deny();
      return false;
    }
    if (isTowerKind(kind)) return this.placeTower(c, r, kind);
    if (isWorkKind(kind)) return this.placeWork(c, r, kind);
    return this.placeRetainer(c, r, kind);
  }

  private placeTower(c: number, r: number, kind: TowerKind) {
    const def = TOWERS[kind];
    if (this.gold < def.cost) {
      sfx.deny();
      return false;
    }
    this.gold -= def.cost;
    const pos = cellWorld(c, r);
    const tower: Tower = {
      id: this.nextId++,
      kind,
      col: c,
      row: r,
      x: pos.x,
      y: pos.y,
      cooldown: 0.25,
      dmgLevel: 0,
      rateLevel: 0,
      spent: def.cost,
      aim: 0,
    };
    this.towers.push(tower);
    this.occupied.set(`${c},${r}`, tower.id);
    this.selectedTowerId = tower.id;
    this.selectedKind = null;
    this.burst(pos.x, pos.y, 10, "#c8c2b4");
    sfx.place();
    return true;
  }

  private placeWork(c: number, r: number, kind: WorkKind) {
    const def = WORKS[kind];
    if (this.gold < def.cost) {
      sfx.deny();
      return false;
    }
    this.gold -= def.cost;
    const pos = cellWorld(c, r);
    const work: Work = {
      id: this.nextId++,
      kind,
      col: c,
      row: r,
      x: pos.x,
      y: pos.y,
      hp: def.hp,
      maxHp: def.hp,
      spent: def.cost,
      flash: 0,
      wallTier: 0,
      hasKeep: false,
      mount: null,
      cooldown: 0.2,
      dmgLevel: 0,
      rateLevel: 0,
      aim: 0,
    };
    this.works.push(work);
    this.occupied.set(`${c},${r}`, work.id);
    this.workAt.set(`${c},${r}`, work.id);
    this.selectedWorkId = work.id;
    this.flowDirty = true;
    this.burst(pos.x, pos.y, 8, kind === "ditch" ? "#6a5340" : "#c8c2b4");
    sfx.place();
    return true;
  }

  private placeRetainer(c: number, r: number, kind: RetainerKind) {
    const def = RETAINERS[kind];
    if (kind === "hero" && this.retainers.some((x) => x.kind === "hero")) {
      sfx.deny();
      return false;
    }
    if (this.gold < def.cost) {
      sfx.deny();
      return false;
    }
    this.gold -= def.cost;
    const pos = cellWorld(c, r);
    const ret: Retainer = {
      id: this.nextId++,
      kind,
      col: c,
      row: r,
      x: pos.x,
      y: pos.y,
      homeX: pos.x,
      homeY: pos.y,
      patrolX: pos.x,
      patrolY: pos.y,
      hasPatrol: false,
      hp: def.hp,
      maxHp: def.hp,
      cooldown: 0.2,
      spent: def.cost,
      facing: 1,
      anim: Math.random() * 4,
      flash: 0,
      aim: 0,
    };
    this.retainers.push(ret);
    this.occupied.set(`${c},${r}`, ret.id);
    this.selectedRetainerId = ret.id;
    this.selectedKind = null;
    this.flowDirty = true;
    this.burst(pos.x, pos.y, 10, "#c4b38a");
    sfx.place();
    return true;
  }

  upgradeDamage() {
    const mounted = this.works.find((w) => w.id === this.selectedWorkId && w.mount);
    if (mounted) {
      this.upgradeMounted(mounted, "dmg");
      return;
    }
    const t = this.towers.find((x) => x.id === this.selectedTowerId);
    if (!t || t.dmgLevel >= MAX_DMG_LEVEL) return;
    const cost = DMG_UP_COST[t.dmgLevel]!;
    if (this.gold < cost) {
      sfx.deny();
      return;
    }
    this.gold -= cost;
    t.spent += cost;
    t.dmgLevel += 1;
    this.float(t.x, t.y - 28, "Damage up", "#e8e0d4");
    sfx.upgrade();
  }

  upgradeRate() {
    const mounted = this.works.find((w) => w.id === this.selectedWorkId && w.mount);
    if (mounted) {
      this.upgradeMounted(mounted, "rate");
      return;
    }
    const t = this.towers.find((x) => x.id === this.selectedTowerId);
    if (!t || t.rateLevel >= MAX_RATE_LEVEL) return;
    const cost = RATE_UP_COST[t.rateLevel]!;
    if (this.gold < cost) {
      sfx.deny();
      return;
    }
    this.gold -= cost;
    t.spent += cost;
    t.rateLevel += 1;
    this.float(t.x, t.y - 28, "Rate up", "#e8e0d4");
    sfx.upgrade();
  }

  private upgradeMounted(w: Work, which: "dmg" | "rate") {
    if (which === "dmg") {
      if (w.dmgLevel >= MAX_DMG_LEVEL) return;
      const cost = DMG_UP_COST[w.dmgLevel]!;
      if (this.gold < cost) {
        sfx.deny();
        return;
      }
      this.gold -= cost;
      w.spent += cost;
      w.dmgLevel += 1;
      this.float(w.x, w.y - 36, "Damage up", "#e8e0d4");
    } else {
      if (w.rateLevel >= MAX_RATE_LEVEL) return;
      const cost = RATE_UP_COST[w.rateLevel]!;
      if (this.gold < cost) {
        sfx.deny();
        return;
      }
      this.gold -= cost;
      w.spent += cost;
      w.rateLevel += 1;
      this.float(w.x, w.y - 36, "Rate up", "#e8e0d4");
    }
    sfx.upgrade();
  }

  upgradeWall() {
    const w = this.works.find((x) => x.id === this.selectedWorkId);
    if (!w || w.kind !== "wall" || w.hasKeep || w.wallTier >= 2) {
      sfx.deny();
      return;
    }
    const next = WALL_TIERS[w.wallTier + 1]!;
    if (this.gold < next.upgradeCost) {
      sfx.deny();
      return;
    }
    this.gold -= next.upgradeCost;
    w.spent += next.upgradeCost;
    w.wallTier = (w.wallTier + 1) as WallTier;
    w.maxHp = next.hp;
    w.hp = next.hp;
    this.flowDirty = true;
    this.float(w.x, w.y - 28, next.name, "#e8e0d4");
    this.burst(w.x, w.y, 10, "#c8c2b4");
    sfx.upgrade();
  }

  raiseKeep() {
    const w = this.works.find((x) => x.id === this.selectedWorkId);
    if (!w || w.kind !== "wall" || w.wallTier < 2 || w.hasKeep) {
      sfx.deny();
      return;
    }
    if (this.gold < KEEPLET_COST) {
      sfx.deny();
      return;
    }
    this.gold -= KEEPLET_COST;
    w.spent += KEEPLET_COST;
    w.hasKeep = true;
    w.maxHp = KEEPLET_HP;
    w.hp = KEEPLET_HP;
    this.flowDirty = true;
    this.float(w.x, w.y - 36, "Tower raised", "#e8e0d4");
    this.burst(w.x, w.y - 20, 14, "#c8c2b4");
    sfx.upgrade();
  }

  mountDefense(kind: TowerKind) {
    const w = this.works.find((x) => x.id === this.selectedWorkId);
    if (!w || w.kind !== "wall" || !w.hasKeep || w.mount) {
      sfx.deny();
      return;
    }
    const cost = mountCost(kind);
    if (this.gold < cost) {
      sfx.deny();
      return;
    }
    this.gold -= cost;
    w.spent += cost;
    w.mount = kind;
    w.cooldown = 0.25;
    this.float(w.x, w.y - 40, TOWERS[kind].name, "#e8e0d4");
    this.burst(w.x, w.y - 28, 12, "#c4b38a");
    sfx.place();
  }

  sellSelected() {
    if (this.selectedTowerId) {
      const idx = this.towers.findIndex((x) => x.id === this.selectedTowerId);
      if (idx < 0) return;
      const t = this.towers[idx]!;
      this.refund(t.x, t.y, t.col, t.row, t.spent);
      this.towers.splice(idx, 1);
      this.selectedTowerId = null;
      return;
    }
    if (this.selectedWorkId) {
      const idx = this.works.findIndex((x) => x.id === this.selectedWorkId);
      if (idx < 0) return;
      const w = this.works[idx]!;
      this.refund(w.x, w.y, w.col, w.row, w.spent);
      this.workAt.delete(`${w.col},${w.row}`);
      this.works.splice(idx, 1);
      this.selectedWorkId = null;
      this.flowDirty = true;
      return;
    }
    if (this.selectedRetainerId) {
      const idx = this.retainers.findIndex((x) => x.id === this.selectedRetainerId);
      if (idx < 0) return;
      const r = this.retainers[idx]!;
      this.refund(r.x, r.y, r.col, r.row, r.spent);
      this.retainers.splice(idx, 1);
      this.selectedRetainerId = null;
      this.flowDirty = true;
    }
  }

  private refund(x: number, y: number, col: number, row: number, spent: number) {
    const gold = Math.floor(spent * SELL_RATIO);
    this.gold += gold;
    this.occupied.delete(`${col},${row}`);
    this.float(x, y - 20, `+${gold}`, "#c4b38a");
    this.burst(x, y, 8, "#9a9286");
    sfx.sell();
  }

  startWave() {
    if (this.phase !== "playing") return;
    if (this.spawning || this.wave >= WAVES.length) return;
    const spec = WAVES[this.wave]!;
    this.wave += 1;
    this.spawning = true;
    this.spawnClock = 0;
    this.spawnQueue = [];
    for (const entry of spec.entries) {
      let t = entry.delay;
      for (let i = 0; i < entry.count; i++) {
        this.spawnQueue.push({ kind: entry.kind, at: t, gear: entry.gear ?? "none" });
        t += entry.interval;
      }
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    this.announce = spec.hint ? `${spec.name} — ${spec.hint}` : spec.name;
    this.announceT = 2.5;
    sfx.wave();
  }

  pauseToggle() {
    if (this.phase === "playing") this.phase = "paused";
    else if (this.phase === "paused") this.phase = "playing";
  }

  step(dt: number) {
    const capped = Math.min(dt, 0.1);
    if (this.phase !== "playing") {
      this.stepFx(capped);
      return;
    }
    this.time += capped;
    this.trauma = Math.max(0, this.trauma - capped * 1.85);
    this.flashRed = Math.max(0, this.flashRed - capped * 2.4);
    this.announceT = Math.max(0, this.announceT - capped);
    if (this.flowDirty) this.rebuildFlow();
    if (this.freeze > 0) {
      this.freeze -= capped;
      this.stepFx(capped);
      return;
    }
    let acc = capped;
    while (acc > 0) {
      const slice = Math.min(FIXED_DT, acc);
      this.stepSpawns(slice);
      this.stepEnemies(slice);
      this.stepRetainers(slice);
      this.stepTowers(slice);
      this.stepProjectiles(slice);
      acc -= slice;
    }
    this.stepFx(capped);
    this.checkEnd();
  }

  shakeAmount() {
    if (this.reducedMotion) return 0;
    return this.trauma * this.trauma;
  }

  leakFlash() {
    return this.flashRed;
  }

  private tileCost(kind: "normal" | "ladder", c: number, r: number) {
    if (!inMap(c, r)) return Infinity;
    if (isBlockedCell(c, r)) return Infinity;
    const wid = this.workAt.get(`${c},${r}`);
    if (wid) {
      const w = this.works.find((x) => x.id === wid);
      if (w?.kind === "wall") return kind === "ladder" ? LADDER_WALL : w.hasKeep ? KEEPLET_PATH_COST : WALL_TIERS[w.wallTier]!.pathCost;
      if (w?.kind === "ditch") return kind === "ladder" ? LADDER_DITCH : DITCH_COST;
    }
    if (this.retainers.some((ret) => ret.col === c && ret.row === r)) return GRASS_COST + 2.2;
    if (isPathCell(c, r)) return PATH_COST;
    return GRASS_COST;
  }

  private rebuildFlow() {
    const gate = gateCell();
    rebuildField(this.flowNormal, (c, r) => this.tileCost("normal", c, r), gate.c, gate.r);
    rebuildField(this.flowLadder, (c, r) => this.tileCost("ladder", c, r), gate.c, gate.r);
    this.flowDirty = false;
  }

  private fieldFor(e: Enemy): FlowField {
    return e.gear === "ladder" ? this.flowLadder : this.flowNormal;
  }

  private workOn(c: number, r: number) {
    const id = this.workAt.get(`${c},${r}`);
    if (!id) return null;
    return this.works.find((w) => w.id === id) ?? null;
  }

  private stepSpawns(dt: number) {
    if (!this.spawning) return;
    this.spawnClock += dt;
    while (this.spawnQueue.length && this.spawnQueue[0]!.at <= this.spawnClock) {
      const next = this.spawnQueue.shift()!;
      this.spawnEnemy(next.kind, next.gear);
    }
    if (this.spawnQueue.length === 0) this.spawning = false;
  }

  private spawnEnemy(kind: EnemyKind, gear: GearKind) {
    const def = ENEMIES[kind];
    const spots = spawnPoints();
    const spot = spots[this.spawnI++ % spots.length] ?? { x: 8, y: 448 };
    const jitter = ((this.nextId % 7) - 3) * 7;
    this.enemies.push({
      id: this.nextId++,
      kind,
      x: spot.x - 18,
      y: spot.y + jitter,
      vx: 0,
      vy: 0,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      gold: def.gold,
      lives: def.lives,
      armor: def.armor,
      radius: def.radius,
      melee: def.melee,
      progress: 0,
      slowUntil: 0,
      slowFactor: 1,
      flash: 0,
      anim: Math.random() * 4,
      facing: 1,
      gear,
      state: "move",
      attackId: 0,
      attackCd: 0,
      alive: true,
    });
  }

  private stepEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      e.flash = Math.max(0, e.flash - dt * 6);
      e.attackCd = Math.max(0, e.attackCd - dt);
      if (hypot2(e.x, e.y, KEEP_GATE.x, KEEP_GATE.y) < LEAK_RADIUS * LEAK_RADIUS) {
        this.leak(e);
        this.enemies.splice(i, 1);
        continue;
      }

      const field = this.fieldFor(e);
      const flow = sampleFlow(field, e.x, e.y);
      e.progress = 4000 - (Number.isFinite(flow.dist) ? flow.dist : 4000);
      const { c, r } = worldToCell(e.x, e.y);
      const here = this.workOn(c, r);
      const look = worldToCell(e.x + flow.x * 22, e.y + flow.y * 22);
      const ahead = this.workOn(look.c, look.r);

      if (e.gear !== "ladder" && ahead?.kind === "wall") {
        e.state = "attack";
        this.meleeWork(e, ahead);
        e.vx = 0;
        e.vy = 0;
        continue;
      }
      if (e.gear !== "ladder" && here?.kind === "wall") {
        e.state = "attack";
        this.meleeWork(e, here);
        e.vx = 0;
        e.vy = 0;
        continue;
      }

      e.state = here?.kind === "wall" && e.gear === "ladder" ? "climb" : "move";
      let speed = e.speed * (this.time < e.slowUntil ? e.slowFactor : 1);
      if (here?.kind === "ditch" && e.gear !== "ladder") speed *= 0.38;
      if (e.state === "climb") speed *= 0.34;

      let sx = 0;
      let sy = 0;
      for (const o of this.enemies) {
        if (o.id === e.id) continue;
        const d2 = hypot2(e.x, e.y, o.x, o.y);
        if (d2 > 26 * 26 || d2 < 0.01) continue;
        const d = Math.sqrt(d2);
        sx += ((e.x - o.x) / d) * (26 - d);
        sy += ((e.y - o.y) / d) * (26 - d);
      }
      for (const ret of this.retainers) {
        const d2 = hypot2(e.x, e.y, ret.x, ret.y);
        if (d2 > 28 * 28 || d2 < 0.01) continue;
        const d = Math.sqrt(d2);
        sx += ((e.x - ret.x) / d) * (28 - d) * 1.4;
        sy += ((e.y - ret.y) / d) * (28 - d) * 1.4;
      }

      let dx = flow.x * 1.15 + sx * 0.045;
      let dy = flow.y * 1.15 + sy * 0.045;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const step = speed * dt;
      const nx = e.x + dx * step;
      const ny = e.y + dy * step;
      const nextCell = worldToCell(nx, ny);
      const nextWork = this.workOn(nextCell.c, nextCell.r);
      if (nextWork?.kind === "wall" && e.gear !== "ladder") {
        e.state = "attack";
        this.meleeWork(e, nextWork);
        e.vx = 0;
        e.vy = 0;
        continue;
      }
      if (isBlockedCell(nextCell.c, nextCell.r) && hypot2(nx, ny, KEEP_GATE.x, KEEP_GATE.y) > LEAK_RADIUS * LEAK_RADIUS) {
        const sx = e.x + dx * step;
        const sc = worldToCell(sx, e.y);
        if (!isBlockedCell(sc.c, sc.r) || hypot2(sx, e.y, KEEP_GATE.x, KEEP_GATE.y) <= LEAK_RADIUS * LEAK_RADIUS) {
          e.x = sx;
          e.vx = dx * speed;
          e.vy = 0;
        } else {
          const ty = e.y + dy * step;
          const tc = worldToCell(e.x, ty);
          if (!isBlockedCell(tc.c, tc.r) || hypot2(e.x, ty, KEEP_GATE.x, KEEP_GATE.y) <= LEAK_RADIUS * LEAK_RADIUS) {
            e.y = ty;
            e.vx = 0;
            e.vy = dy * speed;
          } else {
            e.vx = 0;
            e.vy = 0;
          }
        }
        continue;
      }
      e.x = nx;
      e.y = ny;
      e.vx = dx * speed;
      e.vy = dy * speed;
      if (dx < -0.12) e.facing = -1;
      else if (dx > 0.12) e.facing = 1;
      const before = e.anim;
      e.anim += step / ENEMY_STRIDE[e.kind];
      if (Math.floor(e.anim) !== Math.floor(before) && Math.floor(e.anim) % 2 === 0) {
        this.dust(e.x - e.facing * 6, e.y + 5, e.facing);
      }
    }
  }

  private meleeWork(e: Enemy, work: Work) {
    if (e.attackCd > 0) return;
    e.attackCd = e.kind === "warlord" ? 0.55 : 0.72;
    const mul = e.gear === "ram" ? RAM_MELEE : 1;
    const dmg = e.melee * mul;
    work.hp -= dmg;
    work.flash = 1;
    e.flash = 0.4;
    this.burst(work.x, work.y - 8, 6, "#c8c2b4");
    sfx.hit();
    if (work.hp <= 0) this.breakWork(work);
  }

  private breakWork(work: Work) {
    const idx = this.works.findIndex((w) => w.id === work.id);
    if (idx < 0) return;
    this.works.splice(idx, 1);
    this.occupied.delete(`${work.col},${work.row}`);
    this.workAt.delete(`${work.col},${work.row}`);
    if (this.selectedWorkId === work.id) this.selectedWorkId = null;
    this.flowDirty = true;
    this.burst(work.x, work.y, 16, "#8a8478");
    this.float(work.x, work.y - 16, "Breach", "#a94a42");
    this.trauma = Math.min(1, this.trauma + 0.22);
    sfx.death();
  }

  private leak(e: Enemy) {
    this.lives = Math.max(0, this.lives - e.lives);
    this.trauma = Math.min(1, this.trauma + (e.kind === "warlord" ? 0.85 : 0.42));
    this.flashRed = 1;
    this.freeze = e.kind === "warlord" ? 0.14 : 0.06;
    this.burst(KEEP_GATE.x, KEEP_GATE.y, e.kind === "warlord" ? 22 : 12, "#a94a42");
    sfx.leak();
    if (this.lives <= 0) {
      this.phase = "defeat";
      sfx.lose();
    }
  }

  private stepRetainers(dt: number) {
    for (let i = this.retainers.length - 1; i >= 0; i--) {
      const ret = this.retainers[i]!;
      ret.flash = Math.max(0, ret.flash - dt * 6);
      ret.cooldown = Math.max(0, ret.cooldown - dt);
      const def = RETAINERS[ret.kind];
      let best: Enemy | null = null;
      let bestD = def.range * def.range;
      for (const e of this.enemies) {
        const d = hypot2(ret.x, ret.y, e.x, e.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (best) {
        ret.aim = Math.atan2(best.y - ret.y, best.x - ret.x);
        if (best.x < ret.x - 4) ret.facing = -1;
        else if (best.x > ret.x + 4) ret.facing = 1;
        if (ret.cooldown <= 0) {
          ret.cooldown = 1 / def.fireRate;
          const pierce = 0.15;
          const dmg = Math.max(1, def.damage * (1 - best.armor * (1 - pierce)));
          best.hp -= dmg;
          best.flash = 1;
          this.float(best.x, best.y - 22, `${Math.round(dmg)}`, "#e8e0d4");
          this.burst(best.x, best.y, 6, "#c4b38a");
          sfx.hit();
          this.sweepDead();
        }
        continue;
      }
      let tx = ret.homeX;
      let ty = ret.homeY;
      if (ret.kind === "watch") {
        const ang = this.time * 0.85 + ret.id;
        tx = ret.homeX + Math.cos(ang) * 30;
        ty = ret.homeY + Math.sin(ang) * 18;
      } else if (ret.hasPatrol) {
        const cycle = (this.time * 0.22 + ret.id * 0.1) % 2;
        const t = cycle < 1 ? cycle : 2 - cycle;
        tx = ret.homeX + (ret.patrolX - ret.homeX) * t;
        ty = ret.homeY + (ret.patrolY - ret.homeY) * t;
      }
      const dx = tx - ret.x;
      const dy = ty - ret.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const step = Math.min(def.speed * dt, dist);
        ret.x += (dx / dist) * step;
        ret.y += (dy / dist) * step;
        if (dx < -2) ret.facing = -1;
        else if (dx > 2) ret.facing = 1;
        ret.anim += step / 14;
      }
    }
  }

  private stepTowers(dt: number) {
    for (const t of this.towers) {
      t.cooldown = Math.max(0, t.cooldown - dt);
      const def = TOWERS[t.kind];
      const range2 = def.range * def.range;
      let best: Enemy | null = null;
      let bestProg = -1;
      for (const e of this.enemies) {
        if (hypot2(t.x, t.y, e.x, e.y) > range2) continue;
        if (e.progress > bestProg) {
          bestProg = e.progress;
          best = e;
        }
      }
      if (!best) continue;
      t.aim = Math.atan2(best.y - t.y, best.x - t.x);
      if (t.cooldown > 0) continue;
      const rate = def.fireRate * (1 + RATE_UP_BONUS * t.rateLevel);
      t.cooldown = 1 / rate;
      const dmg = def.damage * (1 + DMG_UP_BONUS * t.dmgLevel);
      this.fireFrom(t.x, t.y, 18, best, dmg, def);
    }
    for (const w of this.works) {
      if (!w.mount) continue;
      w.cooldown = Math.max(0, w.cooldown - dt);
      const def = TOWERS[w.mount];
      const range = def.range * HEIGHT_RANGE;
      const range2 = range * range;
      let best: Enemy | null = null;
      let bestProg = -1;
      for (const e of this.enemies) {
        if (hypot2(w.x, w.y, e.x, e.y) > range2) continue;
        if (e.progress > bestProg) {
          bestProg = e.progress;
          best = e;
        }
      }
      if (!best) continue;
      w.aim = Math.atan2(best.y - w.y, best.x - w.x);
      if (w.cooldown > 0) continue;
      const rate = def.fireRate * (1 + RATE_UP_BONUS * w.rateLevel);
      w.cooldown = 1 / rate;
      const dmg = def.damage * (1 + DMG_UP_BONUS * w.dmgLevel);
      this.fireFrom(w.x, w.y, 42, best, dmg, def);
    }
  }

  private fireFrom(x: number, y: number, muzzle: number, target: Enemy, damage: number, def: (typeof TOWERS)[TowerKind]) {
    if (this.projectiles.length >= MAX_PROJECTILES) {
      const idx = this.projectiles.findIndex((p) => !p.alive);
      if (idx >= 0) this.projectiles.splice(idx, 1);
      else this.projectiles.shift();
    }
    let tx = target.x;
    let ty = target.y;
    if (!def.homing) {
      const dist = Math.hypot(target.x - x, target.y - y);
      const eta = dist / def.projectileSpeed;
      tx = target.x + target.vx * eta;
      ty = target.y + target.vy * eta;
    }
    const ang = Math.atan2(ty - y, tx - x);
    this.projectiles.push({
      alive: true,
      kind: def.projectile,
      x: x,
      y: y - muzzle,
      vx: Math.cos(ang) * def.projectileSpeed,
      vy: Math.sin(ang) * def.projectileSpeed,
      speed: def.projectileSpeed,
      targetId: target.id,
      tx,
      ty,
      damage,
      splash: def.splash,
      slow: def.slow,
      armorPierce: def.armorPierce,
      homing: def.homing,
      ttl: 2.4,
      rot: ang,
    });
    if (def.projectile === "arrow") sfx.arrow();
    else if (def.projectile === "bolt") sfx.bolt();
    else if (def.projectile === "stone") sfx.stone();
    else sfx.orb();
  }

  private stepProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      p.ttl -= dt;
      if (p.ttl <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.homing) {
        const target = this.enemies.find((e) => e.id === p.targetId);
        if (target) {
          p.tx = target.x;
          p.ty = target.y;
        }
        const ang = Math.atan2(p.ty - p.y, p.tx - p.x);
        p.vx = Math.cos(ang) * p.speed;
        p.vy = Math.sin(ang) * p.speed;
        p.rot = ang;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const hitR = p.kind === "stone" ? 18 : 12;
      let hit: Enemy | null = null;
      if (p.homing) {
        hit = this.enemies.find((e) => e.id === p.targetId) ?? null;
        if (hit && hypot2(p.x, p.y, hit.x, hit.y) > (hit.radius + hitR) * (hit.radius + hitR)) hit = null;
      }
      if (!hit) {
        let bestD = hitR * hitR * 4;
        for (const e of this.enemies) {
          const d = hypot2(p.x, p.y, e.x, e.y);
          if (d < (e.radius + hitR) * (e.radius + hitR) && d < bestD) {
            bestD = d;
            hit = e;
          }
        }
      }
      if (!hit && hypot2(p.x, p.y, p.tx, p.ty) < 16 * 16 && !p.homing) {
        this.impact(p, null);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (hit) {
        this.impact(p, hit);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private impact(p: Projectile, direct: Enemy | null) {
    const color = p.kind === "orb" ? "#7a9a88" : "#c8c2b4";
    this.burst(p.x, p.y, p.splash > 0 ? 18 : 8, color);
    sfx.hit();
    const apply = (e: Enemy, scale: number) => {
      const pierce = p.armorPierce;
      const resisted = e.armor * (1 - pierce);
      const dmg = Math.max(1, p.damage * scale * (1 - resisted));
      e.hp -= dmg;
      e.flash = 1;
      if (p.slow > 0) {
        e.slowUntil = this.time + 1.65;
        e.slowFactor = 1 - p.slow;
      }
      this.float(e.x, e.y - 24, `${Math.round(dmg)}`, p.kind === "orb" ? "#9db8a8" : "#e8e0d4");
    };
    if (p.splash > 0) {
      const r2 = p.splash * p.splash;
      for (const e of this.enemies) {
        const d2 = hypot2(p.x, p.y, e.x, e.y);
        if (d2 <= r2) apply(e, 1);
      }
      this.trauma = Math.min(1, this.trauma + 0.18);
    } else if (direct) {
      apply(direct, 1);
    }
    this.sweepDead();
  }

  private sweepDead() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i]!.hp <= 0) this.killAt(i);
    }
  }

  private killAt(idx: number) {
    const e = this.enemies[idx];
    if (!e) return;
    this.enemies.splice(idx, 1);
    this.gold += e.gold;
    this.float(e.x, e.y - 10, `+${e.gold}`, "#c4b38a");
    this.burst(e.x, e.y, e.kind === "warlord" ? 28 : 14, "#8a8478");
    sfx.death();
    sfx.coin();
    if (e.kind === "warlord") {
      this.trauma = Math.min(1, this.trauma + 0.7);
      this.freeze = 0.12;
    }
  }

  private stepFx(dt: number) {
    for (const w of this.works) w.flash = Math.max(0, w.flash - dt * 4);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i]!;
      f.life -= dt;
      f.y += f.vy * dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
  }

  private checkEnd() {
    if (this.phase !== "playing") return;
    if (this.lives <= 0) {
      this.phase = "defeat";
      return;
    }
    if (this.wave >= WAVES.length && !this.spawning && this.enemies.length === 0) {
      this.phase = "victory";
      sfx.win();
    }
  }

  private dust(x: number, y: number, facing: 1 | -1) {
    for (let i = 0; i < 3; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      this.particles.push({
        alive: true,
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 3,
        vx: -facing * (12 + Math.random() * 22) + (Math.random() - 0.5) * 10,
        vy: -8 - Math.random() * 16,
        life: 0.22 + Math.random() * 0.2,
        maxLife: 0.4,
        size: 1.6 + Math.random() * 2.2,
        color: "rgba(168, 154, 122, 0.7)",
      });
    }
  }

  private burst(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const ang = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      this.particles.push({
        alive: true,
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 30,
        life: 0.28 + Math.random() * 0.35,
        maxLife: 0.55,
        size: 1.4 + Math.random() * 2.4,
        color,
      });
    }
  }

  private float(x: number, y: number, text: string, color: string) {
    if (this.floaters.length >= MAX_FLOATERS) this.floaters.shift();
    this.floaters.push({
      alive: true,
      x,
      y,
      vy: -28,
      life: 0.7,
      maxLife: 0.7,
      text,
      color,
    });
  }
}
