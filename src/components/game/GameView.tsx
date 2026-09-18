import { useCallback, useEffect, useRef, useState } from "react";
import { Hud } from "@/components/game/Hud";
import { Overlays } from "@/components/game/Overlays";
import { loadAtlas, type Atlas } from "@/game/assets";
import { resumeOnVisible, unlockAudio } from "@/game/audio";
import { WORLD_H, WORLD_W } from "@/game/config";
import { GameEngine } from "@/game/engine";
import { pointerToWorld, renderWorld } from "@/game/renderer";
import type { BuildKind, HudSnapshot, TowerKind } from "@/game/types";

const emptySnap = (): HudSnapshot => ({
  phase: "menu",
  gold: 0,
  lives: 0,
  wave: 0,
  waveTotal: 10,
  waveName: "",
  nextWaveName: "",
  nextWaveHint: "",
  spawning: false,
  enemiesAlive: 0,
  remaining: 0,
  towersBuilt: 0,
  worksBuilt: 0,
  announce: "",
  selectedKind: null,
  selectedTower: null,
  selectedWork: null,
  selectedRetainer: null,
  canStartWave: false,
  canAfford: {
    longbow: false,
    ballista: false,
    catapult: false,
    warden: false,
    wall: false,
    ditch: false,
    watch: false,
    hero: false,
  },
  muted: false,
  heroPlaced: false,
});

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const atlasRef = useRef<Atlas | null>(null);
  const [snap, setSnap] = useState<HudSnapshot>(emptySnap);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bump = useCallback(() => {
    const engine = engineRef.current;
    if (engine) setSnap(engine.snapshot());
  }, []);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;
    let raf = 0;
    let last = performance.now();
    let hudAt = 0;
    let alive = true;

    resumeOnVisible();

    const fit = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(WORLD_W * dpr);
      canvas.height = Math.floor(WORLD_H * dpr);
    };

    const loop = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const canvas = canvasRef.current;
      const atlas = atlasRef.current;
      const eng = engineRef.current;
      if (!canvas || !eng) return;
      let dt = (now - last) / 1000;
      last = now;
      dt = Math.min(dt, 0.1);
      eng.step(dt);
      if (atlas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, WORLD_W, WORLD_H);
          renderWorld(ctx, eng, atlas);
        }
      }
      if (now - hudAt > 80) {
        hudAt = now;
        setSnap(eng.snapshot());
      }
    };

    fit();
    window.addEventListener("resize", fit);
    raf = requestAnimationFrame(loop);

    loadAtlas()
      .then((atlas) => {
        if (!alive) return;
        atlasRef.current = atlas;
        setLoading(false);
        if (engine.phase === "boot") engine.phase = "menu";
        setSnap(engine.snapshot());
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load the field.");
        setLoading(false);
      });

    const onKey = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;
      if (e.code === "Digit1") eng.selectKind("longbow");
      else if (e.code === "Digit2") eng.selectKind("ballista");
      else if (e.code === "Digit3") eng.selectKind("catapult");
      else if (e.code === "Digit4") eng.selectKind("warden");
      else if (e.code === "Digit5") eng.selectKind("wall");
      else if (e.code === "Digit6") eng.selectKind("ditch");
      else if (e.code === "Digit7") eng.selectKind("watch");
      else if (e.code === "Digit8") eng.selectKind("hero");
      else if (e.code === "Space") {
        e.preventDefault();
        if (eng.phase === "menu") return;
        eng.startWave();
      } else if (e.code === "Escape") {
        if (eng.selectedKind || eng.selectedTowerId || eng.selectedWorkId || eng.selectedRetainerId) {
          eng.selectKind(null);
          eng.selectedTowerId = null;
          eng.selectedWorkId = null;
          eng.selectedRetainerId = null;
        } else eng.pauseToggle();
      }
      setSnap(eng.snapshot());
    };
    window.addEventListener("keydown", onKey);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>, kind: "move" | "down") => {
    const canvas = canvasRef.current;
    const eng = engineRef.current;
    if (!canvas || !eng) return;
    const world = pointerToWorld(canvas, e.clientX, e.clientY);
    eng.hover(world.x, world.y);
    if (kind === "down") {
      eng.tap(world.x, world.y);
      bump();
    }
  };

  const start = () => {
    if (!atlasRef.current) return;
    unlockAudio();
    const eng = engineRef.current;
    if (!eng) return;
    eng.reset();
    bump();
  };

  const selectKind = (kind: BuildKind) => {
    unlockAudio();
    engineRef.current?.selectKind(kind);
    bump();
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden overscroll-none bg-bg text-fg">
      <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-bg [container-type:size]">
        <canvas
          ref={canvasRef}
          className="touch-none select-none"
          style={{
            width: "min(100cqw, calc(100cqh * 16 / 9))",
            aspectRatio: "16 / 9",
            touchAction: "none",
          }}
          onPointerMove={(e) => onPointer(e, "move")}
          onPointerDown={(e) => {
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            onPointer(e, "down");
          }}
        />
        {error ? (
          <p className="absolute inset-0 z-30 flex items-center justify-center bg-bg p-6 text-center text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <Hud
        snap={snap}
        onSelectKind={selectKind}
        onStartWave={() => {
          unlockAudio();
          engineRef.current?.startWave();
          bump();
        }}
        onUpgradeDamage={() => {
          engineRef.current?.upgradeDamage();
          bump();
        }}
        onUpgradeRate={() => {
          engineRef.current?.upgradeRate();
          bump();
        }}
        onUpgradeWall={() => {
          engineRef.current?.upgradeWall();
          bump();
        }}
        onRaiseKeep={() => {
          engineRef.current?.raiseKeep();
          bump();
        }}
        onMountDefense={(kind: TowerKind) => {
          engineRef.current?.mountDefense(kind);
          bump();
        }}
        onSell={() => {
          engineRef.current?.sellSelected();
          bump();
        }}
        onPause={() => {
          engineRef.current?.pauseToggle();
          bump();
        }}
        onMute={() => {
          engineRef.current?.toggleMute();
          bump();
        }}
      />
      <Overlays
        snap={snap}
        loading={loading}
        onStart={start}
        onRestart={start}
        onResume={() => {
          const eng = engineRef.current;
          if (eng && eng.phase === "paused") eng.phase = "playing";
          bump();
        }}
      />
    </div>
  );
}
