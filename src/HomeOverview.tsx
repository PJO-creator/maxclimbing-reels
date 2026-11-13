import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sec} from './PPSReel';

// "Training at home: analog or digital?" overview with setup cards.
type Setup = {group: 'ANALOG' | 'DIGITAL'; name: string; action: string; flat: string; pip?: string; checks: [string, boolean][]; progress: string; dur: number; flatFor?: number; mark?: {x: number; y: number; label: string; lx?: number; ly?: number}};
export type HomeContent = {hook: {top: string; bottom: string; dur: number; title: string; tiles?: {src: string; label: string; digital?: boolean}[]; series?: string; info?: {at: number; text: string; next: string}}; setups: Setup[]; end: {dur: number; title: string; sub: string; q: string; next?: string}};
export const homeTotal = (c: HomeContent) => sec(c.hook.dur) + c.setups.reduce((a, s) => a + sec(s.dur), 0) + sec(c.end.dur);

const pop = (f: number, fps: number, d = 0) => spring({frame: f - d, fps, config: {damping: 15}});

const Hook: React.FC<{c: HomeContent['hook']}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(f, fps, 4);
  const half = (src: string, y: number, label: string, d: number) => (
    <div style={{position: 'absolute', left: 0, top: y, width: 1080, height: 958, overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile(src)} muted style={{width: 1080, height: 1920, marginTop: -480}} />
      <div style={{position: 'absolute', left: 60, top: y === 0 ? 280 : 60, opacity: pop(f, fps, d), background: label === 'ANALOG' ? C.ink : C.accent, color: label === 'ANALOG' ? C.bg : C.ink, borderRadius: 14, padding: '6px 22px 10px', fontSize: 52, fontWeight: 800, letterSpacing: 3}}>{label}</div>
    </div>
  );
  if (c.tiles) {
    const pos = [[80, 470], [560, 470], [80, 940], [560, 940], [320, 1410]];
    return (
      <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
        <div style={{position: 'absolute', left: 80, right: 60, top: 190, opacity: p, transform: `translateY(${(1 - p) * -20}px)`}}>
          {c.series && <div style={{position: 'absolute', top: -84, left: 0, background: C.accent, borderRadius: 12, padding: '4px 18px 8px', fontSize: 36, fontWeight: 800, letterSpacing: 3}}>{c.series}</div>}
          <div style={{fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: -1.8, whiteSpace: 'pre-line'}}>{c.title}</div>
        </div>
        {c.tiles.map((t, k) => {
          const q = pop(f, fps, 8 + k * 8);
          return (
            <div key={k} style={{position: 'absolute', left: pos[k][0], top: pos[k][1], width: 440, height: 440, borderRadius: 26, overflow: 'hidden', opacity: q, transform: `scale(${0.85 + 0.15 * q})`, boxShadow: '0 12px 30px rgba(0,0,0,.5)'}}>
              <OffthreadVideo src={staticFile(t.src)} muted style={{width: 440, height: 782, marginTop: -171}} />
              <div style={{position: 'absolute', left: 14, top: 14, background: t.digital ? C.accent : C.ink, color: t.digital ? C.ink : C.bg, borderRadius: 10, padding: '2px 12px 5px', fontSize: 26, fontWeight: 800, letterSpacing: 2}}>{t.digital ? 'DIGITAL' : 'ANALOG'}</div>
              <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(15,15,14,0), rgba(15,15,14,.85))', padding: '30px 16px 14px', fontSize: 32, fontWeight: 800, lineHeight: 1.1, whiteSpace: 'pre-line'}}>{t.label}</div>
            </div>
          );
        })}
        {c.info && (() => {
          const q = pop(f, fps, sec(c.info.at));
          const q2 = pop(f, fps, sec(c.info.at) + 40);
          return (
            <>
              <AbsoluteFill style={{background: `rgba(15,15,14,${0.62 * q})`}} />
              <div style={{position: 'absolute', left: 70, right: 70, top: 900, opacity: q, transform: `translateY(${(1 - q) * 40}px)`, background: 'rgba(15,15,14,.95)', border: `4px solid ${C.accent}`, borderRadius: 30, padding: '36px 44px 44px'}}>
                <div style={{fontSize: 66, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1, whiteSpace: 'pre-line'}}>{c.info.text}</div>
                <div style={{opacity: q2, marginTop: 26, fontSize: 46, fontWeight: 700, color: '#D6D2CA', whiteSpace: 'pre-line'}}>{c.info.next}</div>
              </div>
            </>
          );
        })()}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      {half(c.top, 0, 'ANALOG', 10)}
      {half(c.bottom, 962, 'DIGITAL', 16)}
      <div style={{position: 'absolute', left: 0, right: 0, top: 790, display: 'flex', justifyContent: 'center', opacity: p, transform: `scale(${0.9 + 0.1 * p})`}}>
        <div style={{background: 'rgba(15,15,14,.94)', borderRadius: 28, padding: '22px 40px 30px', fontSize: 82, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, textAlign: 'center', whiteSpace: 'pre-line'}}>{c.title}</div>
      </div>
    </AbsoluteFill>
  );
};

