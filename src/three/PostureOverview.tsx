import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {C, FONT} from '../PPSReel';
import {CamKey, camAt, V3} from './camera';
import {POSES, Pose, lerpPose} from './Mannequin';
import {MuscleName} from './BotRig';
import {useBot} from './BotTest';

/**
 * Climber posture, ep. 1 (overview): per body part
 *   pulled IN by (orange)  →  pulled OUT by (red)  →  that part straightens.
 * Order: upper back, arm rotation, elbows, wrists & hands. Each part gets its own episode later.
 */

const FOV = 30;
export const IN = '#FFB020';
export const OUT = '#E8261F';

// exaggerated on purpose: the message has to land in one glance
export const HUNCH: Pose = {...POSES.hunched, lumbarFlex: -9, thoracicFlex: 34, neckFlex: 30, headExt: 64, protract: 26, elevate: 8, armFlex: 26, armAbd: 4, intRot: 42, elbowFlex: 62, pronation: 85, wristFlex: 55, fist: 1, kneeFlex: 4};
const UP = POSES.upright;

export type Part = {
  title: string;
  keys: (keyof Pose)[];
  pullIn: {muscles: MuscleName[]; names: string};
  pullOut: {muscles: MuscleName[]; names: string};
  cam: {pos: V3; at: V3};
  /** camera during 'pull out' (to see the other side) */
  camOut?: {pos: V3; at: V3};
};

export const PARTS: Part[] = [
  {
    title: 'Upper back',
    // the head comes along with the upper back (no separate neck claim)
    keys: ['thoracicFlex', 'lumbarFlex', 'protract', 'elevate', 'armFlex', 'kneeFlex', 'neckFlex', 'headExt'],
    pullIn: {muscles: ['pecs'], names: 'Chest'},
    pullOut: {muscles: ['traps'], names: 'Mid & lower traps'},
    cam: {pos: [110, 136, 290], at: [0, 128, 0]},
    camOut: {pos: [175, 140, -230], at: [0, 130, 0]},
  },
  {
    title: 'Arms rotated in',
    keys: ['intRot', 'armAbd'],
    pullIn: {muscles: ['pecs', 'lats'], names: 'Chest & lats'},
    pullOut: {muscles: ['cuff'], names: 'Rotator cuff'},
    cam: {pos: [190, 132, 225], at: [0, 126, 0]},
    camOut: {pos: [200, 136, -215], at: [0, 128, 0]},
  },
  {
    title: 'Elbows',
    keys: ['elbowFlex'],
    pullIn: {muscles: ['biceps'], names: 'Biceps & brachialis'},
    pullOut: {muscles: ['triceps'], names: 'Triceps'},
    cam: {pos: [170, 128, 215], at: [8, 118, 4]},
    camOut: {pos: [215, 128, -150], at: [10, 120, 0]},
  },
  {
    title: 'Wrists & hands',
    keys: ['wristFlex', 'fist', 'pronation'],
    pullIn: {muscles: ['flexors'], names: 'Finger & wrist flexors'},
    pullOut: {muscles: ['extensors'], names: 'Finger & wrist extensors'},
    cam: {pos: [235, 118, -190], at: [10, 110, 6]},
    camOut: {pos: [230, 120, 205], at: [10, 110, 8]},
  },
];

// ---- timeline (frames @30fps) ----
// Rule: the camera never moves while new text appears. Move → stop → glow + text → read → next.
const HOOK = 120;
const SEG = 228;
const OUTRO = 100;
const segStart = (i: number) => HOOK + i * SEG;
// within a segment
const T = {
  camIn: 30, // camera arrives at the "pull in" view
  inOn: 36, // orange glow + caption
  inOff: 100, // caption + glow out
  camOut: [112, 144] as [number, number], // camera moves to the other side (no text)
  outOn: 146, // red glow + caption
  straighten: [184, 218] as [number, number], // the part straightens, caption stays
  tick: 214, // list item gets its check mark
};
export const POSTURE_OVERVIEW_DURATION = HOOK + PARTS.length * SEG + OUTRO;

