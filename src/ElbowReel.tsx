import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sec} from './PPSReel';
import {SegmentView} from './MuscleOverlay';
import type {Segment} from './MuscleOverlay';

// "Your fingers got strong. Are your elbows ready?" – text-on-screen how-to with muscle overlays.
export type ElbowContent = {
  hook: {clip: string; dur: number; l1: string; l2: string; l2At: number};
  anatomy: {dur: number; steps: {at: number; title: string; sub?: string}[]};
  bridge: {dur: number; title: string};
  zoom: number;
  origin: string;
  segments: (Segment & {dur: number})[];
  plan: {dur: number; title: string; lines: string[]; note: string};
  outro: {dur: number; title: string};
};

export const elbowParts = (c: ElbowContent) => {
  const lens = [sec(c.hook.dur), sec(c.anatomy.dur), sec(c.bridge.dur), ...c.segments.map((s) => sec(s.dur)), sec(c.plan.dur), sec(c.outro.dur)];
  let t = 0;
  const from = lens.map((l) => {
    const f = t;
    t += l;
    return f;
  });
  return {lens, from, total: t};
};

const pop = (f: number, fps: number, d = 0) => spring({frame: f - d, fps, config: {damping: 16}});

const Card: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{display: 'inline-block', background: 'rgba(15,15,14,.9)', borderRadius: 28, padding: '22px 36px 30px', ...style}}>{children}</div>
);
const H: React.FC<{children: React.ReactNode; size?: number; color?: string}> = ({children, size = 88, color}) => (
  <div style={{fontSize: size, fontWeight: 800, lineHeight: 1.04, letterSpacing: -1.5, whiteSpace: 'pre-line', color}}>{children}</div>
);

const Hook: React.FC<{c: ElbowContent['hook']}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = pop(f, fps, 2), b = pop(f, fps, sec(c.l2At));
  const z = interpolate(f, [0, sec(c.dur)], [1.05, 1.15]);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <AbsoluteFill style={{transform: `scale(${z})`}}>
        <OffthreadVideo src={staticFile(c.clip)} style={{width: 1080, height: 1920, objectFit: 'cover'}} />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 70, right: 70, top: 300}}>
        <Card style={{opacity: a, transform: `translateY(${(1 - a) * -30}px)`}}>
          <H>{c.l1}</H>
          <div style={{height: b * 200, overflow: 'hidden', paddingTop: 10}}>
            <H color={C.ink}><span style={{background: C.accent, borderRadius: 12, padding: '0 14px 4px', marginLeft: -6, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone'}}>{c.l2}</span></H>
          </div>
        </Card>
      </div>
    </AbsoluteFill>
  );
};

