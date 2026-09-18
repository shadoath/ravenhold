type Bus = {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
};

let bus: Bus | null = null;
let muted = false;

function curve(v: number) {
  return v * v;
}

export function unlockAudio() {
  if (!bus) {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx({ latencyHint: "interactive" });
    const master = ctx.createGain();
    const sfx = ctx.createGain();
    sfx.connect(master);
    master.connect(ctx.destination);
    master.gain.value = muted ? 0 : curve(0.7);
    sfx.gain.value = curve(0.85);
    bus = { ctx, master, sfx };
  }
  if (bus.ctx.state === "suspended") void bus.ctx.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  if (!bus) return;
  bus.master.gain.setTargetAtTime(next ? 0 : curve(0.7), bus.ctx.currentTime, 0.03);
}

export function isMuted() {
  return muted;
}

function envGain(duration: number, peak: number) {
  if (!bus) return null;
  const g = bus.ctx.createGain();
  const t = bus.ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  g.connect(bus.sfx);
  return { g, t };
}

function tone(freq: number, duration: number, type: OscillatorType, peak: number, detune = 0) {
  if (!bus) return;
  const e = envGain(duration, peak);
  if (!e) return;
  const o = bus.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, e.t);
  o.detune.value = detune;
  o.connect(e.g);
  o.start(e.t);
  o.stop(e.t + duration + 0.02);
}

function noise(duration: number, peak: number, hp = 800) {
  if (!bus) return;
  const n = bus.ctx.sampleRate;
  const frames = Math.max(1, Math.floor(n * duration));
  const buffer = bus.ctx.createBuffer(1, frames, n);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = bus.ctx.createBufferSource();
  src.buffer = buffer;
  const filter = bus.ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const e = envGain(duration, peak);
  if (!e) return;
  src.connect(filter);
  filter.connect(e.g);
  src.start(e.t);
  src.stop(e.t + duration + 0.02);
}

function jitter(base: number, amt: number) {
  return base * (1 + (Math.random() * 2 - 1) * amt);
}

export const sfx = {
  ui() {
    tone(620, 0.06, "triangle", 0.08);
  },
  place() {
    tone(140, 0.12, "sine", 0.18);
    noise(0.1, 0.08, 400);
  },
  deny() {
    tone(180, 0.1, "square", 0.07);
  },
  arrow() {
    noise(0.07, 0.1, 1800);
    tone(jitter(880, 0.08), 0.06, "triangle", 0.05);
  },
  bolt() {
    noise(0.09, 0.14, 600);
    tone(jitter(220, 0.05), 0.12, "sawtooth", 0.08);
  },
  stone() {
    noise(0.14, 0.12, 200);
    tone(90, 0.16, "sine", 0.16);
  },
  orb() {
    tone(jitter(540, 0.06), 0.1, "sine", 0.08);
    tone(jitter(810, 0.06), 0.1, "triangle", 0.05);
  },
  hit() {
    noise(0.05, 0.07, 900);
  },
  death() {
    noise(0.16, 0.12, 300);
    tone(160, 0.18, "triangle", 0.08);
  },
  coin() {
    tone(jitter(980, 0.04), 0.09, "square", 0.05);
    tone(1320, 0.12, "triangle", 0.04);
  },
  leak() {
    tone(140, 0.28, "sawtooth", 0.1);
    tone(90, 0.32, "sine", 0.12);
  },
  wave() {
    tone(330, 0.22, "triangle", 0.1);
    tone(247, 0.28, "sine", 0.08);
  },
  upgrade() {
    tone(520, 0.1, "triangle", 0.08);
    tone(780, 0.14, "sine", 0.06);
  },
  sell() {
    tone(240, 0.12, "triangle", 0.08);
  },
  win() {
    tone(392, 0.18, "triangle", 0.1);
    tone(523, 0.22, "triangle", 0.08);
    tone(659, 0.3, "sine", 0.08);
  },
  lose() {
    tone(220, 0.28, "triangle", 0.1);
    tone(165, 0.4, "sine", 0.1);
  },
};

export function resumeOnVisible() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") unlockAudio();
  });
}
