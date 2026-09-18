import type { EnemyKind, RetainerKind, TowerKind, WallTier, WorkKind } from "./types";

export type Atlas = {
  map: HTMLImageElement;
  keep: HTMLImageElement;
  towers: Record<TowerKind, HTMLImageElement>;
  enemies: Record<EnemyKind, HTMLImageElement[]>;
  works: Record<WorkKind, HTMLImageElement>;
  walls: Record<WallTier, HTMLImageElement>;
  keeplet: HTMLImageElement;
  retainers: Record<RetainerKind, HTMLImageElement[]>;
  arrow: HTMLImageElement;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function loadFrames(prefix: string, count: number) {
  return Promise.all(Array.from({ length: count }, (_, i) => loadImage(`${prefix}-${i + 1}.png`)));
}

export async function loadAtlas(): Promise<Atlas> {
  const [
    map,
    keep,
    longbow,
    ballista,
    catapult,
    warden,
    arrow,
    wallStake,
    wallWood,
    wallStone,
    wallKeep,
    ditch,
    raider,
    wolf,
    shield,
    warlord,
    watch,
    hero,
  ] = await Promise.all([
    loadImage("/game/map.jpg"),
    loadImage("/game/keep.png"),
    loadImage("/game/tower-longbow.png"),
    loadImage("/game/tower-ballista.png"),
    loadImage("/game/tower-catapult.png"),
    loadImage("/game/tower-warden.png"),
    loadImage("/game/arrow.png"),
    loadImage("/game/wall-stake.png"),
    loadImage("/game/wall-wood.png"),
    loadImage("/game/wall-stone.png"),
    loadImage("/game/wall-keep.png"),
    loadImage("/game/ditch.png"),
    loadFrames("/game/raider", 4),
    loadFrames("/game/wolf", 4),
    loadFrames("/game/shield", 4),
    loadFrames("/game/warlord", 4),
    loadFrames("/game/watch", 4),
    loadFrames("/game/hero", 4),
  ]);

  return {
    map,
    keep,
    arrow,
    towers: { longbow, ballista, catapult, warden },
    enemies: { raider, wolf, shield, warlord },
    works: { wall: wallStake, ditch },
    walls: { 0: wallStake, 1: wallWood, 2: wallStone },
    keeplet: wallKeep,
    retainers: { watch, hero },
  };
}
