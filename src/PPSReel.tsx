import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ---- Brand tokens (swap for Max Climbing brand colours) ----
export const C = {
  bg: '#0F0F0E',
  ink: '#F4F1EA',
  muted: '#8C8A85',
  accent: '#A10303', // Max Climbing logo red
  warn: '#FFC21A',
  steel: '#3A3A38',
  paper: '#FFFFFF',
};
export const FONT = "'Inter Display', Inter, system-ui, sans-serif";
const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

export type Content = {
  product: string;
  price: string;
  url: string;
  intro: {
    clip: string;
    start: number;
    dur: number;
    question: string;
    split: string;
    splitSub: string;
    markerAt: number;
    anchor: {x: number; y: number};
    barCenter: {x: number; y: number};
  };
  product_scene: {image: string; title: string; body: string};
  schema: {title: string; subtitle: string; steps: number[]};
  tilt: {title: string};
  cta: {image: string; line: string};
};

// Scene order + lengths. Intro length follows the clip.
export const buildTimeline = (c: Content) => {
  const lens = {
    intro: sec(c.intro.dur),
    product: sec(5),
    schema: sec(5.5),
    tilt: sec(3),
    cta: sec(3.7),
  };
  let t = 0;
  const tl = {} as Record<keyof typeof lens, {from: number; durationInFrames: number}>;
  (Object.keys(lens) as (keyof typeof lens)[]).forEach((k) => {
    tl[k] = {from: t, durationInFrames: lens[k]};
    t += lens[k];
  });
  return {tl, total: t};
};

// ---------- helpers ----------
// Instagram safe zone: keep text between y≈260 and y≈1500, x 80..920
export const Safe: React.FC<{children: React.ReactNode; justify?: string; color?: string}> = ({children, justify = 'center', color = C.ink}) => (
  <AbsoluteFill
    style={{padding: '260px 140px 420px 80px', display: 'flex', flexDirection: 'column', justifyContent: justify, fontFamily: FONT, color}}
  >
    {children}
  </AbsoluteFill>
);

export const useIn = (delay = 0) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200}});
  return {opacity: s, transform: `translateY(${(1 - s) * 40}px)`};
};

export const Out: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [dur - 6, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Panel: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{alignSelf: 'flex-start', background: 'rgba(15,15,14,.84)', borderRadius: 28, padding: '28px 40px 32px', ...style}}>{children}</div>
);

// ---------- Scene 1: real footage, 2 reps, anchor marker ----------
export const Intro: React.FC<{c: Content['intro']}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = sec(c.markerAt);
  const qOut = interpolate(f, [m - 8, m], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const mk = spring({frame: f - m, fps, config: {damping: 14, mass: 0.7}});
  const arrow = interpolate(f, [m + 6, m + 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const pulse = 1 + 0.06 * Math.sin((f - m) / 4);
  const {anchor: a, barCenter: b} = c;
  const R0 = 48;
  const ax = a.x - R0 - 4; // arrow tip stops short of the ring
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile(`clips/${c.clip}`)} startFrom={sec(c.start)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,.7) 100%)'}} />

      {/* anchor marker */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: Math.min(1, mk * 1.5)}}>
        {/* bar centre */}
        <line x1={b.x} y1={b.y - 80} x2={b.x} y2={b.y + 80} stroke={C.ink} strokeWidth={6} strokeDasharray="12 10" />
        <text x={b.x} y={b.y - 100} textAnchor="middle" fill={C.ink} fontFamily={FONT} fontWeight={800} fontSize={54} style={{paintOrder: 'stroke'}} stroke="rgba(0,0,0,.65)" strokeWidth={10}>
          centre
        </text>
        {/* arrow centre -> anchor */}
        <line x1={b.x} y1={b.y} x2={b.x + (ax - b.x) * arrow} y2={b.y + (a.y - b.y) * arrow} stroke={C.ink} strokeWidth={20} strokeLinecap="round" />
        <line x1={b.x} y1={b.y} x2={b.x + (ax - b.x) * arrow} y2={b.y + (a.y - b.y) * arrow} stroke={C.accent} strokeWidth={12} strokeLinecap="round" />
        {arrow > 0.95 && <polygon points={`${ax},${a.y} ${ax - 26},${a.y - 16} ${ax - 26},${a.y + 16}`} fill={C.accent} />}
        {/* ring around anchor */}
        <circle cx={a.x} cy={a.y} r={R0 * mk * pulse} fill="none" stroke={C.ink} strokeWidth={18} />
        <circle cx={a.x} cy={a.y} r={R0 * mk * pulse} fill="none" stroke={C.accent} strokeWidth={10} />
      </svg>

      <Safe justify="flex-end">
        <div style={{opacity: qOut, position: 'absolute', left: 80, right: 140, bottom: 420}}>
          <Panel style={useIn(4)}>
            <div style={{fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{c.question}</div>
          </Panel>
        </div>
        {f >= m && (
          <Panel style={{background: C.accent, transform: `scale(${0.7 + mk * 0.3})`, transformOrigin: 'left bottom', opacity: Math.min(1, mk * 2)}}>
            <div style={{fontSize: 160, fontWeight: 800, lineHeight: 0.95, letterSpacing: -4, color: C.ink}}>{c.split}</div>
            <div style={{fontSize: 62, fontWeight: 800, marginTop: 12, whiteSpace: 'pre-line', lineHeight: 1.15}}>{c.splitSub}</div>
          </Panel>
        )}
      </Safe>
    </AbsoluteFill>
  );
};

