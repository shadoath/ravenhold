export type Phase = "boot" | "menu" | "playing" | "paused" | "victory" | "defeat";

export type TowerKind = "longbow" | "ballista" | "catapult" | "warden";
export type WorkKind = "wall" | "ditch";
export type RetainerKind = "watch" | "hero";
export type BuildKind = TowerKind | WorkKind | RetainerKind;
export type EnemyKind = "raider" | "wolf" | "shield" | "warlord";
export type ProjectileKind = "arrow" | "bolt" | "stone" | "orb";
export type GearKind = "none" | "ladder" | "ram";
export type EnemyState = "move" | "attack" | "climb";
export type WallTier = 0 | 1 | 2;

export type Vec = { x: number; y: number };

export type TowerDef = {
  kind: TowerKind;
  name: string;
  blurb: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  splash: number;
  slow: number;
  armorPierce: number;
  homing: boolean;
  projectile: ProjectileKind;
};

export type WorkDef = {
  kind: WorkKind;
  name: string;
  blurb: string;
  cost: number;
  hp: number;
};

export type RetainerDef = {
  kind: RetainerKind;
  name: string;
  blurb: string;
  cost: number;
  hp: number;
  range: number;
  damage: number;
  fireRate: number;
  speed: number;
};

export type EnemyDef = {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;
  gold: number;
  lives: number;
  armor: number;
  radius: number;
  melee: number;
  animSpeed: number;
};

export type WaveEntry = {
  kind: EnemyKind;
  count: number;
  interval: number;
  delay: number;
  gear?: GearKind;
};

export type WaveSpec = {
  name: string;
  hint?: string;
  entries: WaveEntry[];
};

export type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  gold: number;
  lives: number;
  armor: number;
  radius: number;
  melee: number;
  progress: number;
  slowUntil: number;
  slowFactor: number;
  flash: number;
  anim: number;
  facing: 1 | -1;
  gear: GearKind;
  state: EnemyState;
  attackId: number;
  attackCd: number;
  alive: boolean;
};

export type Tower = {
  id: number;
  kind: TowerKind;
  col: number;
  row: number;
  x: number;
  y: number;
  cooldown: number;
  dmgLevel: number;
  rateLevel: number;
  spent: number;
  aim: number;
};

export type Work = {
  id: number;
  kind: WorkKind;
  col: number;
  row: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  spent: number;
  flash: number;
  wallTier: WallTier;
  hasKeep: boolean;
  mount: TowerKind | null;
  cooldown: number;
  dmgLevel: number;
  rateLevel: number;
  aim: number;
};

export type Retainer = {
  id: number;
  kind: RetainerKind;
  col: number;
  row: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  patrolX: number;
  patrolY: number;
  hasPatrol: boolean;
  hp: number;
  maxHp: number;
  cooldown: number;
  spent: number;
  facing: 1 | -1;
  anim: number;
  flash: number;
  aim: number;
};

export type Projectile = {
  alive: boolean;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  targetId: number;
  tx: number;
  ty: number;
  damage: number;
  splash: number;
  slow: number;
  armorPierce: number;
  homing: boolean;
  ttl: number;
  rot: number;
};

export type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

export type Floater = {
  alive: boolean;
  x: number;
  y: number;
  vx?: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
};

export type SelectedTowerInfo = {
  id: number;
  kind: TowerKind;
  name: string;
  dmgLevel: number;
  rateLevel: number;
  sellValue: number;
  dmgCost: number | null;
  rateCost: number | null;
  damage: number;
  fireRate: number;
  range: number;
  blurb: string;
};

export type SelectedWorkInfo = {
  id: number;
  kind: WorkKind;
  name: string;
  hp: number;
  maxHp: number;
  sellValue: number;
  blurb: string;
  wallTier: WallTier;
  hasKeep: boolean;
  mount: TowerKind | null;
  mountName: string | null;
  upgradeName: string | null;
  upgradeCost: number | null;
  keepCost: number | null;
  mountOptions: { kind: TowerKind; name: string; cost: number }[] | null;
  range: number | null;
  damage: number | null;
  fireRate: number | null;
  dmgLevel: number;
  rateLevel: number;
  dmgCost: number | null;
  rateCost: number | null;
};

export type SelectedRetainerInfo = {
  id: number;
  kind: RetainerKind;
  name: string;
  hp: number;
  maxHp: number;
  sellValue: number;
  blurb: string;
  hasPatrol: boolean;
};

export type HudSnapshot = {
  phase: Phase;
  gold: number;
  lives: number;
  wave: number;
  waveTotal: number;
  waveName: string;
  nextWaveName: string;
  nextWaveHint: string;
  spawning: boolean;
  enemiesAlive: number;
  remaining: number;
  towersBuilt: number;
  worksBuilt: number;
  announce: string;
  selectedKind: BuildKind | null;
  selectedTower: SelectedTowerInfo | null;
  selectedWork: SelectedWorkInfo | null;
  selectedRetainer: SelectedRetainerInfo | null;
  canStartWave: boolean;
  canAfford: Record<BuildKind, boolean>;
  muted: boolean;
  heroPlaced: boolean;
};
