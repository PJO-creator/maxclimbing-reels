import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
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
  base?: 'forearm' | 'upper';
  labelDist?: number;
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
  // upper arm: elbow -> approx. shoulder (straight up, slightly back), normal points forward (+x)
  const [sx, sy] = map([pt.e[0] - 35, pt.e[1] - 330]);
  const udx = sx - ex, udy = sy - ey, ul = Math.hypot(udx, udy) || 1;
  let unx = -udy / ul, uny = udx / ul;
  if (unx < 0) { unx = -unx; uny = -uny; }
  const atU = (t: number, o: number): [number, number] => [ex + udx * t + unx * o * FW * 1.3 / 2, ey + udy * t + uny * o * FW * 1.3 / 2];
  const P = (m: Muscle) => (m.base === 'upper' ? atU : at);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {muscles.map((m, i) => {
        const a = P(m)(m.from[0], m.from[1]);
        const b = P(m)(m.to[0], m.to[1]);
        const d = spindle(a, b, (m.thick * FW * (m.base === 'upper' ? 1.3 : 1)) / 2);
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
        const c = P(m)((m.from[0] + m.to[0]) / 2, (m.from[1] + m.to[1]) / 2);
        const up = m.labelSide === 'up' ? -1 : 1;
        const left = m.labelAlign === 'left';
        const dist = m.labelDist ?? (m.labelSide === 'up' ? 230 : 200);
        const lx = c[0] + (left ? -60 : 70), ly = c[1] + up * dist;
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

// ---- sequence of tracked segments ----
export type Segment = {clip: string; track: TrackPt[]; muscles: Muscle[]; title: string; sub: string};
export type MuscleTestContent = {zoom: number; origin: string; segments: Segment[]};
export const muscleTestDuration = (c: MuscleTestContent) => c.segments.reduce((a, s) => a + s.track.length, 0);

export const SegmentView: React.FC<{s: Segment; zoom: number; origin: string}> = ({s, zoom, origin}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pt = s.track[Math.min(f, s.track.length - 1)];
  const reveal = interpolate(f, [8, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const labels = spring({frame: f - 22, fps, config: {damping: 16}});
  const ys = s.track.map((p) => p.w[1]);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const pulse = 1 - (pt.w[1] - lo) / Math.max(1, hi - lo);
  const t = spring({frame: f - 4, fps, config: {damping: 16}});
  const [ox, oy] = origin.split(' ').map((v) => parseFloat(v) / 100);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: origin}}>
        <OffthreadVideo src={staticFile(s.clip)} muted style={{width: 1080, height: 1920}} />
        <AbsoluteFill style={{background: `rgba(15,15,14,${0.25 * reveal})`}} />
      </AbsoluteFill>
      <MuscleLayer pt={pt} muscles={s.muscles} reveal={reveal} pulse={pulse} labels={labels} zoom={zoom} origin={[1080 * ox, 1920 * oy]} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(15,15,14,0) 52%, rgba(15,15,14,.82) 66%, rgba(15,15,14,.97) 80%)'}} />
      <div style={{position: 'absolute', left: 70, right: 70, top: 1240, opacity: t, transform: `translateY(${(1 - t) * 30}px)`}}>
        <div style={{fontSize: 92, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5}}>{s.title}</div>
        <div style={{fontSize: 54, fontWeight: 600, color: '#D6D2CA', marginTop: 12, whiteSpace: 'pre-line'}}>{s.sub}</div>
      </div>
    </AbsoluteFill>
  );
};

export const MuscleTest: React.FC<{content: MuscleTestContent}> = ({content: c}) => {
  let from = 0;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {c.segments.map((s, i) => {
        const el = (
          <Sequence key={i} from={from} durationInFrames={s.track.length}>
            <SegmentView s={s} zoom={c.zoom} origin={c.origin} />
          </Sequence>
        );
        from += s.track.length;
        return el;
      })}
    </AbsoluteFill>
  );
};