// ---------- Scene 2: what it is ----------
const Product: React.FC<{c: Content}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 18}});
  const zoom = interpolate(f, [0, sec(5)], [1.2, 1.32]);
  return (
    <AbsoluteFill style={{background: C.paper, fontFamily: FONT, color: C.bg}}>
      <div style={{position: 'absolute', top: 240, left: 0, width: 1080, height: 820, overflow: 'hidden', opacity: s, transform: `translateY(${(1 - s) * 60}px)`}}>
        <Img src={staticFile(c.product_scene.image)} style={{width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${zoom})`}} />
      </div>
      <div style={{position: 'absolute', top: 1100, left: 80, right: 140}}>
        <div style={{...useIn(6), fontSize: 50, fontWeight: 700, color: '#6B6964'}}>{c.product}</div>
        <div style={{...useIn(12), fontSize: 100, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.02, marginTop: 12, whiteSpace: 'pre-line'}}>{c.product_scene.title}</div>
        <div style={{...useIn(20), fontSize: 60, fontWeight: 700, color: C.accent, marginTop: 20}}>{c.product_scene.body}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Diagram (side view of the bar) ----------
export const BAR = 700;
// pct = load on the pulling arm; side = which handle is the pulling arm
export const BarDiagram: React.FC<{pct: number; tilt: number; side?: 'left' | 'right'}> = ({pct, tilt, side = 'right'}) => {
  const W = 920, H = 680, anchorY = 40, barY = 300;
  const leftX = (W - BAR) / 2;
  const rightX = leftX + BAR;
  const r = side === 'right';
  const cx = leftX + ((r ? pct : 100 - pct) / 100) * BAR;
  const big = {fill: C.ink, fontWeight: 800, fontSize: 110};
  const small = {fill: C.muted, fontWeight: 700, fontSize: 80};
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow: 'visible'}}>
      <rect x={cx - 70} y={anchorY - 30} width={140} height={14} rx={4} fill={C.steel} />
      <line x1={cx} y1={anchorY - 16} x2={cx} y2={barY} stroke={C.ink} strokeWidth={6} />
      <g transform={`rotate(${tilt} ${cx} ${barY})`}>
        <rect x={leftX - 20} y={barY - 18} width={BAR + 40} height={36} rx={8} fill={C.steel} />
        {Array.from({length: 21}, (_, i) => (
          <circle key={i} cx={leftX + (i / 20) * BAR} cy={barY} r={7} fill={C.bg} />
        ))}
        <circle cx={cx} cy={barY} r={14} fill={C.accent} />
        {[leftX, rightX].map((x, i) => (
          <g key={i}>
            <line x1={x} y1={barY + 18} x2={x} y2={barY + 150} stroke={C.ink} strokeWidth={5} />
            <rect x={x - 50} y={barY + 150} width={100} height={26} rx={13} fill={(i === 1) === r ? C.accent : C.muted} />
          </g>
        ))}
        <text x={rightX + 60} y={barY + 280} textAnchor="end" fontFamily={FONT} {...(r ? big : small)}>{Math.round(r ? pct : 100 - pct)}%</text>
        <text x={leftX - 60} y={barY + 280} textAnchor="start" fontFamily={FONT} {...(r ? small : big)}>{Math.round(r ? 100 - pct : pct)}%</text>
      </g>
    </svg>
  );
};

// ---------- Scene 3: fast schema 50 -> 75 -> 100 ----------
const Schema: React.FC<{c: Content['schema']; dur: number}> = ({c, dur}) => {
  const f = useCurrentFrame();
  const start = 14;
  const per = (dur - start - 16) / (c.steps.length - 1);
  const idx = interpolate(f, [start, start + per * (c.steps.length - 1)], [0, c.steps.length - 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const i0 = Math.min(Math.floor(idx), c.steps.length - 1);
  const frac = idx - i0;
  const eased = Easing.inOut(Easing.cubic)(Math.min(1, frac * 2.5));
  const pct = i0 >= c.steps.length - 1 ? c.steps[c.steps.length - 1] : c.steps[i0] + (c.steps[i0 + 1] - c.steps[i0]) * eased;
  return (
    <Safe justify="flex-start">
      <div style={{...useIn(0), fontSize: 96, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, whiteSpace: 'pre-line'}}>{c.title}</div>
      <div style={{...useIn(6), alignSelf: 'flex-start', fontSize: 64, fontWeight: 800, background: C.accent, borderRadius: 18, padding: '10px 30px 14px', marginTop: 22}}>{c.subtitle}</div>
      <div style={{marginTop: 90, marginLeft: -20}}>
        <BarDiagram pct={pct} tilt={0} />
      </div>
    </Safe>
  );
};

// ---------- Scene 4: tilt feedback (animated) ----------
const Tilt: React.FC<{c: Content['tilt']}> = ({c}) => {
  const f = useCurrentFrame();
  const tilt = interpolate(f, [0, 20, 50], [-10, -10, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const ok = interpolate(f, [46, 54], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Safe justify="flex-start">
      <div style={{fontSize: 96, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2}}>
        <span style={{display: 'inline-block', whiteSpace: 'pre-line', background: `rgba(161,3,3,${ok})`, borderRadius: 24, padding: '10px 30px 16px', marginLeft: -30}}>{c.title}</span>
      </div>
      <div style={{marginTop: 150, marginLeft: -20}}>
        <BarDiagram pct={75} tilt={tilt} />
      </div>
    </Safe>
  );
};

// ---------- Scene 5: CTA ----------
const CTA: React.FC<{c: Content}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 18}});
  const zoom = interpolate(f, [0, sec(3.7)], [1.4, 1.5]);
  return (
    <Safe>
      <div style={{height: 500, borderRadius: 36, background: C.paper, overflow: 'hidden', opacity: s, transform: `scale(${0.92 + s * 0.08})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Img src={staticFile(c.cta.image)} style={{height: '100%', objectFit: 'contain', transform: `scale(${zoom})`}} />
      </div>
      <div style={{...useIn(8), fontSize: 100, fontWeight: 800, lineHeight: 1.0, letterSpacing: -2, marginTop: 56}}>{c.product}</div>
      <div style={{...useIn(16), display: 'flex', gap: 28, alignItems: 'baseline', marginTop: 34}}>
        <span style={{fontSize: 84, fontWeight: 800, color: C.ink}}>{c.price}</span>
        <span style={{fontSize: 52, fontWeight: 600, color: C.muted}}>{c.url}</span>
      </div>
      <div style={{...useIn(26), alignSelf: 'flex-start', marginTop: 44, background: C.accent, color: C.ink, borderRadius: 999, padding: '20px 44px', fontSize: 56, fontWeight: 800}}>
        {c.cta.line} →
      </div>
    </Safe>
  );
};

// ---------- Composition (no audio: add music in Instagram) ----------
export const PPSReel: React.FC<{content: Content}> = ({content: c}) => {
  const {tl} = buildTimeline(c);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Sequence {...tl.intro}><Out dur={tl.intro.durationInFrames}><Intro c={c.intro} /></Out></Sequence>
      <Sequence {...tl.product}><Out dur={tl.product.durationInFrames}><Product c={c} /></Out></Sequence>
      <Sequence {...tl.schema}><Out dur={tl.schema.durationInFrames}><Schema c={c.schema} dur={tl.schema.durationInFrames} /></Out></Sequence>
      <Sequence {...tl.tilt}><Out dur={tl.tilt.durationInFrames}><Tilt c={c.tilt} /></Out></Sequence>
      <Sequence {...tl.cta}><CTA c={c} /></Sequence>
    </AbsoluteFill>
  );
};
