import React from 'react';
import {AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sec} from './PPSReel';

// "Rank these" engagement reel: one looping clip + one text overlay.
export type RankContent = {
  clip: string;
  dur: number;
  hook: string;
  ask: string;
  items: {t: string; s: string}[];
  end?: {at: number; text: string};
};

const LETTERS = 'ABCDEFGH';

export const RankReel: React.FC<{content: RankContent}> = ({content: c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = (d: number) => spring({frame: f - d, fps, config: {damping: 16}});
  const endP = c.end ? pop(sec(c.end.at)) : 0;
  const hookP = pop(0);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <OffthreadVideo src={staticFile(c.clip)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.15) 28%, rgba(0,0,0,.2) 45%, rgba(0,0,0,.6) 100%)'}} />

      {/* Hook */}
      <div style={{position: 'absolute', top: 340, left: 70, right: 70, opacity: hookP, transform: `translateY(${(1 - hookP) * -40}px)`}}>
        <div style={{display: 'inline-block', background: 'rgba(15,15,14,.86)', borderRadius: 28, padding: '20px 34px 26px'}}>
          <div style={{fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{c.hook}</div>
          <div style={{fontSize: 46, fontWeight: 700, color: '#D6D2CA', marginTop: 12}}>{c.ask} ↓</div>
        </div>
      </div>

      {/* List */}
      <div style={{position: 'absolute', top: c.end ? 680 : 720, left: 70, right: 70, display: 'flex', flexDirection: 'column', gap: 12}}>
        {c.items.map((it, i) => {
          const p = pop(8 + i * 6);
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 26, background: 'rgba(15,15,14,.86)', borderRadius: 24, padding: '12px 26px 14px 16px',
                opacity: p, transform: `translateX(${(1 - p) * -80}px)`,
              }}
            >
              <div style={{width: 70, height: 70, borderRadius: 35, background: C.accent, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 800}}>{LETTERS[i]}</div>
              <div>
                <div style={{fontSize: 47, fontWeight: 800, lineHeight: 1.05, letterSpacing: -0.8}}>{it.t}</div>
                <div style={{fontSize: 33, fontWeight: 600, color: '#BDB8AF', marginTop: 2}}>{it.s}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* End line */}
      {c.end && (
      <div style={{position: 'absolute', top: 1375, left: 70, right: 70, opacity: endP, transform: `scale(${0.9 + endP * 0.1})`, transformOrigin: 'left center'}}>
        <div style={{display: 'inline-block', background: C.accent, borderRadius: 20, padding: '12px 30px 16px', fontSize: 46, fontWeight: 800, lineHeight: 1.1, whiteSpace: 'pre-line'}}>{c.end.text}</div>
      </div>
      )}
    </AbsoluteFill>
  );
};

export const rankDuration = (c: RankContent) => sec(c.dur);
