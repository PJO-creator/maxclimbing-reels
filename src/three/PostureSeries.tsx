import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {C, FONT} from '../PPSReel';
import {CamKey, camAt, V3} from './camera';
import {POSES, Pose, lerpPose} from './Mannequin';
import {MuscleName} from './BotRig';
import {useBot} from './BotTest';
import {Env, HUNCH, IN, OUT, PARTS, Part, Text} from './PostureOverview';

/**
 * Split episodes of the climber-posture overview: same recipe, fewer parts, its own hook.
 *  - "wake": lying in bed with arms curled → elbows, wrists & hands
 *  - "stand": standing hunched with arms rotated in → upper back, arm rotation
 */

const FOV = 30;
const UP = POSES.upright;

type View = {pos: V3; at: V3; up?: V3};
type SeriesConfig = {
  parts: Part[];
  hookL1: string;
  hookL2: string;
  hookSub: string;
  /** pose the figure collapses into (standing) */
  start: Pose;
  /** pose before the collapse */
  relaxed: Pose;
  /** optional bed scene during the hook: figure lies on its side, then cut to standing */
  bed?: {lying: Pose; relaxed: Pose; cam: View};
  hookCam: View;
};

const byTitle = (t: string) => PARTS.find((p) => p.title === t)!;

export const SERIES: Record<'wake' | 'stand', SeriesConfig> = {
  wake: {
    parts: [byTitle('Elbows'), byTitle('Wrists & hands')],
    hookL1: 'Climbers,',
    hookL2: 'do you also wake up like this?',
    hookSub: 'Arms bent. Wrists curled. Fists.',
    start: {...UP, armFlex: 14, intRot: 28, elbowFlex: 105, pronation: 70, wristFlex: 60, fist: 1},
    relaxed: UP,
    bed: {
      lying: {...UP, thoracicFlex: 12, neckFlex: 10, headExt: 4, armFlex: 55, armAbd: 0, intRot: 18, elbowFlex: 125, pronation: 45, wristFlex: 65, fist: 1},
      relaxed: {...UP, thoracicFlex: 12, neckFlex: 10, headExt: 4, armFlex: 45, armAbd: 0, intRot: 5, elbowFlex: 25, pronation: 10, wristFlex: 0, fist: 0.15},
      cam: {pos: [112, 300, 175], at: [132, -12, 6], up: [1, 0, 0]},
    },
    hookCam: {pos: [215, 128, 230], at: [0, 120, 0]},
  },
  stand: {
    parts: [byTitle('Upper back'), byTitle('Arms rotated in')],
    hookL1: 'Climbers,',
    hookL2: 'do you also stand like this?',
    hookSub: 'Shoulders forward. Arms rotated in.',
    start: {...HUNCH, elbowFlex: 14, pronation: 45, wristFlex: 6, fist: 0.3, intRot: 52, armFlex: 12},
    relaxed: UP,
    hookCam: {pos: [330, 128, 18], at: [0, 118, 4]},
  },
};

const HOOK = 120;
const SEG = 228;
const OUTRO = 100;
const T = {camIn: 30, inOn: 36, inOff: 100, camOut: [112, 144] as [number, number], outOn: 146, straighten: [184, 218] as [number, number], tick: 214};
export const seriesDuration = (c: SeriesConfig) => HOOK + c.parts.length * SEG + OUTRO;

