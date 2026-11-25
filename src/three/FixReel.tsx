import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {C, FONT} from '../PPSReel';
import {V3} from './camera';
import {POSES, Pose, lerpPose} from './Mannequin';
import {MuscleName} from './BotRig';
import {useBot} from './BotTest';
import {Env, IN, OUT} from './PostureOverview';

/**
 * "Fix" episode of the climber-posture series: real footage first (hook), a short anatomy
 * beat on the Mannequin (what pulls in vs what pulls back), then the exercises and the plan.
 * Everything comes from FixContent, so a new fix = new JSON-like object.
 */

const FPS = 30;
const sec = (s: number) => Math.round(s * FPS);

type Clip = {src: string; from: number; dur: number};
export type FixContent = {
  hook: Clip & {l1: string; l2: string; l2At: number};
  anatomy: {
    dur: number;
    pose: Partial<Pose>;
    cam: {pos: V3; at: V3};
    pullIn: {muscles: MuscleName[]; text: string};
    pullOut: {muscles: MuscleName[]; text: string};
  };
  exercises: (Clip & {title: string; cue: string})[];
  plan: {dur: number; lines: string[]; note: string};
  outro: {dur: number; title: string};
};

export const fixParts = (c: FixContent) => {
  const hook = sec(c.hook.dur);
  const anat = sec(c.anatomy.dur);
  const ex = c.exercises.map((e) => sec(e.dur));
  const plan = sec(c.plan.dur);
  const outro = sec(c.outro.dur);
  return {hook, anat, ex, plan, outro, total: hook + anat + ex.reduce((a, b) => a + b, 0) + plan + outro};
};

