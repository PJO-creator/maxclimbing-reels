import React from 'react';
import {AbsoluteFill, Loop, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sec} from './PPSReel';

// Split-screen "A vs B" how-to: two clips stacked (1080x960 each), text on the inactive half.
type Clip = {clip: string; len: number; label: string};
type Scene =
  | {kind: 'hook' | 'outro'; dur: number; title: string}
  | {kind: 'top' | 'bottom'; dur: number; title: string; sub: string}
  | {kind: 'take'; dur: number; title: string; lines: string[]};
export type SplitContent = {top: Clip; bottom: Clip; series: string; scenes: Scene[]};

export const splitTimeline = (c: SplitContent) => {
  let t = 0;
  const s = c.scenes.map((sc) => {
    const from = t;
    t += sec(sc.dur);
    return {from, len: sec(sc.dur)};
  });
  return {s, total: t};
};

const Half: React.FC<{c: Clip; y: number; dim: number}> = ({c, y, dim}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: 1080, height: 960, overflow: 'hidden'}}>
    <Loop durationInFrames={sec(c.len)}>
      <OffthreadVideo src={staticFile(c.clip)} muted style={{width: 1080, height: 960, objectFit: 'cover'}} />
    </Loop>
    <AbsoluteFill style={{background: `rgba(15,15,14,${dim})`}} />
  </div>
);

const Pill: React.FC<{text: string; y: number; on: number}> = ({text, y, on}) => (
  <div style={{position: 'absolute', left: 60, top: y, background: on > 0.5 ? C.accent : 'rgba(15,15,14,.8)', borderRadius: 14, padding: '6px 20px 9px', fontSize: 38, fontWeight: 800, letterSpacing: 1.5}}>{text}</div>
);

const H: React.FC<{children: React.ReactNode; size?: number; style?: React.CSSProperties}> = ({children, size = 84, style}) => (
  <div style={{fontSize: size, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, whiteSpace: 'pre-line', ...style}}>{children}</div>
);

export const SplitReel: React.FC<{content: SplitContent}> = ({content: c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {s} = splitTimeline(c);
  const idx = Math.max(0, s.findIndex((x) => f >= x.from && f < x.from + x.len));
  const sc = c.scenes[idx];
  const lf = f - s[idx].from;
  const pop = (d = 0) => spring({frame: lf - d, fps, config: {damping: 16}});
  const p = pop(2);
  const appear = {opacity: p, transform: `translateY(${(1 - p) * 40}px)`};

  // dim target per half, eased across scene changes
  const target = (k: Scene['kind'], half: 'top' | 'bottom') =>
    k === 'top' ? (half === 'top' ? 0 : 0.72) : k === 'bottom' ? (half === 'bottom' ? 0 : 0.72) : k === 'hook' ? 0.15 : 0.62;
  const prev = idx > 0 ? c.scenes[idx - 1].kind : sc.kind;
  const mix = interpolate(lf, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const dim = (half: 'top' | 'bottom') => target(prev, half) + (target(sc.kind, half) - target(prev, half)) * mix;

  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <Half c={c.top} y={0} dim={dim('top')} />
      <Half c={c.bottom} y={960} dim={dim('bottom')} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 956, height: 8, background: C.bg}} />
      {(sc.kind === 'top' || sc.kind === 'bottom') && (
        <div style={{position: 'absolute', left: 0, width: 1080, top: sc.kind === 'top' ? 0 : 964, height: 956, boxShadow: `inset 0 0 0 8px ${C.accent}`, opacity: interpolate(lf, [0, 8], [0, 1], {extrapolateRight: 'clamp'})}} />
      )}
      {(sc.kind === 'top' || sc.kind === 'bottom') && (
        <>
          <Pill text={c.top.label} y={270} on={sc.kind === 'top' ? 1 : 0} />
          <Pill text={c.bottom.label} y={990} on={sc.kind === 'bottom' ? 1 : 0} />
        </>
      )}

      {sc.kind === 'hook' && (
        <div style={{position: 'absolute', left: 60, right: 60, top: 760, ...appear}}>
          <div style={{display: 'inline-block', background: 'rgba(15,15,14,.9)', borderRadius: 28, padding: '20px 36px 28px'}}>
            <div style={{fontSize: 34, fontWeight: 800, letterSpacing: 3, color: '#BDB8AF', marginBottom: 10}}>{c.series}</div>
            <H size={92}>{sc.title}</H>
          </div>
        </div>
      )}

      {(sc.kind === 'top' || sc.kind === 'bottom') && (
        <div style={{position: 'absolute', left: 60, right: 60, top: sc.kind === 'top' ? 1120 : 400, ...appear}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
            <H size={96} style={{color: C.ink}}>{sc.title}</H>
            <div style={{width: 92, height: 92, borderRadius: 46, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 800, lineHeight: 1}}>{sc.kind === 'top' ? '↑' : '↓'}</div>
          </div>
          <div style={{fontSize: 54, fontWeight: 600, lineHeight: 1.2, color: '#D6D2CA', marginTop: 16, whiteSpace: 'pre-line'}}>{sc.sub}</div>
        </div>
      )}

      {sc.kind === 'take' && (
        <div style={{position: 'absolute', left: 60, right: 60, top: 640}}>
          <div style={{display: 'inline-block', background: 'rgba(15,15,14,.9)', borderRadius: 28, padding: '24px 36px 32px', ...appear}}>
            <H size={64} style={{color: C.accent}}>{sc.title}</H>
            {sc.lines.map((l, i) => {
              const q = pop(14 + i * 22);
              return (
                <div key={i} style={{fontSize: 66, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1, marginTop: 18, opacity: q, transform: `translateX(${(1 - q) * -40}px)`}}>{l}</div>
              );
            })}
          </div>
        </div>
      )}

      {sc.kind === 'outro' && (
        <div style={{position: 'absolute', left: 60, right: 60, top: 820, ...appear}}>
          <div style={{display: 'inline-block', background: 'rgba(15,15,14,.9)', borderRadius: 28, padding: '22px 36px 30px'}}>
            <H size={84}>{sc.title}</H>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
