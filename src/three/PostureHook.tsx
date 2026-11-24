import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {C, FONT} from '../PPSReel';
import {CamKey, camAt, project, V3} from './camera';
import {MuscleGroup, POSES, Pose, buildMannequin, lerpPose} from './Mannequin';

/**
 * Hook for the antagonist series ep. 3 (upper back):
 * hunched mannequin → labels → straightened joint by joint while the upper back lights up.
 */

const FOV = 30;
export const POSTURE_HOOK_DURATION = 200;

const Env: React.FC = () => {
  const {gl, scene} = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    (scene as unknown as {environmentIntensity: number}).environmentIntensity = 0.7;
  }, [gl, scene]);
  return null;
};

// side view → 3/4 front (labels, chest + lats) → 3/4 back (upper back)
/** shift the look-at point sideways so the figure sits left of centre (room for labels) */
const shifted = (pos: V3, at: V3, side: number): CamKey['at'] => {
  const fx = at[0] - pos[0], fz = at[2] - pos[2];
  const n = Math.hypot(fx, fz);
  const rx = -fz / n, rz = fx / n; // screen-right on the ground plane
  return [at[0] + rx * side, at[1], at[2] + rz * side];
};
const k = (f: number, pos: V3, at: V3, side = 0): CamKey => ({f, pos, at: shifted(pos, at, side)});
const KEYS: CamKey[] = [
  k(0, [340, 126, 6], [0, 118, 4], 0),
  k(30, [345, 128, 50], [0, 118, 4], 16),
  k(95, [275, 132, 270], [0, 120, 0], 20),
  k(125, [295, 134, 205], [0, 120, 0], 10),
  k(175, [225, 138, -240], [0, 124, -4], 0),
  k(200, [212, 138, -252], [0, 124, -4], 0),
];

const Cam: React.FC<{pos: V3; at: V3}> = ({pos, at}) => {
  const {camera} = useThree();
  camera.position.set(...pos);
  camera.lookAt(...at);
  return null;
};

const ease = Easing.inOut(Easing.cubic);
const ramp = (f: number, a: number, b: number) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
const fade = (f: number, a: number, b: number, c: number, d: number) =>
  interpolate(f, [a, b, c, d], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

// straightening order: head → shoulders → elbows → wrists/hands (staggered)
const straighten = (f: number): Partial<Record<keyof Pose, number>> => {
  const head = ramp(f, 112, 136);
  const sh = ramp(f, 122, 148);
  const el = ramp(f, 132, 156);
  const wr = ramp(f, 140, 164);
  return {
    lumbarFlex: sh, thoracicFlex: sh, neckFlex: head, headExt: head,
    protract: sh, elevate: sh, armFlex: sh, armAbd: sh, intRot: sh,
    elbowFlex: el, pronation: el, wristFlex: wr, fist: wr, kneeFlex: sh,
  };
};

type Label = {text: string; anchor: string; from: number; dx: number; dy: number};
const LABELS: Label[] = [
  {text: 'Head forward', anchor: 'head', from: 40, dx: 130, dy: -110},
  {text: 'Shoulders rolled in', anchor: 'shoulder1', from: 52, dx: 150, dy: -30},
  {text: 'Arms bent', anchor: 'elbow1', from: 64, dx: 150, dy: 20},
  {text: 'Fists', anchor: 'wrist1', from: 76, dx: 150, dy: 70},
];
const LABELS_OUT = 108;

export const PostureHook: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const rig = useMemo(() => buildMannequin(), []);

  const pose = lerpPose(POSES.hunched, POSES.upright, straighten(f));
  rig.apply(pose);

  const glow: Record<MuscleGroup, number> = {
    pecs: fade(f, 84, 94, 118, 132) * 0.95,
    lats: fade(f, 84, 94, 118, 132) * 0.95,
    traps: fade(f, 128, 142, 300, 301) * 0.9,
    cuff: fade(f, 128, 142, 300, 301) * 0.9,
  };
  (Object.keys(glow) as MuscleGroup[]).forEach((k) => (rig.muscles[k].opacity = glow[k]));

  const cam = camAt(KEYS, f);
  const proj = (name: string) => project(rig.anchor(name).toArray() as V3, cam, FOV, width, height);

  const t1 = fade(f, 4, 14, 100, 110);
  const t2 = fade(f, 88, 98, 118, 126);
  const t3 = fade(f, 136, 148, 300, 301);

  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, #4a4844 0%, #262523 45%, #0F0F0E 100%)'}}>
      <ThreeCanvas width={width} height={height} camera={{fov: FOV, near: 1, far: 3000}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping}}>
        <Env />
        <Cam pos={cam.pos} at={cam.at} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[160, 260, 220]} intensity={1.6} />
        <directionalLight position={[-220, 80, 120]} intensity={0.45} color="#dfe6ff" />
        <directionalLight position={[0, 200, -300]} intensity={1.6} color="#ffffff" />
        <directionalLight position={[-260, -40, -200]} intensity={0.8} color="#ffd2c2" />
        <primitive object={rig.root} />
      </ThreeCanvas>

      <AbsoluteFill style={{fontFamily: FONT, color: C.ink}}>
        {/* labels with leader lines */}
        <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
          {LABELS.map((l) => {
            const o = fade(f, l.from, l.from + 8, LABELS_OUT, LABELS_OUT + 8);
            if (o <= 0) return null;
            const p = proj(l.anchor);
            const grow = ramp(f, l.from, l.from + 8);
            const ex = p.x + l.dx * grow, ey = p.y + l.dy * grow;
            return (
              <g key={l.text} opacity={o}>
                <circle cx={p.x} cy={p.y} r={11} fill={C.warn} />
                <line x1={p.x} y1={p.y} x2={ex} y2={ey} stroke={C.warn} strokeWidth={5} strokeLinecap="round" />
              </g>
            );
          })}
        </svg>
        {LABELS.map((l) => {
          const o = fade(f, l.from + 4, l.from + 10, LABELS_OUT, LABELS_OUT + 8);
          if (o <= 0) return null;
          const p = proj(l.anchor);
          const right = l.dx >= 0;
          return (
            <div key={l.text} style={{position: 'absolute', top: p.y + l.dy - 34, left: right ? p.x + l.dx + 14 : undefined, right: right ? undefined : width - (p.x + l.dx) + 14, opacity: o, fontSize: 44, fontWeight: 800, letterSpacing: -0.5, background: 'rgba(15,15,14,0.72)', padding: '6px 16px', borderRadius: 12, whiteSpace: 'nowrap'}}>
              {l.text}
            </div>
          );
        })}

        <div style={{position: 'absolute', left: 70, right: 70, top: 190, textAlign: 'center', opacity: t1, fontSize: 118, fontWeight: 800, letterSpacing: -3, lineHeight: 1}}>Recognize this?</div>
        <div style={{position: 'absolute', left: 70, right: 70, top: 1530, textAlign: 'center', textShadow: '0 4px 24px rgba(0,0,0,0.85)', opacity: t2, fontSize: 76, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05}}>
          Strong <span style={{color: C.warn}}>chest</span> & <span style={{color: C.warn}}>lats</span><br />pull you in.
        </div>
        <div style={{position: 'absolute', left: 70, right: 70, top: 1530, textAlign: 'center', textShadow: '0 4px 24px rgba(0,0,0,0.85)', opacity: t3, fontSize: 76, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05}}>
          Your <span style={{color: '#FF3B30'}}>upper back</span><br />pulls you out.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
