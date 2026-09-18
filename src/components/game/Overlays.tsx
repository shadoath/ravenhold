import type { HudSnapshot } from "@/game/types";

type Props = {
  snap: HudSnapshot;
  loading: boolean;
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void;
};

export function Overlays({ snap, loading, onStart, onRestart, onResume }: Props) {
  if (snap.phase === "menu" || snap.phase === "boot") {
    return (
      <div className="absolute inset-0 z-20 overflow-y-auto bg-bg/55 p-4 backdrop-blur-[2px]">
        <div className="flex min-h-full items-center justify-center py-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-8">
            <p className="overlay-rise text-xs font-medium uppercase tracking-[0.22em] text-muted">Last garrison</p>
            <h1 className="overlay-rise-2 mt-2 font-display text-3xl font-semibold tracking-tight text-fg sm:text-5xl">
              Ravenhold
            </h1>
            <p className="overlay-rise-3 mt-3 text-sm leading-relaxed text-muted sm:mt-4">
              The host does not keep to the road. They flow toward the keep. Raise palisades and ditches to funnel them,
              plant towers on the killing ground, and set a watch on the choke.
            </p>
            <ul className="overlay-rise-3 mt-4 space-y-2 text-sm text-fg">
              <li>Stakes upgrade to timber, then stone. Raise a tower on stone and mount a gun — height buys range.</li>
              <li>Seal the field and they smash the wall. Some hosts bring ladders or rams.</li>
              <li>The Marshal patrols a line you mark. One captain only.</li>
            </ul>
            <button
              type="button"
              onClick={onStart}
              disabled={loading}
              className="overlay-rise-3 mt-5 flex min-h-12 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold tracking-wide text-accent-fg transition-[opacity,transform] duration-[var(--motion-quick)] hover:opacity-95 active:scale-[0.96] disabled:bg-elevated disabled:text-subtle disabled:active:scale-100 sm:mt-6"
            >
              {loading ? "Surveying the field" : "Defend the keep"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (snap.phase === "paused") {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/50 p-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center">
          <h2 className="font-display text-2xl font-semibold text-fg">Hold</h2>
          <p className="mt-2 text-sm text-muted">The host waits in the west.</p>
          <button
            type="button"
            onClick={onResume}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96]"
          >
            Resume
          </button>
        </div>
      </div>
    );
  }

  if (snap.phase === "defeat") {
    return (
      <div className="absolute inset-0 z-20 overflow-y-auto bg-bg/60 p-4">
        <div className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center sm:p-8">
            <p className="overlay-rise text-xs font-medium uppercase tracking-[0.2em] text-danger">Breach</p>
            <h2 className="overlay-rise-2 mt-2 font-display text-3xl font-semibold text-fg">The keep has fallen</h2>
            <p className="overlay-rise-3 mt-3 text-sm text-muted">
              The host reached the gate on wave {snap.wave} of {snap.waveTotal}.
            </p>
            <button
              type="button"
              onClick={onRestart}
              className="overlay-rise-3 mt-6 flex min-h-12 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96]"
            >
              Rally again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (snap.phase === "victory") {
    return (
      <div className="absolute inset-0 z-20 overflow-y-auto bg-bg/55 p-4">
        <div className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center sm:p-8">
            <p className="overlay-rise text-xs font-medium uppercase tracking-[0.2em] text-moss">Held</p>
            <h2 className="overlay-rise-2 mt-2 font-display text-3xl font-semibold text-fg">The host is broken</h2>
            <p className="overlay-rise-3 mt-3 text-sm text-muted">
              Ravenhold stands. {snap.lives} {snap.lives === 1 ? "life" : "lives"} remain, and {snap.gold} gold in the
              coffer.
            </p>
            <button
              type="button"
              onClick={onRestart}
              className="overlay-rise-3 mt-6 flex min-h-12 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-fg transition-transform duration-[var(--motion-quick)] active:scale-[0.96]"
            >
              Watch the road again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
