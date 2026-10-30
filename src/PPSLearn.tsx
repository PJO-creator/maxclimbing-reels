import React from 'react';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BarDiagram, C, FONT, Intro, Out, Safe, sec, useIn} from './PPSReel';
import type {Content as AdContent} from './PPSReel';

// "How to train" version: teaches the method, no price / no link in the video.
type Step =
  | {kind: 'find'; dur: number; n: string; title: string; body: string; path: number[]; stop: number}
  | {kind: 'progress'; dur: number; n: string; title: string; body: string; path: number[]}
  | {kind: 'tilt'; dur: number; n: string; title: string; body: string}
  | {kind: 'mirror'; dur: number; n: string; title: string; body: string; pct: number}
  | {kind: 'combine'; dur: number; n: string; title: string; body: string; cards: {t: string; s: string}[]};

export type LearnContent = {
  intro: AdContent['intro'];
  steps: Step[];
  outro: {dur: number; image: string; title: string; body: string};
};

export const learnTimeline = (c: LearnContent) => {
  const parts = [sec(c.intro.dur), ...c.steps.map((s) => sec(s.dur)), sec(c.outro.dur)];
  let t = 0;
  const starts = parts.map((p) => {
    const f = t;
    t += p;
    return f;
  });
  return {parts, starts, total: t};
};

