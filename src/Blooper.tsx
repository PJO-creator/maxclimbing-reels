import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sec} from './PPSReel';

// Story blooper: real speed with sound, sports-style slow-mo replay + freeze, reaction.
type Part = {clip: string; dur: number; sound?: boolean; text?: string; textAt?: number; replay?: boolean; freezeAt?: number; circle?: {x: number; y: number; r: number}; freezeText?: string};
export type BlooperContent = {parts: Part[]};
export const blooperTotal = (c: BlooperContent) => c.parts.reduce((a, p) => a + sec(p.dur), 0);

const Tag: React.FC<{children: React.ReactNode; bg?: string; style?: React.CSSProperties}> = ({children, bg = 'rgba(15,15,14,.88)', style}) => (
  <div style={{display: 'inline-block', background: bg, borderRadius: 22, padding: '14px 30px 18px', fontSize: 72, fontWeight: 800, letterSpacing: -1, lineHeight: 1.05, whiteSpace: 'pre-line', ...style}}>{children}</div>
);

const PartView: React.FC<{p: Part}> = ({p}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = spring({frame: f - sec(p.textAt ?? 0) - 2, fps, config: {damping: 14}});
  const fz = p.freezeAt !== undefined ? spring({frame: f - sec(p.freezeAt), fps, config: {damping: 10}}) : 0;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <OffthreadVideo src={staticFile(p.clip)} muted={!p.sound} style={{width: 1080, height: 1920, objectFit: 'cover'}} />
      {p.replay && (
        <div style={{position: 'absolute', left: 60, top: 260, display: 'flex', alignItems: 'center', gap: 16}}>
          <div style={{width: 26, height: 26, borderRadius: 13, background: C.accent, opacity: Math.floor(f / 8) % 2 ? 0.3 : 1}} />
          <Tag style={{fontSize: 52, letterSpacing: 3}}>REPLAY 0.3×</Tag>
        </div>
      )}
      {p.circle && fz > 0.01 && (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <circle cx={p.circle.x} cy={p.circle.y} r={p.circle.r * (1.6 - 0.6 * fz)} fill="none" stroke={C.accent} strokeWidth={14} opacity={fz} />
        </svg>
      )}
      {p.freezeText && (
        <div style={{position: 'absolute', left: 60, right: 60, top: 1380, opacity: fz, transform: `scale(${0.8 + 0.2 * fz})`, transformOrigin: 'left center'}}>
          <Tag bg={C.accent}>{p.freezeText}</Tag>
        </div>
      )}
      {p.text && (
        <div style={{position: 'absolute', left: 60, right: 60, top: 300, opacity: t, transform: `translateY(${(1 - t) * -24}px)`}}>
          <Tag>{p.text}</Tag>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Blooper: React.FC<{content: BlooperContent}> = ({content: c}) => {
  let t = 0;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {c.parts.map((p, i) => {
        const from = t;
        t += sec(p.dur);
        return <Sequence key={i} from={from} durationInFrames={sec(p.dur)}><PartView p={p} /></Sequence>;
      })}
    </AbsoluteFill>
  );
};
