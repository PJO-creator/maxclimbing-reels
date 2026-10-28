import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Bar, Carabiner, Handle, PPS, Rope, holeX, usePPSGeometry} from './PPSModel';
import {C, FONT} from '../PPSReel';

// Environment map set synchronously (canvas doesn't redraw after effects)
const Env: React.FC = () => {
  const {gl, scene} = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    (scene as unknown as {environmentIntensity: number}).environmentIntensity = 1.1;
  }, [gl, scene]);
  return null;
};

const Cam: React.FC<{yaw: number; pitch: number; dist: number; lookY: number}> = ({yaw, pitch, dist, lookY}) => {
  const {camera} = useThree();
  camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, lookY + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(0, lookY, 0);
  return null;
};

// Anchor hop between holes: lift, slide, drop
const anchorAt = (f: number, path: number[], start: number, per: number) => {
  const t = (f - start) / per;
  if (t <= 0) return {x: holeX(path[0]), lift: 0, pct: path[0]};
  const i = Math.min(Math.floor(t), path.length - 2);
  if (t >= path.length - 1) return {x: holeX(path[path.length - 1]), lift: 0, pct: path[path.length - 1]};
  const fr = Math.min(1, (t - i) * 1.8);
  const e = Easing.inOut(Easing.cubic)(fr);
  return {x: holeX(path[i]) + (holeX(path[i + 1]) - holeX(path[i])) * e, lift: Math.sin(fr * Math.PI) * 2.2, pct: fr > 0.5 ? path[i + 1] : path[i]};
};

export const PPS3DTest: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const geo = usePPSGeometry();
  const yaw = interpolate(f, [0, 70], [-0.75, 0], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const pitch = interpolate(f, [0, 70], [0.28, 0.06], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const dist = interpolate(f, [0, 70], [130, 250], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const a = anchorAt(f, [50, 55, 60, 65, 70, 75], 80, 16);
  const ay = PPS.holeY + 0.9 + a.lift;
  const textO = interpolate(f, [76, 86], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 38%, #ffffff 0%, #e4e1db 55%, #c9c5bd 100%)'}}>
      {geo && (<ThreeCanvas width={width} height={height} camera={{fov: 30, near: 1, far: 2000}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping}}>
        <Env />
        <Cam yaw={yaw} pitch={pitch} dist={dist} lookY={-3} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[-40, 60, 80]} intensity={1.6} />
        <directionalLight position={[50, 20, -60]} intensity={1.2} color="#ffd9c7" />
        <group position={[0, PPS.yCenter, 0]}>
          <Bar geo={geo} />
        </group>
        <group position={[0, PPS.yCenter - PPS.yCenter, 0]}>
          <Carabiner position={[a.x, ay, 0]} />
          <Rope x={a.x} fromY={ay + 1.7} />
          <Handle x={-PPS.handleX} />
          <Handle x={PPS.handleX} />
        </group>
      </ThreeCanvas>)}
      <AbsoluteFill style={{fontFamily: FONT, color: C.bg, opacity: textO}}>
        <div style={{position: 'absolute', left: 80, right: 140, top: 1190, fontSize: 92, fontWeight: 800, letterSpacing: -2, lineHeight: 1.02}}>Every hole =<br />+5% bodyweight.</div>
        <div style={{position: 'absolute', left: 80, top: 1420, display: 'flex', alignItems: 'baseline', gap: 24}}>
          <span style={{fontSize: 150, fontWeight: 800, letterSpacing: -4, color: C.accent}}>{a.pct}%</span>
          <span style={{fontSize: 52, fontWeight: 700, color: '#55534F'}}>on the pulling arm</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
