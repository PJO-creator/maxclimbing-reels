import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sec} from './PPSReel';

// Simple how-to: hook clip, then technique clips with timed step chips.
type Scene =
  | {kind: 'clip'; clip: string; dur: number; n?: string; title: string; sub?: string; steps?: {at: number; text: string}[]}
  | {kind: 'card'; dur: number; title: string};
export type FootContent = {scenes: Scene[]};
export const footTotal = (c: FootContent) => c.scenes.reduce((a, s) => a + sec(s.dur), 0);

const ClipScene: React.FC<{s: Extract<Scene, {kind: 'clip'}>}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - 2, fps, config: {damping: 16}});
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <OffthreadVideo src={staticFile(s.clip)} muted style={{width: 1080, height: 1920, objectFit: 'cover'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(15,15,14,.55) 0%, rgba(15,15,14,0) 30%, rgba(15,15,14,0) 60%, rgba(15,15,14,.6) 100%)'}} />
      <div style={{position: 'absolute', left: 60, right: 60, top: 260, opacity: p, transform: `translateY(${(1 - p) * -30}px)`}}>
        <div style={{display: 'inline-block', background: 'rgba(15,15,14,.9)', borderRadius: 28, padding: '20px 34px 26px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
            {s.n && <div style={{width: 96, height: 96, borderRadius: 48, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, fontWeight: 800, flexShrink: 0}}>{s.n}</div>}
            <div style={{fontSize: 84, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{s.title}</div>
          </div>
          {s.sub && <div style={{fontSize: 48, fontWeight: 600, color: '#D6D2CA', marginTop: 12, whiteSpace: 'pre-line'}}>{s.sub}</div>}
        </div>
      </div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 1250, display: 'flex', flexDirection: 'column', gap: 18}}>
        {(s.steps || []).map((st, i) => {
          const q = spring({frame: f - sec(st.at), fps, config: {damping: 15}});
          const active = (s.steps || []).filter((x) => f >= sec(x.at)).length - 1 === i;
          return (
            <div key={i} style={{alignSelf: 'flex-start', opacity: q, transform: `translateX(${(1 - q) * -60}px)`, background: active ? C.accent : 'rgba(15,15,14,.85)', borderRadius: 20, padding: '12px 28px 16px', fontSize: 54, fontWeight: 800, letterSpacing: -0.5}}>{st.text}</div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Card: React.FC<{s: Extract<Scene, {kind: 'card'}>}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - 2, fps, config: {damping: 16}});
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink, justifyContent: 'center', padding: '0 80px'}}>
      <div style={{opacity: p, transform: `translateY(${(1 - p) * 30}px)`, fontSize: 96, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{s.title}</div>
    </AbsoluteFill>
  );
};

export const FootSwap: React.FC<{content: FootContent}> = ({content: c}) => {
  let t = 0;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {c.scenes.map((s, i) => {
        const from = t;
        t += sec(s.dur);
        return (
          <Sequence key={i} from={from} durationInFrames={sec(s.dur)}>
            {s.kind === 'clip' ? <ClipScene s={s} /> : <Card s={s} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