const SetupCard: React.FC<{s: Setup; i: number; n: number}> = ({s, i, n}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = 1;
  const digital = s.group === 'DIGITAL';
  const ff = sec(s.flatFor ?? 0);
  if (f < ff) {
    const q = pop(f, fps, 2);
    return (
      <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
        <OffthreadVideo src={staticFile(s.flat)} muted style={{width: 1080, height: 1920, objectFit: 'cover', transform: `scale(${interpolate(f, [0, ff], [1.0, 1.08])})`}} />
        <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(15,15,14,.75) 0%, rgba(15,15,14,0) 30%)'}} />
        <div style={{position: 'absolute', left: 60, right: 60, top: 250, opacity: q, transform: `translateY(${(1 - q) * -24}px)`}}>
          <div style={{display: 'inline-block', background: digital ? C.accent : C.ink, color: digital ? C.ink : C.bg, borderRadius: 12, padding: '4px 18px 8px', fontSize: 38, fontWeight: 800, letterSpacing: 3}}>{s.group} · {i}/{n}</div>
          <div style={{fontSize: 84, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, marginTop: 14, whiteSpace: 'pre-line', textShadow: '0 2px 16px rgba(0,0,0,.6)'}}>{s.name}</div>
        </div>
      </AbsoluteFill>
    );
  }
  const g = f - ff;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <Sequence from={ff}><OffthreadVideo src={staticFile(s.action)} playbackRate={0.82} muted style={{width: 1080, height: 1920, objectFit: 'cover'}} /></Sequence>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(15,15,14,.7) 0%, rgba(15,15,14,0) 26%, rgba(15,15,14,0) 58%, rgba(15,15,14,.85) 78%)'}} />
      {/* header */}
      <div style={{position: 'absolute', left: 60, right: 60, top: 250, opacity: p, transform: `translateY(${(1 - p) * -24}px)`}}>
        <div style={{display: 'inline-block', background: digital ? C.accent : C.ink, color: digital ? C.ink : C.bg, borderRadius: 12, padding: '4px 18px 8px', fontSize: 38, fontWeight: 800, letterSpacing: 3}}>{s.group} · {i}/{n}</div>
        <div style={{fontSize: 72, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, marginTop: 14, whiteSpace: 'pre-line', textShadow: '0 2px 16px rgba(0,0,0,.6)'}}>{s.name}</div>
      </div>
      {/* flat-lay inset */}
      <div style={{position: 'absolute', right: 50, top: 560, width: 300, height: 300, borderRadius: 24, overflow: 'hidden', border: '4px solid #F4F1EA', boxShadow: '0 16px 40px rgba(0,0,0,.5)', opacity: pop(g, fps, 8), transform: `scale(${0.85 + 0.15 * pop(g, fps, 8)})`}}>
        <OffthreadVideo src={staticFile(s.flat)} muted style={{width: 300, height: 533, marginTop: -116}} />
      </div>
      {/* app pip */}
      {s.pip && (
        <div style={{position: 'absolute', left: 50, top: 520, width: 300, borderRadius: 30, overflow: 'hidden', border: '6px solid #0b0b0b', boxShadow: '0 16px 40px rgba(0,0,0,.6)', opacity: pop(g, fps, 14)}}>
          <Sequence from={ff} layout="none"><OffthreadVideo src={staticFile(s.pip)} playbackRate={0.82} muted style={{width: 300, display: 'block'}} /></Sequence>
        </div>
      )}
      {s.mark && (() => {
        const q = pop(g, fps, 24);
        const {x, y, label, lx, ly} = s.mark;
        if (lx !== undefined && ly !== undefined) {
          const ex = x - 70 * 0.75, ey = y + 20;
          return (
            <div style={{opacity: q}}>
              <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
                <line x1={lx + 20} y1={ly + 40} x2={lx + 20 + (ex - lx - 20) * q} y2={ly + 40 + (ey - ly - 40) * q} stroke={C.accent} strokeWidth={12} strokeLinecap="round" />
                <circle cx={x} cy={y} r={75} fill="none" stroke={C.accent} strokeWidth={8} />
              </svg>
              <div style={{position: 'absolute', right: 1080 - lx - 20, top: ly, background: C.accent, borderRadius: 14, padding: '6px 22px 10px', fontSize: 50, fontWeight: 800, whiteSpace: 'nowrap'}}>{label}</div>
            </div>
          );
        }
        return (
          <div style={{opacity: q}}>
            <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
              <line x1={x + 230} y1={y - 210} x2={x + 40 + (1 - q) * 120} y2={y - 30 - (1 - q) * 110} stroke={C.accent} strokeWidth={12} strokeLinecap="round" />
              <circle cx={x} cy={y} r={70} fill="none" stroke={C.accent} strokeWidth={8} />
            </svg>
            <div style={{position: 'absolute', left: x + 170, top: y - 290, background: C.accent, borderRadius: 14, padding: '6px 22px 10px', fontSize: 50, fontWeight: 800}}>{label}</div>
          </div>
        );
      })()}
      {/* checks */}
      <div style={{position: 'absolute', left: 60, right: 60, top: 1240, display: 'flex', flexWrap: 'wrap', gap: 14}}>
        {s.checks.map(([k, ok], j) => {
          const q = pop(g, fps, 14 + j * 7);
          return (
            <div key={k} style={{opacity: q, transform: `scale(${0.8 + 0.2 * q})`, background: ok ? 'rgba(244,241,234,.95)' : 'rgba(15,15,14,.85)', color: ok ? C.bg : '#8C8A85', border: ok ? 'none' : '2px solid #4a4845', borderRadius: 16, padding: '8px 22px 12px', fontSize: 46, fontWeight: 800, textDecoration: ok ? 'none' : 'line-through'}}>{ok ? '✓ ' : ''}{k}</div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 1360, fontSize: 46, fontWeight: 700, color: '#D6D2CA', opacity: pop(g, fps, 48)}}>Progress: <span style={{color: C.ink}}>{s.progress}</span></div>
    </AbsoluteFill>
  );
};

