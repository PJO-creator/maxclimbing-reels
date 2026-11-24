import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {C, FONT} from '../PPSReel';
import {CamKey, camAt, project, V3} from './camera';
import {POSES, Pose, lerpPose} from './Mannequin';
import {useBot} from './BotTest';

/** Short test: one body part (shoulders) — pull in (chest + lats) → pull out (upper back) → shoulders straighten. */

const FOV = 30;
export const SHOULDER_SHORT_DURATION = 255;

// hunched pose tuned for the Mixamo Mannequin
// exaggerated on purpose: the message has to land in one glance
const HUNCH: Pose = {...POSES.hunched, lumbarFlex: -9, thoracicFlex: 34, neckFlex: 30, headExt: 64, protract: 26, elevate: 8, armFlex: 26, intRot: 42, elbowFlex: 62, pronation: 85, wristFlex: 55, fist: 1};
// only the shoulder parameters straighten in this segment
const SHOULDER_KEYS: (keyof Pose)[] = ['protract', 'elevate', 'armFlex', 'armAbd', 'intRot', 'thoracicFlex', 'lumbarFlex'];

const Env: React.FC = () => {
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

// side → 3/4 front (chest + lats) → hold → 3/4 back (upper back) → hold while straightening
const KEYS: CamKey[] = [
  {f: 0, pos: [300, 128, 10], at: [0, 122, 0]},
  {f: 40, pos: [290, 130, 40], at: [0, 122, 0]},
  {f: 75, pos: [190, 134, 230], at: [0, 124, 0]},
  {f: 110, pos: [180, 134, 235], at: [0, 124, 0]},
  {f: 150, pos: [170, 136, -245], at: [0, 126, 0]},
  {f: 255, pos: [150, 136, -255], at: [0, 126, 0]},
];

const ease = Easing.inOut(Easing.cubic);
const ramp = (f: number, a: number, b: number) => ease(Math.min(1, Math.max(0, (f - a) / (b - a))));
const fade = (f: number, a: number, b: number, c: number, d: number) =>
  interpolate(f, [a, b, c, d], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const Caption: React.FC<{o: number; children: React.ReactNode; top?: number; size?: number}> = ({o, children, top = 1480, size = 74}) => (
  <div style={{position: 'absolute', left: 60, right: 60, top, textAlign: 'center', opacity: o, fontSize: size, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.06, textShadow: '0 4px 24px rgba(0,0,0,0.9)'}}>{children}</div>
);

export const ShoulderShort: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const rig = useBot('models/Mannequin.fbx');

  // shoulders lead, the rest follows so the end pose is clean
  const st = ramp(f, 160, 205);
  const rest = ramp(f, 185, 225);
  const t: Partial<Record<keyof Pose, number>> = {};
  (Object.keys(HUNCH) as (keyof Pose)[]).forEach((k) => (t[k] = SHOULDER_KEYS.includes(k) ? st : rest));
  const pose = lerpPose(HUNCH, POSES.upright, t);
  const pin = fade(f, 50, 66, 125, 140);
  const pout = fade(f, 128, 145, 400, 401);
  if (rig) {
    rig.apply(pose);
    rig.setMuscles([pin, pin, pout, pout]);
  }
  const cam = camAt(KEYS, f);

  const lab = fade(f, 22, 32, 120, 132);
  const sh = rig ? project(rig.anchor('shoulder1').toArray() as V3, cam, FOV, width, height) : {x: 0, y: 0};

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
        {lab > 0 && (
          <>
            <svg width={width} height={height} style={{position: 'absolute', inset: 0, opacity: lab}}>
              <circle cx={sh.x} cy={sh.y} r={11} fill={C.warn} />
              <line x1={sh.x} y1={sh.y} x2={sh.x - 150} y2={sh.y - 60} stroke={C.warn} strokeWidth={5} strokeLinecap="round" />
            </svg>
            <div style={{position: 'absolute', right: width - sh.x + 162, top: sh.y - 96, opacity: lab, fontSize: 44, fontWeight: 800, background: 'rgba(15,15,14,0.72)', padding: '6px 16px', borderRadius: 12, whiteSpace: 'nowrap'}}>Shoulders rolled in</div>
          </>
        )}
        <Caption o={fade(f, 4, 14, 40, 52)} top={180} size={112}>Recognize this?</Caption>
        <Caption o={fade(f, 60, 72, 122, 134)}>
          Strong <span style={{color: C.warn}}>chest</span> & <span style={{color: C.warn}}>lats</span>
          <br />pull your shoulders in.
        </Caption>
        <Caption o={fade(f, 140, 152, 400, 401)}>
          Your <span style={{color: '#FF3B30'}}>upper back</span>
          <br />pulls them back.
        </Caption>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
