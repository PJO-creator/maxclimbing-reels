import React from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from './PPSReel';

// Schematic "x-ray" muscles drawn along a tracked forearm (elbow -> wrist).
export type TrackPt = {e: [number, number]; w: [number, number]};
export type Muscle = {
  name: string;
  // spindle along the forearm: start/end as fraction of elbow->wrist, offset as fraction of forearm width (+ = top edge)
  from: [number, number];
  to: [number, number];
  thick: number; // fraction of forearm width
  active: boolean;
  labelSide: 'up' | 'down';
  labelAlign?: 'left' | 'right';
};

const FOREARM_W = 92; // px, side view

const spindle = (a: [number, number], b: [number, number], th: number) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const k = th * 1.35;
  const m1 = [a[0] + dx * 0.18 + nx * k, a[1] + dy * 0.18 + ny * k];
  const m2 = [a[0] + dx * 0.82 + nx * k, a[1] + dy * 0.82 + ny * k];
  const m3 = [a[0] + dx * 0.82 - nx * k, a[1] + dy * 0.82 - ny * k];
  const m4 = [a[0] + dx * 0.18 - nx * k, a[1] + dy * 0.18 - ny * k];
  return `M ${a[0]} ${a[1]} C ${m1[0]} ${m1[1]} ${m2[0]} ${m2[1]} ${b[0]} ${b[1]} C ${m3[0]} ${m3[1]} ${m4[0]} ${m4[1]} ${a[0]} ${a[1]} Z`;
};

export const MuscleLayer: React.FC<{pt: TrackPt; muscles: Muscle[]; reveal: number; pulse: number; labels: number; zoom?: number; origin?: [number, number]}> = ({pt, muscles, reveal, pulse, labels, zoom = 1, origin = [540, 960]}) => {
  const map = (p: [number, number]): [number, number] => [origin[0] + (p[0] - origin[0]) * zoom, origin[1] + (p[1] - origin[1]) * zoom];
  const FW = FOREARM_W * zoom;
  const [ex, ey] = map(pt.e), [wx, wy] = map(pt.w);
  const dx = wx - ex, dy = wy - ey;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  // normal pointing "up" on screen
  let nx = -uy, ny = ux;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const at = (t: number, o: number): [number, number] => [ex + dx * t + nx * o * FW / 2, ey + dy * t + ny * o * FW / 2];
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {muscles.map((m, i) => {
        const a = at(m.from[0], m.from[1]);
        const b = at(m.to[0], m.to[1]);
        const d = spindle(a, b, (m.thick * FW) / 2);
        const op = reveal * (m.active ? 0.55 + 0.35 * pulse : 0.25);
        return (
          <g key={i}>
            <path d={d} fill={m.active ? '#E0261C' : '#F4F1EA'} opacity={op} filter={m.active ? 'url(#glow)' : undefined} />
            <path d={d} fill="none" stroke={m.active ? '#FF6A5C' : '#F4F1EA'} strokeWidth={3} opacity={reveal * 0.9} />
            {/* fibre lines */}
            {[0.25, 0.5, 0.75].map((f) => {
              const p1 = [a[0] + (b[0] - a[0]) * 0.15, a[1] + (b[1] - a[1]) * 0.15];
              const p2 = [a[0] + (b[0] - a[0]) * 0.85, a[1] + (b[1] - a[1]) * 0.85];
              const off = (f - 0.5) * m.thick * FW * 0.9;
              return <line key={f} x1={p1[0] + nx * off} y1={p1[1] + ny * off} x2={p2[0] + nx * off} y2={p2[1] + ny * off} stroke="#FFFFFF" strokeWidth={1.5} opacity={reveal * 0.35} />;
            })}
          </g>
        );
      })}
      {muscles.filter((m) => m.active).map((m, i) => {
        const c = at((m.from[0] + m.to[0]) / 2, (m.from[1] + m.to[1]) / 2);
        const up = m.labelSide === 'up' ? -1 : 1;
        const left = m.labelAlign === 'left';
        const lx = c[0] + (left ? -60 : 40), ly = c[1] + up * (m.labelSide === 'up' ? 230 : 200);
        return (
          <g key={'l' + i} opacity={labels}>
            <line x1={c[0]} y1={c[1]} x2={lx} y2={ly} stroke="#FFFFFF" strokeWidth={4} />
            <circle cx={c[0]} cy={c[1]} r={8} fill="#FFFFFF" />
            <foreignObject x={left ? lx - 590 : lx - 10} y={up < 0 ? ly - 74 : ly} width={600} height={80}>
              <div style={{display: 'block', width: 'fit-content', marginLeft: left ? 'auto' : 0, background: C.accent, color: C.ink, fontFamily: FONT, fontWeight: 800, fontSize: 40, letterSpacing: 1.5, padding: '6px 18px 9px', borderRadius: 12, whiteSpace: 'nowrap'}}>{m.name}</div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
};

// ---- test composition ----
export type MuscleTestContent = {clip: string; track: TrackPt[]; muscles: Muscle[]; zoom: number; origin: string; title: string; sub: string};

export const MuscleTest: React.FC<{content: MuscleTestContent}> = ({content: c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pt = c.track[Math.min(f, c.track.length - 1)];
  const reveal = interpolate(f, [12, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const labels = spring({frame: f - 30, fps, config: {damping: 16}});
  // pulse with lift: wrist above its mean = working harder
  const ys = c.track.map((p) => p.w[1]);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const pulse = 1 - (pt.w[1] - lo) / Math.max(1, hi - lo);
  const t = spring({frame: f - 4, fps, config: {damping: 16}});
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <AbsoluteFill style={{transform: `scale(${c.zoom})`, transformOrigin: c.origin}}>
        <OffthreadVideo src={staticFile(c.clip)} muted style={{width: 1080, height: 1920}} />
        <AbsoluteFill style={{background: `rgba(15,15,14,${0.25 * reveal})`}} />
      </AbsoluteFill>
      <MuscleLayer pt={pt} muscles={c.muscles} reveal={reveal} pulse={pulse} labels={labels} zoom={c.zoom} origin={[1080 * parseFloat(c.origin.split(' ')[0]) / 100, 1920 * parseFloat(c.origin.split(' ')[1]) / 100]} />
      {/* hide the jeans: fade the lower part to dark */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(15,15,14,0) 52%, rgba(15,15,14,.82) 66%, rgba(15,15,14,.97) 80%)'}} />
      <div style={{position: 'absolute', left: 70, right: 70, top: 1240, opacity: t, transform: `translateY(${(1 - t) * 30}px)`}}>
        <div style={{fontSize: 84, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{c.title}</div>
        <div style={{fontSize: 50, fontWeight: 600, color: '#D6D2CA', marginTop: 14, whiteSpace: 'pre-line'}}>{c.sub}</div>
      </div>
    </AbsoluteFill>
  );
};
