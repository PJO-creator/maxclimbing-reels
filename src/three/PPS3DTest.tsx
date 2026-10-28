import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Bar, CARA, Carabiner, Handle, PPS, Rope, anchorCaraY, holeX, usePPSGeometry} from './PPSModel';
import {C, FONT} from '../PPSReel';
import {CamKey, camAt} from './camera';

// Environment map set synchronously (canvas doesn't redraw after effects)
const Env: React.FC = () => {
  const {gl, scene} = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    (scene as unknown as {environmentIntensity: number}).environmentIntensity = 0.9;
  }, [gl, scene]);
  return null;
};

// ---- Camera fly-by (smooth spline, no stops between keys) ----
const KEYS: CamKey[] = [
  {f: 0, pos: [-62, 20, 62], at: [-14, -1, 0]}, // 3/4 from the upper left: left half + handle
  {f: 55, pos: [-18, 9, 42], at: [-2, 1, 0]}, // closer, sliding over the engraving towards the logo
  {f: 105, pos: [26, 4, 40], at: [8, 0, 0]}, // past the centre, low angle
  {f: 145, pos: [62, 12, 70], at: [12, -4, 0]}, // 3/4 from the right, whole bar + handles
  {f: 185, pos: [0, 6, 212], at: [0, -5, 0]}, // front view
];
const Cam: React.FC<{f: number}> = ({f}) => {
  const {camera} = useThree();
  const {pos, at} = camAt(KEYS, f);
  camera.position.set(...pos);
  camera.lookAt(...at);
  return null;
};

// Anchor hop between holes: lift, slide, drop
const anchorAt = (f: number, path: number[], start: number, per: number) => {
  const t = (f - start) / per;
  if (t <= 0) return {x: holeX(path[0]), lift: 0, pct: path[0]};
  if (t >= path.length - 1) return {x: holeX(path[path.length - 1]), lift: 0, pct: path[path.length - 1]};
  const i = Math.floor(t);
  const fr = Math.min(1, (t - i) * 1.8);
  const e = Easing.inOut(Easing.cubic)(fr);
  return {x: holeX(path[i]) + (holeX(path[i + 1]) - holeX(path[i])) * e, lift: Math.sin(fr * Math.PI) * 2.5, pct: fr > 0.5 ? path[i + 1] : path[i]};
};

export const FLY_DURATION = 290;

export const PPS3DTest: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const geo = usePPSGeometry();
  const a = anchorAt(f, [50, 55, 60, 65, 70, 75], 192, 16);
  const ay = anchorCaraY + a.lift;
  const titleO = interpolate(f, [15, 30, 140, 158], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const textO = interpolate(f, [178, 190], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #4a4844 0%, #262523 45%, #0F0F0E 100%)'}}>
      {geo && (
        <ThreeCanvas width={width} height={height} camera={{fov: 32, near: 0.5, far: 2000}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping}}>
          <Env />
          <Cam f={f} />
          <ambientLight intensity={0.2} />
          {/* key, fill, and two rim lights to separate the black plate from the dark background */}
          <directionalLight position={[-40, 60, 80]} intensity={1.4} />
          <directionalLight position={[60, 10, 40]} intensity={0.5} color="#dfe6ff" />
          <directionalLight position={[0, 80, -80]} intensity={2.2} color="#ffffff" />
          <directionalLight position={[-70, -10, -50]} intensity={1.2} color="#ffd2c2" />
          <group position={[0, PPS.yCenter, 0]}>
            <Bar geo={geo} />
          </group>
          <Carabiner position={[a.x, ay, 0]} />
          <Rope x={a.x} fromY={ay + CARA.h / 2 - CARA.wire} />
          <Handle x={-PPS.handleX} />
          <Handle x={PPS.handleX} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{fontFamily: FONT, color: C.ink}}>
        <div style={{position: 'absolute', left: 80, top: 1240, opacity: titleO}}>
          <div style={{fontSize: 44, fontWeight: 700, color: '#B9B5AD', letterSpacing: 1}}>MAX CLIMBING</div>
          <div style={{fontSize: 96, fontWeight: 800, letterSpacing: -2, lineHeight: 1.0, marginTop: 8}}>Progressive<br />Pulling System</div>
        </div>
        <div style={{opacity: textO}}>
          <div style={{position: 'absolute', left: 80, right: 140, top: 1190, fontSize: 92, fontWeight: 800, letterSpacing: -2, lineHeight: 1.02}}>Every hole =<br />+5% bodyweight.</div>
          <div style={{position: 'absolute', left: 80, top: 1420, display: 'flex', alignItems: 'baseline', gap: 24}}>
            <span style={{fontSize: 150, fontWeight: 800, letterSpacing: -4, background: C.accent, borderRadius: 24, padding: '0 28px 10px'}}>{a.pct}%</span>
            <span style={{fontSize: 52, fontWeight: 700, color: '#B9B5AD'}}>on the pulling arm</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
