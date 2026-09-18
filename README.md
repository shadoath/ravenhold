# Ravenhold

A castle-defense game. The host does not walk a rail — they flow west to east toward the keep. You raise stakes, timber, and stone to funnel them, plant towers on the killing ground, and set a watch on the choke.

## Play

```bash
npm install
npm run dev
```

Then open the app at port 8080.

## How it plays

- **Flow.** Attackers spread through the grass and prefer the old road until you reshape it.
- **Works.** Stakes (12g) upgrade to palisade, then stone. Raise a tower on stone and mount a gun — height buys range. Ditches slow them; ladders ignore ditches. Seal the field and they smash the wall. Rams smash faster.
- **Towers.** Longbow, Ballista, Catapult, Warden. Upgrade damage or fire rate, or sell at a loss.
- **Retainers.** A Watch patrols his post. The Marshal (one) walks a line you mark.
- **Ten hosts.** Kills pay gold. Leaks cost lives. Hold the gate.

Tap a stake after you plant it — the next step is on the panel.

## Stack

React 19, Vite, Canvas 2D, Tailwind v4.