const ease = Easing.inOut(Easing.cubic);
const ramp = (f: number, a: number, b: number) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
const fade = (f: number, a: number, b: number, c: number, d: number) =>
  interpolate(f, [a, b, c, d], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const SIDE: {pos: V3; at: V3} = {pos: [330, 128, 18], at: [0, 118, 16]};
const FULL: {pos: V3; at: V3} = {pos: [250, 130, 270], at: [0, 112, 0]};

const drift = (v: {pos: V3; at: V3}, k = 0.965): {pos: V3; at: V3} => ({pos: v.pos.map((x, j) => (j === 1 ? x : x * k)) as V3, at: v.at});
const KEYS: CamKey[] = (() => {
  const k: CamKey[] = [
    {f: 0, ...SIDE},
    {f: HOOK - 16, ...drift(SIDE, 0.97)},
  ];
  PARTS.forEach((p, i) => {
    const s = segStart(i);
    const out = p.camOut ?? p.cam;
    k.push({f: s + T.camIn, ...p.cam});
    k.push({f: s + T.camOut[0], ...drift(p.cam)});
    k.push({f: s + T.camOut[1], ...out});
    k.push({f: s + SEG - 14, ...drift(out)});
  });
  k.push({f: POSTURE_OVERVIEW_DURATION - 50, ...FULL});
  k.push({f: POSTURE_OVERVIEW_DURATION, ...drift(FULL, 0.97)});
  return k;
})();

/** Persistent list of the 4 parts: current one highlighted, finished ones checked. */
const Checklist: React.FC<{f: number}> = ({f}) => {
  const o = fade(f, 40, 54, POSTURE_OVERVIEW_DURATION - OUTRO, POSTURE_OVERVIEW_DURATION - OUTRO + 10);
  if (o <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 40, top: 360, opacity: o, background: 'rgba(15,15,14,0.72)', borderRadius: 24, padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 12}}>
      {PARTS.map((p, i) => {
        const s = segStart(i);
        const active = f >= s && f < s + SEG;
        const done = f >= s + T.tick;
        const pop = active ? ramp(f, s, s + 12) : 0;
        return (
          <div key={p.title} style={{display: 'flex', alignItems: 'center', gap: 14, opacity: active || done || f < HOOK ? 1 : 0.45, transform: `scale(${1 + 0.08 * pop})`, transformOrigin: 'left center'}}>
            <div style={{width: 46, height: 46, borderRadius: 23, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, background: done ? '#2E9E5B' : active ? C.ink : 'rgba(255,255,255,0.12)', color: done ? '#fff' : active ? '#0F0F0E' : C.ink}}>
              {done ? '✓' : i + 1}
            </div>
            <div style={{fontSize: 40, fontWeight: active ? 800 : 700, letterSpacing: -0.5, color: done && !active ? '#B9B5AD' : C.ink}}>{p.title}</div>
          </div>
        );
      })}
    </div>
  );
};

export const Env: React.FC = () => {
  const {gl, scene} = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    (scene as unknown as {environmentIntensity: number}).environmentIntensity = 0.65;
  }, [gl, scene]);
  return null;
};
const Cam: React.FC<{pos: V3; at: V3}> = ({pos, at}) => {
  const {camera} = useThree();
  camera.position.set(...pos);
  camera.lookAt(...at);
  return null;
};