const fade = (f: number, a: number, b: number, c: number, d: number) =>
  interpolate(f, [a, b, c, d], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const ease = Easing.inOut(Easing.cubic);

const Box: React.FC<{o: number; top: number; children: React.ReactNode; size?: number; weight?: number}> = ({o, top, children, size = 64, weight = 800}) =>
  o <= 0 ? null : (
    <div style={{position: 'absolute', left: 50, right: 50, top, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div style={{textAlign: 'center', fontSize: size, fontWeight: weight, letterSpacing: size > 80 ? -2.5 : -1, lineHeight: 1.08, background: 'rgba(15,15,14,0.78)', borderRadius: 26, padding: '16px 34px 20px'}}>{children}</div>
    </div>
  );

const Video: React.FC<{clip: Clip}> = ({clip}) => (
  <OffthreadVideo src={staticFile(clip.src)} startFrom={sec(clip.from)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
);

const Cam: React.FC<{pos: V3; at: V3}> = ({pos, at}) => {
  const {camera} = useThree();
  camera.position.set(...pos);
  camera.lookAt(...at);
  return null;
};

const Anatomy: React.FC<{c: FixContent['anatomy']; dur: number}> = ({c, dur}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const rig = useBot('models/Mannequin.fbx');
  const half = Math.round(dur / 2);
  const a = fade(f, 6, 16, half - 6, half + 4);
  const b = fade(f, half, half + 10, dur + 10, dur + 11);
  if (rig) {
    rig.apply(lerpPose(POSES.upright, {...POSES.upright, ...c.pose}, 1));
    rig.root.rotation.set(0, 0, 0);
    const amt: Partial<Record<MuscleName, number>> = {};
    const col: Partial<Record<MuscleName, string>> = {};
    c.pullIn.muscles.forEach((m) => ((amt[m] = a), (col[m] = IN)));
    c.pullOut.muscles.forEach((m) => ((amt[m] = Math.max(amt[m] ?? 0, b)), b > a && (col[m] = OUT)));
    rig.setMuscles(amt, col);
  }
  // slow push-in
  const k = 1 - 0.06 * ease(Math.min(1, f / dur));
  const pos = c.cam.pos.map((v, i) => (i === 1 ? v : v * k)) as V3;
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, #4a4844 0%, #262523 45%, #0F0F0E 100%)'}}>
      {rig && (
        <ThreeCanvas width={width} height={height} camera={{fov: 30, near: 1, far: 3000}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping}}>
          <Env />
          <Cam pos={pos} at={c.cam.at} />
          <ambientLight intensity={0.22} />
          <directionalLight position={[160, 260, 220]} intensity={1.5} />
          <directionalLight position={[-220, 80, 120]} intensity={0.4} color="#dfe6ff" />
          <directionalLight position={[0, 220, -300]} intensity={1.5} />
          <directionalLight position={[-260, -40, -200]} intensity={0.7} color="#ffd2c2" />
          <primitive object={rig.root} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{fontFamily: FONT, color: C.ink}}>
        <Box o={a} top={1430} size={58}>
          <span dangerouslySetInnerHTML={{__html: c.pullIn.text.replace(/\*(.+?)\*/g, `<span style="color:${IN}">$1</span>`)}} />
        </Box>
        <Box o={b} top={1430} size={58}>
          <span dangerouslySetInnerHTML={{__html: c.pullOut.text.replace(/\*(.+?)\*/g, `<span style="color:#FF4A3D">$1</span>`)}} />
        </Box>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const FixReel: React.FC<{content: FixContent}> = ({content: c}) => {
  const f = useCurrentFrame();
  const p = fixParts(c);
  let at = 0;
  const hookAt = at;
  at += p.hook;
  const anatAt = at;
  at += p.anat;
  const exAt = p.ex.map((d) => {
    const s = at;
    at += d;
    return s;
  });
  const planAt = at;
  at += p.plan;
  const outroAt = at;

  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: FONT, color: C.ink}}>
      {/* hook: real footage */}
      <Sequence from={hookAt} durationInFrames={p.hook}>
        <Video clip={c.hook} />
        <AbsoluteFill>
          <Box o={fade(f - hookAt, -1, 0, p.hook - 4, p.hook)} top={170} size={96}>
            {c.hook.l1}
            {f - hookAt >= sec(c.hook.l2At) && (
              <>
                <br />
                <span style={{color: '#FF4A3D'}}>{c.hook.l2}</span>
              </>
            )}
          </Box>
        </AbsoluteFill>
      </Sequence>

      {/* anatomy on the Mannequin */}
      <Sequence from={anatAt} durationInFrames={p.anat}>
        <Anatomy c={c.anatomy} dur={p.anat} />
      </Sequence>

      {/* exercises */}
      {c.exercises.map((e, i) => (
        <Sequence key={e.title} from={exAt[i]} durationInFrames={p.ex[i]}>
          <Video clip={e} />
          <AbsoluteFill>
            <div style={{position: 'absolute', left: 40, top: 150, opacity: fade(f - exAt[i], 0, 8, p.ex[i] - 6, p.ex[i]), display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(15,15,14,0.8)', borderRadius: 22, padding: '14px 26px'}}>
              <div style={{width: 56, height: 56, borderRadius: 28, background: '#FF4A3D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800}}>{i + 1}</div>
              <div style={{fontSize: 54, fontWeight: 800, letterSpacing: -1}}>{e.title}</div>
            </div>
            <Box o={fade(f - exAt[i], 10, 20, p.ex[i] - 6, p.ex[i])} top={1500} size={50} weight={700}>
              <span dangerouslySetInnerHTML={{__html: e.cue}} />
            </Box>
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* plan card over the last exercise frame */}
      <Sequence from={planAt} durationInFrames={p.plan}>
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, #3a3835 0%, #1c1b19 55%, #0F0F0E 100%)', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{opacity: fade(f - planAt, 0, 10, 9999, 10000), textAlign: 'center'}}>
            <div style={{fontSize: 48, fontWeight: 700, color: '#B9B5AD', marginBottom: 24}}>How to train it</div>
            {c.plan.lines.map((l, i) => (
              <div key={l} style={{fontSize: 86, fontWeight: 800, letterSpacing: -2, lineHeight: 1.15, opacity: fade(f - planAt, 8 + i * 6, 16 + i * 6, 9999, 10000)}}>{l}</div>
            ))}
            <div style={{fontSize: 40, fontWeight: 600, color: '#8C8A85', marginTop: 40}}>{c.plan.note}</div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={outroAt} durationInFrames={p.outro}>
        <AbsoluteFill style={{background: C.bg, alignItems: 'center', justifyContent: 'center'}}>
          <div style={{fontSize: 84, fontWeight: 800, letterSpacing: -2, textAlign: 'center', lineHeight: 1.1, opacity: fade(f - outroAt, 0, 8, 9999, 10000)}} dangerouslySetInnerHTML={{__html: c.outro.title.replace(/\n/g, '<br/>')}} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