// Step through a list of percentages: hold on each, quick ease between
const usePath = (path: number[], startAt: number, dur: number, endPad = 20) => {
  const f = useCurrentFrame();
  const end = dur - endPad;
  const per = (end - startAt) / Math.max(1, path.length - 1);
  const idx = interpolate(f, [startAt, startAt + per * (path.length - 1)], [0, path.length - 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const i0 = Math.min(Math.floor(idx), path.length - 1);
  const frac = idx - i0;
  const e = Easing.inOut(Easing.cubic)(Math.min(1, frac * 3));
  const pct = i0 >= path.length - 1 ? path[path.length - 1] : path[i0] + (path[i0 + 1] - path[i0]) * e;
  return {pct, i0, frac, per};
};

const Header: React.FC<{n: string; title: string; body: string}> = ({n, title, body}) => (
  <>
    <div style={{...useIn(0), display: 'flex', alignItems: 'center', gap: 26}}>
      <div style={{width: 104, height: 104, borderRadius: 52, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 800, flexShrink: 0}}>{n}</div>
      <div style={{fontSize: 80, fontWeight: 800, lineHeight: 1.02, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{title}</div>
    </div>
    <div style={{...useIn(8), fontSize: 54, fontWeight: 600, lineHeight: 1.2, color: '#CFCBC3', marginTop: 28, whiteSpace: 'pre-line'}}>{body}</div>
  </>
);

const StepScene: React.FC<{s: Step; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  let diagram: React.ReactNode = null;
  let badge: React.ReactNode = null;

  if (s.kind === 'find' || s.kind === 'progress') {
    const {pct, i0, frac, per} = usePath(s.path, 18, dur, s.kind === 'find' ? 55 : 20);
    diagram = <BarDiagram pct={pct} tilt={0} />;
    if (s.kind === 'find') {
      const done = i0 >= s.path.length - 1;
      const pop = spring({frame: f - (18 + per * (s.path.length - 1)), fps, config: {damping: 12}});
      badge = done ? (
        <div style={{alignSelf: 'flex-start', marginTop: 10, transform: `scale(${0.6 + pop * 0.4})`, opacity: pop, background: C.accent, borderRadius: 20, padding: '12px 30px 16px', fontSize: 58, fontWeight: 800}}>
          Your start: {s.stop}%
        </div>
      ) : null;
    } else {
      // "+5%" tag on each move
      const show = i0 < s.path.length - 1 && frac > 0 && frac < 0.6;
      badge = (
        <div style={{alignSelf: 'flex-end', marginRight: 40, height: 90, opacity: show ? 1 : 0, background: C.accent, borderRadius: 20, padding: '10px 28px 14px', fontSize: 58, fontWeight: 800}}>+5%</div>
      );
    }
  } else if (s.kind === 'tilt') {
    const tilt = interpolate(f, [10, 28, 60, 85], [0, -10, -10, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
    diagram = <BarDiagram pct={75} tilt={tilt} />;
  } else if (s.kind === 'combine') {
    const pop = (i: number) => spring({frame: f - 14 - i * 10, fps, config: {damping: 14}});
    diagram = (
      <div style={{display: 'flex', alignItems: 'center', gap: 24, marginLeft: 20, marginTop: 60}}>
        {s.cards.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{fontSize: 110, fontWeight: 800, color: C.accent, opacity: pop(i)}}>+</div>}
            <div style={{width: 360, minHeight: 300, borderRadius: 28, background: '#1E1D1B', border: `3px solid ${i === 0 ? '#3A3A38' : C.accent}`, padding: '34px 30px', transform: `scale(${0.85 + pop(i) * 0.15})`, opacity: pop(i)}}>
              <div style={{fontSize: 52, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1}}>{c.t}</div>
              <div style={{fontSize: 38, fontWeight: 600, lineHeight: 1.25, color: '#CFCBC3', marginTop: 20, whiteSpace: 'pre-line'}}>{c.s}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  } else if (s.kind === 'mirror') {
    // anchor jumps from left arm to right arm at the same load
    const flip = f > dur / 2;
    const o = interpolate(f, [dur / 2 - 6, dur / 2, dur / 2 + 6], [1, 0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    diagram = (
      <div style={{opacity: o}}>
        <BarDiagram pct={s.pct} tilt={0} side={flip ? 'right' : 'left'} />
      </div>
    );
    badge = (
      <div style={{display: 'flex', justifyContent: 'space-between', width: 760, marginLeft: 60, fontSize: 46, fontWeight: 800, color: '#CFCBC3'}}>
        <span style={{opacity: flip ? 0.35 : 1}}>WEAK SIDE</span>
        <span style={{opacity: flip ? 1 : 0.35}}>STRONG SIDE</span>
      </div>
    );
  }

  return (
    <Safe justify="flex-start">
      <Header n={s.n} title={s.title} body={s.body} />
      <div style={{marginTop: 40, minHeight: 90, display: 'flex', flexDirection: 'column'}}>{s.kind !== 'mirror' && badge}</div>
      <div style={{marginTop: 10, marginLeft: -20}}>{diagram}</div>
      {s.kind === 'mirror' && <div style={{marginTop: -40}}>{badge}</div>}
    </Safe>
  );
};

const Outro: React.FC<{c: LearnContent['outro']; dur: number}> = ({c, dur}) => {
  const f = useCurrentFrame();
  const pan = interpolate(f, [0, dur], [1.3, 1.15]);
  return (
    <AbsoluteFill style={{background: C.paper, fontFamily: FONT}}>
      <div style={{position: 'absolute', top: 820, left: 0, width: 1080, height: 700, overflow: 'hidden'}}>
        <Img src={staticFile(c.image)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${pan})`}} />
      </div>
      <div style={{position: 'absolute', top: 280, left: 80, right: 120, color: C.bg}}>
        <div style={{...useIn(0), fontSize: 96, fontWeight: 800, lineHeight: 1.03, letterSpacing: -2, whiteSpace: 'pre-line'}}>{c.title}</div>
        <div style={{...useIn(10), fontSize: 52, fontWeight: 700, color: C.accent, marginTop: 26}}>{c.body}</div>
      </div>
    </AbsoluteFill>
  );
};

export const PPSLearn: React.FC<{content: LearnContent}> = ({content: c}) => {
  const {parts, starts} = learnTimeline(c);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Sequence from={starts[0]} durationInFrames={parts[0]}>
        <Out dur={parts[0]}><Intro c={c.intro} /></Out>
      </Sequence>
      {c.steps.map((s, i) => (
        <Sequence key={i} from={starts[i + 1]} durationInFrames={parts[i + 1]}>
          <Out dur={parts[i + 1]}><StepScene s={s} dur={parts[i + 1]} /></Out>
        </Sequence>
      ))}
      <Sequence from={starts[starts.length - 1]} durationInFrames={parts[parts.length - 1]}>
        <Outro c={c.outro} dur={parts[parts.length - 1]} />
      </Sequence>
    </AbsoluteFill>
  );
};
