import type { ReactNode } from "react";
import { Coins, Heart, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { RETAINERS, RETAINER_KINDS, TOWER_KINDS, TOWERS, WORKS, WORK_KINDS } from "@/game/config";
import type { BuildKind, HudSnapshot, TowerKind } from "@/game/types";
import { cn } from "@/lib/utils";

type Props = {
  snap: HudSnapshot;
  onSelectKind: (kind: BuildKind) => void;
  onStartWave: () => void;
  onUpgradeDamage: () => void;
  onUpgradeRate: () => void;
  onUpgradeWall: () => void;
  onRaiseKeep: () => void;
  onMountDefense: (kind: TowerKind) => void;
  onSell: () => void;
  onPause: () => void;
  onMute: () => void;
  onSetPatrol: () => void;
};

function Chip({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "coin";
}) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3">
      <span
        className={cn(
          "size-4",
          tone === "danger" && "text-danger",
          tone === "coin" && "text-coin",
          tone === "default" && "text-muted",
        )}
      >
        {icon}
      </span>
      <span className="sr-only">{label}</span>
      <span className="font-medium tabular-nums tracking-wide text-fg">{value}</span>
    </div>
  );
}

export function Hud({
  snap,
  onSelectKind,
  onStartWave,
  onUpgradeDamage,
  onUpgradeRate,
  onUpgradeWall,
  onRaiseKeep,
  onMountDefense,
  onSell,
  onMute,
  onPause,
  onSetPatrol,
}: Props) {
  const showPlay = snap.phase === "playing" || snap.phase === "paused";
  if (!showPlay) return null;

  const selectedTower = snap.selectedKind && TOWER_KINDS.includes(snap.selectedKind as (typeof TOWER_KINDS)[number])
    ? TOWERS[snap.selectedKind as (typeof TOWER_KINDS)[number]]
    : null;
  const selectedWork = snap.selectedKind && WORK_KINDS.includes(snap.selectedKind as (typeof WORK_KINDS)[number])
    ? WORKS[snap.selectedKind as (typeof WORK_KINDS)[number]]
    : null;
  const selectedRetainer =
    snap.selectedKind && RETAINER_KINDS.includes(snap.selectedKind as (typeof RETAINER_KINDS)[number])
      ? RETAINERS[snap.selectedKind as (typeof RETAINER_KINDS)[number]]
      : null;
  const waveLabel =
    snap.wave >= snap.waveTotal ? "Last host" : snap.wave === 0 ? "Call the host" : "Next host";

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <Chip icon={<Heart className="size-4" strokeWidth={1.75} />} label="Lives" value={snap.lives} tone="danger" />
          <Chip icon={<Coins className="size-4" strokeWidth={1.75} />} label="Gold" value={snap.gold} tone="coin" />
          <div className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Host</span>
            <span className="font-medium tabular-nums text-fg">
              {snap.wave}/{snap.waveTotal}
            </span>
            <span className="hidden max-w-44 truncate text-sm text-muted sm:inline">{snap.waveName}</span>
            {snap.remaining > 0 ? (
              <span className="text-xs tabular-nums text-subtle">{snap.remaining} left</span>
            ) : null}
          </div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md border border-border bg-surface text-fg transition-opacity duration-[var(--motion-quick)] hover:opacity-90 active:scale-[0.96]"
            onClick={onMute}
            aria-label={snap.muted ? "Unmute" : "Mute"}
          >
            {snap.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-md border border-border bg-surface text-fg transition-opacity duration-[var(--motion-quick)] hover:opacity-90 active:scale-[0.96]"
            onClick={onPause}
            aria-label={snap.phase === "paused" ? "Resume" : "Pause"}
          >
            {snap.phase === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
        </div>
      </header>

      {snap.announce ? (
        <div className="pointer-events-none absolute inset-x-0 top-[18%] z-10 flex justify-center px-4">
          <div className="wave-banner rounded-lg border border-border bg-surface/90 px-5 py-3 text-center shadow-sm backdrop-blur-sm">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-muted">Host {snap.wave}</p>
            <p className="font-display text-xl font-semibold tracking-wide text-fg sm:text-2xl">{snap.announce}</p>
          </div>
        </div>
      ) : null}

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-2">
          {snap.towersBuilt === 0 && snap.worksBuilt === 0 && snap.wave === 0 && !snap.selectedKind ? (
            <p className="self-center rounded-md border border-border bg-surface/90 px-3 py-1.5 text-center text-xs text-fg shadow-sm backdrop-blur-sm sm:text-sm">
              Palisades fuse when they touch. Drag a line. Build anywhere but the keep.
            </p>
          ) : null}

          {selectedTower && !snap.selectedTower ? (
            <div className="rounded-xl border border-border bg-surface/95 px-3 py-2 text-sm shadow-sm backdrop-blur-sm">
              <p className="font-medium text-fg">{selectedTower.name}</p>
              <p className="text-xs text-muted">
                {selectedTower.blurb} Range {selectedTower.range} · {selectedTower.damage} dmg · {selectedTower.fireRate.toFixed(1)}/s
              </p>
            </div>
          ) : null}

          {selectedWork && !snap.selectedWork ? (
            <div className="rounded-xl border border-border bg-surface/95 px-3 py-2 text-sm shadow-sm backdrop-blur-sm">
              <p className="font-medium text-fg">{selectedWork.name}</p>
              <p className="text-xs text-muted">{selectedWork.blurb}</p>
            </div>
          ) : null}

          {selectedRetainer && !snap.selectedRetainer ? (
            <div className="rounded-xl border border-border bg-surface/95 px-3 py-2 text-sm shadow-sm backdrop-blur-sm">
              <p className="font-medium text-fg">{selectedRetainer.name}</p>
              <p className="text-xs text-muted">{selectedRetainer.blurb}</p>
            </div>
          ) : null}

          {snap.selectedTower ? (
            <div className="rounded-xl border border-border bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-semibold tracking-wide text-fg">{snap.selectedTower.name}</p>
                  <p className="text-xs text-muted">
                    {snap.selectedTower.damage} dmg · {snap.selectedTower.fireRate.toFixed(2)}/s · range{" "}
                    {snap.selectedTower.range}
                  </p>
                  <p className="text-xs text-subtle">
                    Damage {snap.selectedTower.dmgLevel}/2 · Rate {snap.selectedTower.rateLevel}/2
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={snap.selectedTower.dmgCost === null || snap.gold < (snap.selectedTower.dmgCost ?? 0)}
                    onClick={onUpgradeDamage}
                    className="min-h-11 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96] disabled:bg-elevated disabled:text-subtle disabled:active:scale-100"
                  >
                    Damage {snap.selectedTower.dmgCost === null ? "max" : `${snap.selectedTower.dmgCost}g`}
                  </button>
                  <button
                    type="button"
                    disabled={snap.selectedTower.rateCost === null || snap.gold < (snap.selectedTower.rateCost ?? 0)}
                    onClick={onUpgradeRate}
                    className="min-h-11 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96] disabled:bg-elevated disabled:text-subtle disabled:active:scale-100"
                  >
                    Fire rate {snap.selectedTower.rateCost === null ? "max" : `${snap.selectedTower.rateCost}g`}
                  </button>
                  <button
                    type="button"
                    onClick={onSell}
                    className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-muted transition-transform duration-[var(--motion-quick)] active:scale-[0.96]"
                  >
                    Sell {snap.selectedTower.sellValue}g
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {snap.selectedWork ? (
            <div className="rounded-xl border border-border bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-semibold tracking-wide text-fg">{snap.selectedWork.name}</p>
                  <p className="text-xs text-muted">{snap.selectedWork.blurb}</p>
                  {snap.selectedWork.kind === "wall" ? (
                    <p className="text-xs text-subtle">
                      {snap.selectedWork.hp}/{snap.selectedWork.maxHp}
                      {snap.selectedWork.mount && snap.selectedWork.range
                        ? ` · ${snap.selectedWork.damage} dmg · ${snap.selectedWork.range} rng`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {snap.selectedWork.upgradeCost !== null ? (
                    <button
                      type="button"
                      disabled={snap.gold < snap.selectedWork.upgradeCost}
                      onClick={onUpgradeWall}
                      className="min-h-11 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96] disabled:bg-elevated disabled:text-subtle disabled:active:scale-100"
                    >
                      {snap.selectedWork.upgradeName} {snap.selectedWork.upgradeCost}g
                    </button>
                  ) : null}
                  {snap.selectedWork.keepCost !== null ? (
                    <button
                      type="button"
                      disabled={snap.gold < snap.selectedWork.keepCost}
                      onClick={onRaiseKeep}
                      className="min-h-11 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96] disabled:bg-elevated disabled:text-subtle disabled:active:scale-100"
                    >
                      Raise tower {snap.selectedWork.keepCost}g
                    </button>
                  ) : null}
                  {snap.selectedWork.mount && snap.selectedWork.dmgCost !== null ? (
                    <button
                      type="button"
                      disabled={snap.gold < snap.selectedWork.dmgCost}
                      onClick={onUpgradeDamage}
                      className="min-h-11 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96] disabled:bg-elevated disabled:text-subtle disabled:active:scale-100"
                    >
                      Damage {snap.selectedWork.dmgCost}g
                    </button>
                  ) : null}
                  {snap.selectedWork.mount && snap.selectedWork.rateCost !== null ? (
                    <button
                      type="button"
                      disabled={snap.gold < snap.selectedWork.rateCost}
                      onClick={onUpgradeRate}
                      className="min-h-11 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96] disabled:bg-elevated disabled:text-subtle disabled:active:scale-100"
                    >
                      Fire rate {snap.selectedWork.rateCost}g
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onSell}
                    className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-muted transition-transform duration-[var(--motion-quick)] active:scale-[0.96]"
                  >
                    Sell {snap.selectedWork.sellValue}g
                  </button>
                </div>
              </div>
              {snap.selectedWork.mountOptions ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {snap.selectedWork.mountOptions.map((opt) => (
                    <button
                      key={opt.kind}
                      type="button"
                      disabled={snap.gold < opt.cost}
                      onClick={() => onMountDefense(opt.kind)}
                      className="flex min-h-11 items-center gap-1.5 rounded-md border border-border px-2 text-sm font-medium text-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96] disabled:text-subtle disabled:active:scale-100"
                    >
                      <img src={`/game/tower-${opt.kind}.png`} alt="" className="size-7 object-contain" />
                      {opt.name} {opt.cost}g
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {snap.selectedRetainer ? (
            <div className="rounded-xl border border-border bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-semibold tracking-wide text-fg">{snap.selectedRetainer.name}</p>
                  <p className="text-xs text-muted">
                    {snap.selectedRetainer.hp}/{snap.selectedRetainer.maxHp} · {snap.selectedRetainer.blurb}
                  </p>
                  <p className="text-xs text-subtle">
                    {snap.selectedRetainer.settingPatrol
                      ? snap.selectedRetainer.patrolStep === "a"
                        ? "Tap post A — the near end of the walk."
                        : "Tap post B — the far end. He will walk A to B."
                      : snap.selectedRetainer.hasPatrol
                        ? "Walking the line. Tap the field to move post B, or set both posts again."
                        : "Tap the field for post B, or set a full A–B patrol."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onSetPatrol}
                    className="min-h-11 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96]"
                  >
                    Set patrol
                  </button>
                  <button
                    type="button"
                    onClick={onSell}
                    className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-muted transition-transform duration-[var(--motion-quick)] active:scale-[0.96]"
                  >
                    Sell {snap.selectedRetainer.sellValue}g
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface/95 p-2 shadow-sm backdrop-blur-sm">
            <div className="flex items-stretch gap-1.5 overflow-x-auto">
              {WORK_KINDS.map((kind) => {
                const def = WORKS[kind];
                const selected = snap.selectedKind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => onSelectKind(kind)}
                    className={cn(
                      "flex min-h-12 min-w-[5.5rem] flex-1 items-center gap-1.5 rounded-lg px-2 text-left transition-colors duration-[var(--motion-quick)]",
                      selected ? "bg-elevated ring-1 ring-ring" : "hover:bg-elevated/70",
                      !snap.canAfford[kind] && "opacity-50",
                    )}
                  >
                    <img
                      src={kind === "wall" ? "/game/wall-stake.png" : `/game/${kind}.png`}
                      alt=""
                      className="size-8 shrink-0 object-contain"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-fg">{def.name}</span>
                      <span className="block text-[0.7rem] tabular-nums text-coin">{def.cost}g</span>
                    </span>
                  </button>
                );
              })}
              {RETAINER_KINDS.map((kind) => {
                const def = RETAINERS[kind];
                const selected = snap.selectedKind === kind;
                const locked = kind === "hero" && snap.heroPlaced;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => onSelectKind(kind)}
                    disabled={locked}
                    className={cn(
                      "flex min-h-12 min-w-[5.5rem] flex-1 items-center gap-1.5 rounded-lg px-2 text-left transition-colors duration-[var(--motion-quick)]",
                      selected ? "bg-elevated ring-1 ring-ring" : "hover:bg-elevated/70",
                      (!snap.canAfford[kind] || locked) && "opacity-50",
                    )}
                  >
                    <img src={`/game/${kind}-1.png`} alt="" className="size-8 shrink-0 object-contain" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-fg">{def.name}</span>
                      <span className="block text-[0.7rem] tabular-nums text-coin">{locked ? "in field" : `${def.cost}g`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-stretch gap-1.5 overflow-x-auto">
              {TOWER_KINDS.map((kind) => {
                const def = TOWERS[kind];
                const selected = snap.selectedKind === kind;
                const afford = snap.canAfford[kind];
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => onSelectKind(kind)}
                    className={cn(
                      "flex min-h-14 min-w-[4.25rem] flex-1 items-center gap-1.5 rounded-lg px-1.5 text-left transition-colors duration-[var(--motion-quick)] sm:min-w-[7rem] sm:px-2",
                      selected ? "bg-elevated ring-1 ring-ring" : "hover:bg-elevated/70",
                      !afford && "opacity-50",
                    )}
                  >
                    <img src={`/game/tower-${kind}.png`} alt="" className="size-9 shrink-0 object-contain sm:size-10" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-fg sm:text-sm">{def.name}</span>
                      <span className="block text-[0.7rem] tabular-nums text-coin sm:text-xs">
                        {def.cost}g · {def.range}
                      </span>
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onStartWave}
                disabled={!snap.canStartWave}
                className="min-h-14 min-w-[4.75rem] shrink-0 rounded-lg bg-accent px-3 text-xs font-semibold tracking-wide text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96] disabled:bg-elevated disabled:text-subtle disabled:active:scale-100 sm:min-w-[7rem] sm:px-4 sm:text-sm"
              >
                <span className="block">{waveLabel}</span>
                {snap.canStartWave && snap.nextWaveName ? (
                  <span className="hidden font-medium text-accent-fg/70 sm:block">
                    {snap.nextWaveName}
                    {snap.nextWaveHint ? ` · ${snap.nextWaveHint}` : ""}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