const End: React.FC<{c: HomeContent['end']}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT, color: C.ink, padding: '0 80px', justifyContent: 'center'}}>
      <div style={{opacity: pop(f, fps, 2), fontSize: 80, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{c.title}</div>
      <div style={{opacity: pop(f, fps, 20), fontSize: 50, fontWeight: 600, color: '#D6D2CA', marginTop: 24, whiteSpace: 'pre-line'}}>{c.sub}</div>
      {c.next && <div style={{opacity: pop(f, fps, 42), fontSize: 50, fontWeight: 800, marginTop: 40, whiteSpace: 'pre-line'}}>{c.next}</div>}
      <div style={{opacity: pop(f, fps, 64), marginTop: 50, alignSelf: 'flex-start', background: C.accent, borderRadius: 18, padding: '12px 30px 16px', fontSize: 62, fontWeight: 800}}>{c.q}</div>
    </AbsoluteFill>
  );
};

export const HomeOverview: React.FC<{content: HomeContent}> = ({content: c}) => {
  let t = sec(c.hook.dur);
  const n = c.setups.length;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Sequence from={0} durationInFrames={sec(c.hook.dur)}><Hook c={c.hook} /></Sequence>
      {c.setups.map((s, i) => {
        const from = t;
        t += sec(s.dur);
        return <Sequence key={i} from={from} durationInFrames={sec(s.dur)}><SetupCard s={s} i={i + 1} n={n} /></Sequence>;
      })}
      <Sequence from={t} durationInFrames={sec(c.end.dur)}><End c={c.end} /></Sequence>
    </AbsoluteFill>
  );
};
