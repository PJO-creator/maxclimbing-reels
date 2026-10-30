import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, Out, Safe, sec, useIn} from './PPSReel';

// Entralpi "how to" reel: hangboarding at your level instead of full bodyweight.
// Product is the tool, not the subject: no name/price in the video (caption only).
type Scene = {dur: number; title: string; sub?: string};
export type EntralpiContent = {
  scenes: {
    hook: Scene & {body: number};
    plate: Scene & {body: number; label: string};
    plan: Scene & {body: number; app: number};
    target: Scene & {body: number; app: number; tag: string};
    log: Scene & {app: number};
    outro: Scene & {body: number};
  };
};
const ORDER = ['hook', 'plate', 'plan', 'target', 'log', 'outro'] as const;

export const entralpiTimeline = (c: EntralpiContent) => {
  let t = 0;
  const tl = {} as Record<(typeof ORDER)[number], {from: number; durationInFrames: number}>;
  for (const k of ORDER) {
    const d = sec(c.scenes[k].dur);
    tl[k] = {from: t, durationInFrames: d};
    t += d;
  }
  return {tl, total: t};
};

const BODY = 'clips/entralpi/body.mp4';
const APP = 'clips/entralpi/app.mp4'; // 720x1600 screen recording, resampled to 30 fps

const Body: React.FC<{start: number; zoom?: [number, number]; origin?: string; dim?: number}> = ({start, zoom = [1, 1], origin = '50% 50%', dim = 0}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const z = interpolate(f, [0, durationInFrames], zoom);
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile(BODY)} startFrom={sec(start)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, transformOrigin: origin}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,.55) 100%)'}} />
      {dim > 0 && <AbsoluteFill style={{background: `rgba(15,15,14,${dim})`}} />}
    </AbsoluteFill>
  );
};

/** Full app screen inside a phone frame */
const Phone: React.FC<{start: number; width: number; style?: React.CSSProperties}> = ({start, width, style}) => {
  const bezel = Math.round(width * 0.035);
  const inner = width - bezel * 2;
  return (
    <div style={{width, padding: bezel, borderRadius: width * 0.12, background: '#0b0b0b', border: '2px solid #3a3a3a', boxShadow: '0 30px 90px rgba(0,0,0,.65)', ...style}}>
      <div style={{width: inner, height: (inner * 1600) / 720, borderRadius: width * 0.09, overflow: 'hidden'}}>
        <OffthreadVideo src={staticFile(APP)} startFrom={sec(start)} muted style={{width: '100%', height: '100%', display: 'block'}} />
      </div>
    </div>
  );
};

const usePop = (delay = 8) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - delay, fps, config: {damping: 16}});
  return {opacity: p, transform: `translateY(${(1 - p) * 90}px) scale(${0.92 + p * 0.08})`};
};

const Panel: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{alignSelf: 'flex-start', background: 'rgba(15,15,14,.84)', borderRadius: 28, padding: '24px 36px 30px', ...style}}>{children}</div>
);
const H: React.FC<{children: React.ReactNode; size?: number}> = ({children, size = 84}) => (
  <div style={{fontSize: size, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{children}</div>
);
const Sub: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{fontSize: 48, fontWeight: 600, lineHeight: 1.22, color: '#D6D2CA', marginTop: 14, whiteSpace: 'pre-line'}}>{children}</div>
);
const Title: React.FC<{s: Scene; panel?: boolean; size?: number}> = ({s, panel = true, size}) => {
  const inner = (
    <>
      <H size={size}>{s.title}</H>
      {s.sub && <Sub>{s.sub}</Sub>}
    </>
  );
  return panel ? <Panel style={useIn(4)}>{inner}</Panel> : <div style={useIn(0)}>{inner}</div>;
};

/** Arrow + label pointing at the plate under the feet */
const PlateArrow: React.FC<{label: string}> = ({label}) => {
  const f = useCurrentFrame();
  const draw = interpolate(f, [14, 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const bob = Math.sin(f / 6) * 6 * draw;
  const x1 = 820, y1 = 1330, x2 = 640, y2 = 1700 + bob;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={x1} y1={y1} x2={x1 + Math.cos(ang) * len * draw} y2={y1 + Math.sin(ang) * len * draw} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
        {draw > 0.98 && (
          <polygon
            points={`${x2},${y2} ${x2 - Math.cos(ang - 0.45) * 46},${y2 - Math.sin(ang - 0.45) * 46} ${x2 - Math.cos(ang + 0.45) * 46},${y2 - Math.sin(ang + 0.45) * 46}`}
            fill={C.ink}
          />
        )}
      </svg>
      <div style={{position: 'absolute', left: x1 - 190, top: y1 - 100, opacity: Math.min(1, draw * 2), background: C.accent, borderRadius: 18, padding: '8px 24px 12px', fontSize: 50, fontWeight: 800, whiteSpace: 'nowrap'}}>{label}</div>
    </AbsoluteFill>
  );
};

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
            <Title s={s.hook} size={88} />
          </Safe>
        </Out>
      </Sequence>

      {/* 2. Feet on the plate + arrow */}
      <Sequence {...tl.plate}>
        <Out dur={tl.plate.durationInFrames}>
          <Body start={s.plate.body} zoom={[1.0, 1.25]} origin="50% 100%" />
          <PlateArrow label={s.plate.label} />
          <Safe justify="flex-start">
            <Title s={s.plate} />
          </Safe>
        </Out>
      </Sequence>

      {/* 3. Choose your training: full app */}
      <Sequence {...tl.plan}>
        <Out dur={tl.plan.durationInFrames}>
          <Body start={s.plan.body} dim={0.6} />
          <Safe justify="flex-start">
            <Title s={s.plan} panel={false} />
          </Safe>
          <div style={{position: 'absolute', left: 0, right: 0, top: 600, display: 'flex', justifyContent: 'center'}}>
            <div style={usePop(6)}>
              <Phone start={s.plan.app} width={480} />
            </div>
          </div>
        </Out>
      </Sequence>

      {/* 4. Hang at exactly that load: body + live app */}
      <Sequence {...tl.target}>
        <Out dur={tl.target.durationInFrames}>
          <Body start={s.target.body} />
          <Safe justify="flex-start">
            <Panel style={useIn(4)}>
              <H>{s.target.title}</H>
              <div style={{display: 'inline-block', marginTop: 18, background: C.accent, borderRadius: 16, padding: '6px 22px 10px', fontSize: 50, fontWeight: 800}}>{s.target.tag}</div>
            </Panel>
          </Safe>
          <div style={{position: 'absolute', right: 50, top: 700, ...usePop(10)}}>
            <Phone start={s.target.app} width={390} />
          </div>
        </Out>
      </Sequence>

      {/* 5. Session log: full app */}
      <Sequence {...tl.log}>
        <Out dur={tl.log.durationInFrames}>
          <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 60%, #2f2e2c 0%, #151514 60%, #0F0F0E 100%)'}} />
          <Safe justify="flex-start">
            <Title s={s.log} panel={false} />
          </Safe>
          <div style={{position: 'absolute', left: 0, right: 0, top: 600, display: 'flex', justifyContent: 'center'}}>
            <div style={usePop(6)}>
              <Phone start={s.log.app} width={480} />
            </div>
          </div>
        </Out>
      </Sequence>

      {/* 6. Outro: reason to save, no product shot */}
      <Sequence {...tl.outro}>
        <Body start={s.outro.body} dim={0.62} />
        <Safe>
          <Title s={s.outro} panel={false} size={92} />
        </Safe>
      </Sequence>
    </AbsoluteFill>
  );
};
