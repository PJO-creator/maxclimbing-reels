import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sec} from './PPSReel';

// Indoor ice axes: blooper hook, why they're strict, pull direction, why not on slopers.
type Scene =
  | {kind: 'clip'; clip: string; dur: number; sound?: boolean; title: string; sub?: string; top?: boolean}
  | {kind: 'arrow'; clip: string; dur: number; freezeAt: number; pick: [number, number]; from: [number, number]; to: [number, number]; title: string; sub?: string; wrong?: [number, number]}
  | {kind: 'diagram'; dur: number; title: string}
  | {kind: 'end'; clip: string; dur: number; title: string}
  | {kind: 'seq'; clip: string; dur: number; texts: {at: number; dur: number; title: string; sub?: string}[]};
export type IceContent = {scenes: Scene[]};
export const iceTotal = (c: IceContent) => c.scenes.reduce((a, s) => a + sec(s.dur), 0);

const pop = (f: number, fps: number, d = 0) => spring({frame: f - d, fps, config: {damping: 15}});
const Box: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{display: 'inline-block', background: 'rgba(15,15,14,.9)', borderRadius: 26, padding: '18px 32px 24px', ...style}}>{children}</div>
);
const T: React.FC<{children: React.ReactNode; size?: number}> = ({children, size = 78}) => (
  <div style={{fontSize: size, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{children}</div>
);

const ClipScene: React.FC<{s: Extract<Scene, {kind: 'clip' | 'end'}>}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(f, fps, 2);
  const top = s.kind === 'clip' ? s.top !== false : false;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <OffthreadVideo src={staticFile(s.clip)} muted={!(s.kind === 'clip' && s.sound)} style={{width: 1080, height: 1920, objectFit: 'cover'}} />
      {s.kind === 'end' && <AbsoluteFill style={{background: `rgba(15,15,14,${interpolate(f, [0, 10], [0, 0.45], {extrapolateRight: 'clamp'})})`}} />}
      <div style={{position: 'absolute', left: 60, right: 60, top: top ? 270 : 1300, opacity: p, transform: `translateY(${(1 - p) * (top ? -24 : 24)}px)`}}>
        <Box>
          <T>{s.title}</T>
          {s.kind === 'clip' && s.sub && <div style={{fontSize: 48, fontWeight: 600, color: '#D6D2CA', marginTop: 12, whiteSpace: 'pre-line'}}>{s.sub}</div>}
        </Box>
      </div>
    </AbsoluteFill>
  );
};