const ease = Easing.inOut(Easing.cubic);
const ramp = (f: number, a: number, b: number) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
const fade = (f: number, a: number, b: number, c: number, d: number) =>
  interpolate(f, [a, b, c, d], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const drift = (v: View, k = 0.965): View => ({pos: v.pos.map((x, j) => (j === 1 ? x : x * k)) as V3, at: v.at});
const FULL: View = {pos: [250, 130, 270], at: [0, 112, 0]};

const Cam: React.FC<View> = ({pos, at, up}) => {
  const {camera} = useThree();
  camera.up.set(...(up ?? [0, 1, 0]));
  camera.position.set(...pos);
  camera.lookAt(...at);
  return null;
};

/** simple bed: mattress, pillow, duvet over the legs. Figure lies along +X (head at ~x=170), left side down. */
const Bed: React.FC = () => {
  const geo = useMemo(
    () => ({
      mattress: new RoundedBoxGeometry(220, 24, 90, 6, 6),
      pillow: new RoundedBoxGeometry(34, 14, 60, 6, 6),
      duvet: new RoundedBoxGeometry(124, 40, 98, 6, 14),
    }),
    [],
  );
  return (
    <group>
      <mesh geometry={geo.mattress} position={[95, -33, 6]}>
        <meshStandardMaterial color="#3b3d42" roughness={0.9} />
      </mesh>
      <mesh geometry={geo.pillow} position={[172, -17, 4]}>
        <meshStandardMaterial color="#8f8b84" roughness={0.85} />
      </mesh>
      <mesh geometry={geo.duvet} position={[44, -2, 6]}>
        <meshStandardMaterial color="#2f4a63" roughness={0.95} />
      </mesh>
    </group>
  );
};

const Checklist: React.FC<{f: number; parts: Part[]}> = ({f, parts}) => {
  const o = fade(f, 40, 54, 99999, 100000);
  if (o <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 40, top: 360, opacity: o, background: 'rgba(15,15,14,0.72)', borderRadius: 24, padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 12}}>
      {parts.map((p, i) => {
        const s = HOOK + i * SEG;
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

export const PostureSeries: React.FC<{variant: 'wake' | 'stand'}> = ({variant}) => {
  const cfg = SERIES[variant];
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const rig = useBot('models/Mannequin.fbx');
  const total = seriesDuration(cfg);
  const inBed = !!cfg.bed && f < HOOK;

  // camera path
  const keys = useMemo(() => {
    const k: CamKey[] = [];
    if (!cfg.bed) k.push({f: 0, ...cfg.hookCam}, {f: HOOK - 16, ...drift(cfg.hookCam, 0.97)});
    else k.push({f: HOOK, ...cfg.hookCam});
    cfg.parts.forEach((p, i) => {
      const s = HOOK + i * SEG;
      const out = p.camOut ?? p.cam;
      k.push({f: s + T.camIn, ...p.cam}, {f: s + T.camOut[0], ...drift(p.cam)}, {f: s + T.camOut[1], ...out}, {f: s + SEG - 14, ...drift(out)});
    });
    k.push({f: total - 50, ...FULL}, {f: total, ...drift(FULL, 0.97)});
    return k;
  }, [cfg, total]);

  // pose
  let pose: Pose;
  const collapse = Easing.in(Easing.quad)(Math.min(1, Math.max(0, (f - 3) / 27)));
  if (inBed) pose = lerpPose(cfg.bed!.relaxed, cfg.bed!.lying, collapse);
  else if (!cfg.bed && f < 40) pose = lerpPose(cfg.relaxed, cfg.start, collapse);
  else {
    const t: Partial<Record<keyof Pose, number>> = {};
    cfg.parts.forEach((p, i) => {
      const s = HOOK + i * SEG;
      const v = ramp(f, s + T.straighten[0], s + T.straighten[1]);
      p.keys.forEach((k) => (t[k] = Math.max(t[k] ?? 0, v)));
    });
    pose = lerpPose(cfg.start, UP, t);
  }

  // muscles
  const amt: Partial<Record<MuscleName, number>> = {};
  const col: Partial<Record<MuscleName, string>> = {};
  cfg.parts.forEach((p, i) => {
    const s = HOOK + i * SEG;
    const a = fade(f, s + T.inOn, s + T.inOn + 12, s + T.inOff, s + T.inOff + 10);
    const b = fade(f, s + T.outOn, s + T.outOn + 12, s + SEG - 12, s + SEG);
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
    rig.root.rotation.set(0, 0, inBed ? -Math.PI / 2 : 0);
    rig.root.position.set(0, 0, 0);
    rig.root.updateMatrixWorld(true);
    rig.setMuscles(amt, col);
  }
  const cam: View = inBed ? cfg.bed!.cam : camAt(keys, f);

  const seg = Math.floor((f - HOOK) / SEG);
  const part = f >= HOOK && seg < cfg.parts.length ? cfg.parts[seg] : null;
  const s = part ? HOOK + seg * SEG : 0;

  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, #4a4844 0%, #262523 45%, #0F0F0E 100%)'}}>
      {rig && (
        <ThreeCanvas width={width} height={height} camera={{fov: FOV, near: 1, far: 3000}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping}}>
          <Env />
          <Cam {...cam} />
          <ambientLight intensity={0.22} />
          <directionalLight position={[160, 260, 220]} intensity={1.5} />
          <directionalLight position={[-220, 80, 120]} intensity={0.4} color="#dfe6ff" />
          <directionalLight position={[0, 220, -300]} intensity={1.5} />
          <directionalLight position={[-260, -40, -200]} intensity={0.7} color="#ffd2c2" />
          {inBed && <Bed />}
          <primitive object={rig.root} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{fontFamily: FONT, color: C.ink}}>
        <Text o={fade(f, -1, 0, HOOK - 14, HOOK)} top={140} size={64} weight={700}>
          <span style={{color: '#B9B5AD'}}>{cfg.hookL1}</span>
        </Text>
        <Text o={fade(f, -1, 0, HOOK - 14, HOOK)} top={215} size={88}>{cfg.hookL2}</Text>
        <Text o={fade(f, 40, 52, HOOK - 10, HOOK)} top={1500} size={60}>{cfg.hookSub}</Text>

        {f >= HOOK - 10 && <Checklist f={f} parts={cfg.parts} />}

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

        <Text o={fade(f, total - OUTRO + 10, total - OUTRO + 22, 99999, 100000)} top={160} size={84}>
          Climbing trains the pull.
          <br />
          <span style={{color: '#FF4A3D'}}>Train the opposite.</span>
        </Text>
        <Text o={fade(f, total - OUTRO + 30, total - OUTRO + 42, 99999, 100000)} top={1520} size={56} weight={700}>
          Follow for the fix.
        </Text>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
