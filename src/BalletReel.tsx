import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sec} from './PPSReel';

// "Footwork is basically ballet": quick cuts, ballet terms in an elegant serif.
type Shot = {clip: string; dur: number; kind: 'intro' | 'move' | 'outro'; title: string; sub?: string};
export type BalletContent = {shots: Shot[]};
export const balletTotal = (c: BalletContent) => c.shots.reduce((a, s) => a + sec(s.dur), 0);
const SERIF = "'Playfair Display', Georgia, 'DejaVu Serif', serif";

const ShotView: React.FC<{s: Shot}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = spring({frame: f - 3, fps, config: {damping: 18}});
  const z = interpolate(f, [0, sec(s.dur)], [1.0, 1.06]);
  const dim = s.kind === 'outro' ? interpolate(f, [0, 12], [0, 0.6], {extrapolateRight: 'clamp'}) : s.kind === 'intro' ? 0.35 : 0;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, color: C.ink}}>
      <AbsoluteFill style={{transform: `scale(${z})`}}>
        <OffthreadVideo src={staticFile(s.clip)} muted style={{width: 1080, height: 1920, objectFit: 'cover'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(15,15,14,.55) 0%, rgba(15,15,14,0) 32%), rgba(15,15,14,${dim})`}} />
      {s.kind === 'move' ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * -20}px)`}}>
          <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 150, fontWeight: 400, letterSpacing: 1, textShadow: '0 4px 24px rgba(0,0,0,.45)'}}>{s.title}</div>
          {s.sub && <div style={{fontFamily: FONT, fontSize: 44, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginTop: 6, textShadow: '0 2px 12px rgba(0,0,0,.5)'}}>{s.sub}</div>}
        </div>
      ) : (
        <div style={{position: 'absolute', left: 40, right: 40, top: s.kind === 'intro' ? 320 : 700, textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 20}px)`}}>
          <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: s.kind === 'intro' ? 96 : 92, lineHeight: 1.1, whiteSpace: 'pre-line', textShadow: '0 4px 24px rgba(0,0,0,.45)'}}>{s.title}</div>
          {s.sub && <div style={{fontFamily: FONT, fontSize: 56, fontWeight: 800, marginTop: 30, whiteSpace: 'pre-line'}}>{s.sub}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const BalletReel: React.FC<{content: BalletContent}> = ({content: c}) => {
  let t = 0;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {c.shots.map((s, i) => {
        const from = t;
        t += sec(s.dur);
        return <Sequence key={i} from={from} durationInFrames={sec(s.dur)}><ShotView s={s} /></Sequence>;
      })}
    </AbsoluteFill>
  );
};