// Own schematic drawing of a right elbow, front view (not a copy of any atlas image).
const ElbowDiagram: React.FC<{f: number; fps: number; musAt: number; load: number}> = ({f, fps, musAt, load}) => {
  const bones = interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  const mus = interpolate(f, [musAt, musAt + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dot = pop(f, fps, musAt + 10);
  const elbowLbl = pop(f, fps, 8);
  const pulse = 0.5 + 0.5 * Math.sin(f / 5);
  const bone = '#E9E4DA';
  const ME: [number, number] = [372, 610]; // medial epicondyle
  const spindle = (a: [number, number], b: [number, number], w: number) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
    return `M ${a[0]} ${a[1]} C ${a[0] + dx * 0.2 + nx * w} ${a[1] + dy * 0.2 + ny * w} ${a[0] + dx * 0.8 + nx * w} ${a[1] + dy * 0.8 + ny * w} ${b[0]} ${b[1]} C ${a[0] + dx * 0.8 - nx * w} ${a[1] + dy * 0.8 - ny * w} ${a[0] + dx * 0.2 - nx * w} ${a[1] + dy * 0.2 - ny * w} ${a[0]} ${a[1]} Z`;
  };
  const flexors: [number, number][] = [[400, 1240], [455, 1260], [515, 1250]];
  return (
    <svg width={1080} height={1150} viewBox="0 0 1080 1500" style={{position: 'absolute', left: 0, top: 560}}>
      <defs>
        <filter id="eglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <g opacity={bones}>
        {/* humerus */}
        <path d="M 470 40 L 590 40 L 600 470 C 640 520 690 560 700 615 C 660 650 600 660 545 650 C 500 670 440 665 405 640 C 370 630 350 615 360 595 C 395 570 440 520 470 470 Z" fill={bone} opacity={0.92} />
        {/* ulna */}
        <path d="M 455 665 C 480 700 520 700 540 680 L 520 1400 L 485 1400 Z" fill={bone} opacity={0.85} />
        {/* radius */}
        <path d="M 570 675 C 600 665 640 668 655 690 L 640 720 C 650 950 690 1200 720 1400 L 670 1400 C 640 1200 600 950 590 725 Z" fill={bone} opacity={0.85} />
      </g>
      <g opacity={mus}>
        {flexors.map((p, i) => (
          <path key={i} d={spindle(ME, p, 38)} fill="#C21A12" opacity={0.75} stroke="#FF6A5C" strokeWidth={3} />
        ))}
      </g>
      <g opacity={dot}>
        <circle cx={ME[0]} cy={ME[1]} r={36 + pulse * (18 + 30 * load)} fill="none" stroke={load > 0.5 ? '#FF6A5C' : '#FFFFFF'} strokeWidth={5 + 4 * load} opacity={0.6 + 0.3 * load} />
        <circle cx={ME[0]} cy={ME[1]} r={22} fill="#FFFFFF" filter="url(#eglow)" />
      </g>
      {/* elbow bracket */}
      <g opacity={elbowLbl} fontFamily={FONT} fontWeight={800}>
        <path d="M 760 520 L 800 520 L 800 760 L 760 760" fill="none" stroke="#FFFFFF" strokeWidth={6} />
        <text x={830} y={665} fill="#FFFFFF" fontSize={78}>ELBOW</text>
      </g>
      {/* labels */}
      <g opacity={mus} fontFamily={FONT} fontWeight={800} fontSize={44} letterSpacing={1.5}>
        <line x1={455} y1={1150} x2={250} y2={1210} stroke="#FFF" strokeWidth={4} />
        <rect x={0} y={1182} width={390} height={66} rx={12} fill={C.accent} />
        <text x={16} y={1230} fill={C.ink}>FINGER FLEXORS</text>
      </g>
      <g opacity={dot} fontFamily={FONT} fontWeight={800} fontSize={44} letterSpacing={1.5}>
        <line x1={ME[0] - 30} y1={ME[1] - 10} x2={200} y2={520} stroke="#FFF" strokeWidth={4} />
        <rect x={0} y={447} width={360} height={66} rx={12} fill="#FFFFFF" />
        <text x={16} y={495} fill={C.bg}>INSIDE ELBOW</text>
      </g>
    </svg>
  );
};

const Anatomy: React.FC<{c: ElbowContent['anatomy']}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const steps = c.steps;
  const k = Math.max(0, steps.map((x) => sec(x.at)).filter((a) => f >= a).length - 1);
  const st = steps[k];
  const lf = f - sec(st.at);
  const t = pop(lf, fps, 2);
  const out = k < steps.length - 1 ? interpolate(f, [sec(steps[k + 1].at) - 6, sec(steps[k + 1].at)], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const musAt = steps.length > 1 ? sec(steps[1].at) : 30;
  const load = steps.length > 2 ? interpolate(f, [sec(steps[2].at), sec(steps[2].at) + 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #2a2826 0%, #151514 60%, #0F0F0E 100%)', fontFamily: FONT, color: C.ink}}>
      <ElbowDiagram f={f} fps={fps} musAt={musAt} load={load} />
      <div style={{position: 'absolute', left: 70, right: 70, top: 270, opacity: t * out, transform: `translateY(${(1 - t) * 30}px)`}}>
        <H size={76}>{st.title}</H>
        {st.sub && <div style={{fontSize: 48, fontWeight: 600, color: '#D6D2CA', marginTop: 14, whiteSpace: 'pre-line'}}>{st.sub}</div>}
      </div>
    </AbsoluteFill>
  );
};

const Bridge: React.FC<{c: ElbowContent['bridge']}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(f, fps, 2);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT, color: C.ink}}>
      <div style={{position: 'absolute', left: 70, right: 70, top: 820, opacity: p, transform: `scale(${0.92 + p * 0.08})`}}>
        <H size={96}>{c.title}</H>
      </div>
    </AbsoluteFill>
  );
};

const Plan: React.FC<{c: ElbowContent['plan']}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, #2a2826 0%, #151514 60%, #0F0F0E 100%)', fontFamily: FONT, color: C.ink}}>
      <div style={{position: 'absolute', left: 80, right: 80, top: 360}}>
        <div style={{opacity: pop(f, fps, 2)}}><H size={92}>{c.title}</H></div>
        {c.lines.map((l, i) => {
          const q = pop(f, fps, 10 + i * 9);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, marginTop: 40, opacity: q, transform: `translateX(${(1 - q) * -40}px)`}}>
              <div style={{width: 22, height: 22, borderRadius: 11, background: C.accent, flexShrink: 0}} />
              <div style={{fontSize: 62, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1}}>{l}</div>
            </div>
          );
        })}
        <div style={{fontSize: 42, fontWeight: 600, color: '#BDB8AF', marginTop: 60, opacity: pop(f, fps, 10 + c.lines.length * 9 + 6)}}>{c.note}</div>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{c: ElbowContent['outro']}> = ({c}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = pop(f, fps, 2);
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT, color: C.ink, justifyContent: 'center', padding: '0 80px'}}>
      <div style={{opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}><H size={96}>{c.title}</H></div>
    </AbsoluteFill>
  );
};

export const ElbowReel: React.FC<{content: ElbowContent}> = ({content: c}) => {
  const {lens, from} = elbowParts(c);
  const n = c.segments.length;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Sequence from={from[0]} durationInFrames={lens[0]}><Hook c={c.hook} /></Sequence>
      <Sequence from={from[1]} durationInFrames={lens[1]}><Anatomy c={c.anatomy} /></Sequence>
      <Sequence from={from[2]} durationInFrames={lens[2]}><Bridge c={c.bridge} /></Sequence>
      {c.segments.map((s, i) => (
        <Sequence key={i} from={from[3 + i]} durationInFrames={lens[3 + i]}><SegmentView s={s} zoom={c.zoom} origin={c.origin} /></Sequence>
      ))}
      <Sequence from={from[3 + n]} durationInFrames={lens[3 + n]}><Plan c={c.plan} /></Sequence>
      <Sequence from={from[4 + n]} durationInFrames={lens[4 + n]}><Outro c={c.outro} /></Sequence>
    </AbsoluteFill>
  );
};