const ArrowScene: React.FC<{s: Extract<Scene, {kind: 'arrow'}>}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const z0 = sec(s.freezeAt);
  const ring = pop(f, fps, z0);
  const draw = interpolate(f, [z0 + 22, z0 + 38], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t = pop(f, fps, z0 + 30);
  const [x1, y1] = s.from, [x2, y2] = s.to;
  const xe = x1 + (x2 - x1) * draw, ye = y1 + (y2 - y1) * draw;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <OffthreadVideo src={staticFile(s.clip)} muted style={{width: 1080, height: 1920, objectFit: 'cover'}} />
      <AbsoluteFill style={{background: `rgba(15,15,14,${0.35 * ring})`}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <circle cx={s.pick[0]} cy={s.pick[1]} r={70 + (1 - ring) * 90} fill="none" stroke="#FFFFFF" strokeWidth={8} opacity={ring} />
        {s.wrong && (() => {
          const w = interpolate(f, [z0 + 4, z0 + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const [wx, wy] = s.wrong;
          return (
            <g opacity={w}>
              <line x1={x1} y1={y1} x2={x1 + (wx - x1) * w} y2={y1 + (wy - y1) * w} stroke="#FFFFFF" strokeWidth={12} strokeDasharray="26 20" opacity={0.85} />
              {w > 0.95 && <text x={wx - 34} y={wy + 70} fontFamily={FONT} fontWeight={800} fontSize={90} fill="#FFFFFF">✗</text>}
            </g>
          );
        })()}
        {draw > 0 && (
          <>
            <line x1={x1} y1={y1} x2={xe} y2={ye} stroke={C.accent} strokeWidth={22} strokeLinecap="round" />
            {draw > 0.95 && (
              <polygon points={`${x2 + Math.cos(ang) * 30},${y2 + Math.sin(ang) * 30} ${x2 + Math.cos(ang + 2.4) * 60},${y2 + Math.sin(ang + 2.4) * 60} ${x2 + Math.cos(ang - 2.4) * 60},${y2 + Math.sin(ang - 2.4) * 60}`} fill={C.accent} />
            )}
          </>
        )}
      </svg>
      <div style={{position: 'absolute', left: 60, right: 60, top: 1180, opacity: t, transform: `translateY(${(1 - t) * 24}px)`}}>
        <Box style={{background: C.accent}}><T>{s.title}</T>{s.sub && <div style={{fontSize: 46, fontWeight: 700, marginTop: 10, whiteSpace: 'pre-line'}}>{s.sub}</div>}</Box>
      </div>
    </AbsoluteFill>
  );
};

// Own schematic: pick on an edge vs. on a sloper, with force arrows.
const Diagram: React.FC<{s: Extract<Scene, {kind: 'diagram'}>}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = pop(f, fps, 6), b = pop(f, fps, 34);
  const pick = (x: number, y: number, rot: number) => (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M 0 0 C -10 -60 30 -110 90 -120 L 100 -100 C 50 -90 25 -60 22 -10 L 22 260 L 0 260 Z" fill="#E9DCC3" stroke="#8a7a5c" strokeWidth={3} />
    </g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number, col: string, op: number) => {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    return (
      <g opacity={op}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={14} strokeLinecap="round" />
        <polygon points={`${x2 + Math.cos(ang) * 22},${y2 + Math.sin(ang) * 22} ${x2 + Math.cos(ang + 2.4) * 42},${y2 + Math.sin(ang + 2.4) * 42} ${x2 + Math.cos(ang - 2.4) * 42},${y2 + Math.sin(ang - 2.4) * 42}`} fill={col} />
      </g>
    );
  };
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #2a2826 0%, #151514 60%, #0F0F0E 100%)', fontFamily: FONT, color: C.ink}}>
      <div style={{position: 'absolute', left: 70, right: 70, top: 270, opacity: pop(f, fps, 0)}}><T size={76}>{s.title}</T></div>
      <svg width={1080} height={1000} viewBox="0 0 1080 1000" style={{position: 'absolute', left: 0, top: 560}}>
        {/* EDGE */}
        <g opacity={a}>
          <rect x={60} y={120} width={440} height={760} rx={16} fill="#3a3836" />
          <path d="M 120 420 L 440 420 L 440 470 L 120 470 Z" fill="#1B5E8C" />
          {pick(230, 420, 0)}
          {arrow(250, 520, 250, 760, '#FFFFFF', a)}
          <text x={280} y={960} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={58} fill="#FFFFFF">EDGE ✓</text>
          <text x={280} y={180} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={36} fill="#D6D2CA">force into the hold</text>
        </g>
        {/* SLOPER */}
        <g opacity={b}>
          <rect x={580} y={120} width={440} height={760} rx={16} fill="#3a3836" />
          <path d="M 620 520 C 680 360 900 360 980 520 Z" fill="#1B5E8C" />
          {pick(720, 430, -28)}
          {arrow(760, 520, 760, 740, '#FFFFFF', b)}
          {arrow(740, 470, 650, 640, C.accent, b * interpolate(f, [44, 54], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}))}
          <text x={800} y={960} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={58} fill={C.accent}>SLOPER ✗</text>
          <text x={800} y={180} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={36} fill="#D6D2CA">force slides off</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const SeqScene: React.FC<{s: Extract<Scene, {kind: 'seq'}>}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <OffthreadVideo src={staticFile(s.clip)} muted style={{width: 1080, height: 1920, objectFit: 'cover'}} />
      {s.texts.map((t, i) => {
        const a = sec(t.at), b = a + sec(t.dur);
        if (f < a - 1 || f > b) return null;
        const p = pop(f, fps, a);
        const o = interpolate(f, [b - 6, b], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <div key={i} style={{position: 'absolute', left: 60, right: 60, top: 1300, opacity: p * o, transform: `translateY(${(1 - p) * 24}px)`}}>
            <Box><T>{t.title}</T>{t.sub && <div style={{fontSize: 48, fontWeight: 600, color: '#D6D2CA', marginTop: 12, whiteSpace: 'pre-line'}}>{t.sub}</div>}</Box>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const IceReel: React.FC<{content: IceContent}> = ({content: c}) => {
  let t = 0;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {c.scenes.map((s, i) => {
        const from = t;
        t += sec(s.dur);
        return (
          <Sequence key={i} from={from} durationInFrames={sec(s.dur)}>
            {s.kind === 'arrow' ? <ArrowScene s={s} /> : s.kind === 'diagram' ? <Diagram s={s} /> : s.kind === 'seq' ? <SeqScene s={s} /> : <ClipScene s={s} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