export const Text: React.FC<{o: number; top: number; size: number; children: React.ReactNode; weight?: number}> = ({o, top, size, children, weight = 800}) =>
  o <= 0 ? null : (
    <div style={{position: 'absolute', left: 50, right: 50, top, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div style={{textAlign: 'center', fontSize: size, fontWeight: weight, letterSpacing: size > 80 ? -2.5 : -1, lineHeight: 1.08, background: 'rgba(15,15,14,0.78)', borderRadius: 26, padding: '16px 34px 20px'}}>{children}</div>
    </div>
  );

/** collapse: variant B — the figure starts upright and slumps into the hunch in the first second */
export const PostureOverview: React.FC<{collapse?: boolean}> = ({collapse = false}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const rig = useBot('models/Mannequin.fbx');

  // pose: each part straightens in its own segment
  const t: Partial<Record<keyof Pose, number>> = {};
  PARTS.forEach((p, i) => {
    const s = segStart(i);
    const v = ramp(f, s + T.straighten[0], s + T.straighten[1]);
    p.keys.forEach((k) => (t[k] = Math.max(t[k] ?? 0, v)));
  });
  const pose = collapse && f < 40 ? lerpPose(UP, HUNCH, Easing.in(Easing.quad)(Math.min(1, Math.max(0, (f - 3) / 27)))) : lerpPose(HUNCH, UP, t);

  // muscles
  const amt: Partial<Record<MuscleName, number>> = {};
  const col: Partial<Record<MuscleName, string>> = {};
  PARTS.forEach((p, i) => {
    const s = segStart(i);
    const a = fade(f, s + T.inOn, s + T.inOn + 12, s + T.inOff, s + T.inOff + 10);
    const b = fade(f, s + T.outOn, s + T.outOn + 12, s + SEG - 12, s + SEG);
    // a muscle can appear in several parts: keep the strongest glow
    p.pullIn.muscles.forEach((m) => {
      if (a >= (amt[m] ?? 0)) col[m] = IN;
      amt[m] = Math.max(amt[m] ?? 0, a);
    });
    p.pullOut.muscles.forEach((m) => {
      if (b >= (amt[m] ?? 0)) col[m] = OUT;
      amt[m] = Math.max(amt[m] ?? 0, b);
    });
  });
  if (rig) {
    rig.apply(pose);
    rig.setMuscles(amt, col);
  }
  const cam = camAt(KEYS, f);

  const seg = Math.floor((f - HOOK) / SEG);
  const part = f >= HOOK && seg < PARTS.length ? PARTS[seg] : null;
  const s = part ? segStart(seg) : 0;

  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, #4a4844 0%, #262523 45%, #0F0F0E 100%)'}}>
      {rig && (
        <ThreeCanvas width={width} height={height} camera={{fov: FOV, near: 1, far: 3000}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping}}>
          <Env />
          <Cam pos={cam.pos} at={cam.at} />
          <ambientLight intensity={0.22} />
          <directionalLight position={[160, 260, 220]} intensity={1.5} />
          <directionalLight position={[-220, 80, 120]} intensity={0.4} color="#dfe6ff" />
          <directionalLight position={[0, 220, -300]} intensity={1.5} />
          <directionalLight position={[-260, -40, -200]} intensity={0.7} color="#ffd2c2" />
          <primitive object={rig.root} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{fontFamily: FONT, color: C.ink}}>
        {/* hook */}
        <Text o={collapse ? fade(f, -1, 0, HOOK - 14, HOOK) : fade(f, 0, 6, HOOK - 14, HOOK)} top={150} size={64} weight={700}>
          <span style={{color: '#B9B5AD'}}>Climbers,</span>
        </Text>
        <Text o={collapse ? fade(f, -1, 0, HOOK - 14, HOOK) : fade(f, 4, 12, HOOK - 14, HOOK)} top={225} size={112}>recognize this?</Text>
        <Text o={fade(f, 60, 72, HOOK - 10, HOOK)} top={1500} size={60}>
          4 things pull you
          <br />
          into this shape.
        </Text>

        <Checklist f={f} />

        {/* per part: caption only while the camera stands still */}
        {part && (
          <>
            <Text o={fade(f, s + T.inOn + 4, s + T.inOn + 14, s + T.inOff - 4, s + T.inOff + 6)} top={1450} size={52} weight={700}>
              <span style={{color: '#B9B5AD'}}>{part.title}: pulled in by</span>
              <br />
              <span style={{color: IN, fontSize: 76, fontWeight: 800}}>{part.pullIn.names}</span>
            </Text>
            <Text o={fade(f, s + T.outOn + 4, s + T.outOn + 14, s + SEG - 12, s + SEG)} top={1450} size={52} weight={700}>
              <span style={{color: '#B9B5AD'}}>Pulled back by</span>
              <br />
              <span style={{color: '#FF4A3D', fontSize: 76, fontWeight: 800}}>{part.pullOut.names}</span>
            </Text>
          </>
        )}

        {/* outro */}
        <Text o={fade(f, POSTURE_OVERVIEW_DURATION - OUTRO + 10, POSTURE_OVERVIEW_DURATION - OUTRO + 22, 9999, 10000)} top={160} size={72}>
          Climbing trains
          <br />
          what pulls you in.
          <br />
          <span style={{color: '#FF4A3D'}}>Train what</span>
          <br />
          <span style={{color: '#FF4A3D'}}>pulls you back.</span>
        </Text>
        <Text o={fade(f, POSTURE_OVERVIEW_DURATION - OUTRO + 30, POSTURE_OVERVIEW_DURATION - OUTRO + 42, 9999, 10000)} top={1520} size={56} weight={700}>
          Follow: one fix per part,
          <br />
          <span style={{color: '#B9B5AD'}}>every week.</span>
        </Text>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
