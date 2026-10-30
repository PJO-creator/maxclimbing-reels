import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, Out, Safe, sec, useIn} from './PPSReel';

// Entralpi "how to" reel: hangboarding at your level instead of full bodyweight.
// Product is the tool, not the subject: no name/price in the video (caption only).
export type EntralpiContent = {
  scenes: {
    hook: {dur: number; body: number; text: string};
    plate: {dur: number; body: number; title: string; body2: string};
    target: {dur: number; body: number; app: number; title: string; tag: string};
    log: {dur: number; app: number; title: string; sub: string};
    outro: {dur: number; title: string};
  };
};

export const entralpiTimeline = (c: EntralpiContent) => {
  const order = ['hook', 'plate', 'target', 'log', 'outro'] as const;
  let t = 0;
  const tl = {} as Record<(typeof order)[number], {from: number; durationInFrames: number}>;
  for (const k of order) {
    const d = sec(c.scenes[k].dur);
    tl[k] = {from: t, durationInFrames: d};
    t += d;
  }
  return {tl, total: t};
};

const BODY = 'clips/entralpi/body.mp4';
const APP = 'clips/entralpi/app.mp4'; // 720x1600 screen recording, resampled to 30 fps

const Body: React.FC<{start: number; zoom?: [number, number]; origin?: string}> = ({start, zoom = [1, 1], origin = '50% 50%'}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const z = interpolate(f, [0, durationInFrames], zoom);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile(BODY)} startFrom={sec(start)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, transformOrigin: origin}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,.55) 100%)'}} />
    </AbsoluteFill>
  );
};

/** A window onto the app recording: shows source rows [y0, y1] of the 720-wide recording at the given width */
const AppWindow: React.FC<{start: number; y0: number; y1: number; width: number; style?: React.CSSProperties}> = ({start, y0, y1, width, style}) => {
  const k = width / 720;
  return (
    <div style={{width, height: (y1 - y0) * k, overflow: 'hidden', borderRadius: 30, boxShadow: '0 24px 70px rgba(0,0,0,.6)', border: '3px solid rgba(255,255,255,.12)', background: '#202124', ...style}}>
      <OffthreadVideo src={staticFile(APP)} startFrom={sec(start)} muted style={{width, height: 1600 * k, transform: `translateY(${-y0 * k}px)`, display: 'block'}} />
    </div>
  );
};

const Panel: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{alignSelf: 'flex-start', background: 'rgba(15,15,14,.84)', borderRadius: 28, padding: '24px 36px 30px', ...style}}>{children}</div>
);

const H: React.FC<{children: React.ReactNode; size?: number}> = ({children, size = 84}) => (
  <div style={{fontSize: size, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{children}</div>
);
const Sub: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{fontSize: 50, fontWeight: 600, lineHeight: 1.22, color: '#D6D2CA', marginTop: 16, whiteSpace: 'pre-line'}}>{children}</div>
);

export const EntralpiLearn: React.FC<{content: EntralpiContent}> = ({content: c}) => {
  const {tl} = entralpiTimeline(c);
  const s = c.scenes;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      {/* 1. Hook on real footage */}
      <Sequence {...tl.hook}>
        <Out dur={tl.hook.durationInFrames}>
          <Body start={s.hook.body} zoom={[1, 1.04]} />
          <Safe justify="flex-end">
            <Panel style={useIn(4)}>
              <H size={88}>{s.hook.text}</H>
            </Panel>
          </Safe>
        </Out>
      </Sequence>

      {/* 2. Feet on the plate: slow push-in towards the feet */}
      <Sequence {...tl.plate}>
        <Out dur={tl.plate.durationInFrames}>
          <Body start={s.plate.body} zoom={[1.0, 1.4]} origin="50% 100%" />
          <Safe justify="flex-start">
            <Panel style={useIn(4)}>
              <H>{s.plate.title}</H>
              <Sub>{s.plate.body2}</Sub>
            </Panel>
          </Safe>
        </Out>
      </Sequence>

      {/* 3. Live load vs target: app gauge as picture-in-picture */}
      <Sequence {...tl.target}>
        <Out dur={tl.target.durationInFrames}>
          <TargetScene s={s.target} />
        </Out>
      </Sequence>

      {/* 4. Session log */}
      <Sequence {...tl.log}>
        <Out dur={tl.log.durationInFrames}>
          <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, #2f2e2c 0%, #151514 60%, #0F0F0E 100%)'}} />
          <Safe justify="flex-start">
            <div style={useIn(0)}>
              <H>{s.log.title}</H>
              <Sub>{s.log.sub}</Sub>
            </div>
            <div style={{...useIn(10), marginTop: 44, alignSelf: 'center', marginLeft: 60}}>
              <AppWindow start={s.log.app} y0={380} y1={1350} width={700} />
            </div>
          </Safe>
        </Out>
      </Sequence>

      {/* 5. Outro: reason to save, no product shot */}
      <Sequence {...tl.outro}>
        <Body start={s.hook.body + 1} />
        <AbsoluteFill style={{background: 'rgba(15,15,14,.72)'}} />
        <Safe>
          <div style={useIn(0)}>
            <H size={92}>{s.outro.title}</H>
          </div>
        </Safe>
      </Sequence>
    </AbsoluteFill>
  );
};

const TargetScene: React.FC<{s: EntralpiContent['scenes']['target']}> = ({s}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: f - 10, fps, config: {damping: 15}});
  return (
    <AbsoluteFill>
      <Body start={s.body} />
      <Safe justify="flex-start">
        <Panel style={useIn(4)}>
          <H>{s.title}</H>
          <div style={{alignSelf: 'flex-start', display: 'inline-block', marginTop: 18, background: C.accent, borderRadius: 16, padding: '6px 22px 10px', fontSize: 50, fontWeight: 800}}>{s.tag}</div>
        </Panel>
      </Safe>
      <div style={{position: 'absolute', right: 56, top: 1010, transform: `translateY(${(1 - pop) * 80}px) scale(${0.9 + pop * 0.1})`, opacity: pop, transformOrigin: 'right bottom'}}>
        <AppWindow start={s.app} y0={880} y1={1560} width={430} />
      </div>
    </AbsoluteFill>
  );
};
