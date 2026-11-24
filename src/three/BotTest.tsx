import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {BotRig, loadBot} from './BotRig';
import {POSES} from './Mannequin';

const Env: React.FC = () => {
  const {gl, scene} = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  }, [gl, scene]);
  return null;
};
const Cam: React.FC<{pos: [number, number, number]; at: [number, number, number]}> = ({pos, at}) => {
  const {camera} = useThree();
  camera.position.set(...pos);
  camera.lookAt(...at);
  return null;
};
export const useBot = (file: string) => {
  const [rig, setRig] = useState<BotRig | null>(null);
  const [h] = useState(() => delayRender('load bot'));
  useEffect(() => {
    fetch(staticFile(file)).then((r) => r.arrayBuffer()).then((b) => {
      setRig(loadBot(b));
      continueRender(h);
    });
  }, [file, h]);
  return rig;
};
// frame: 0 upright side, 1 hunched side, 2 hunched 3/4 front, 3 hunched back, 4 upright back
const VIEWS: [number, number, number][] = [[330, 125, 0], [330, 125, 0], [240, 130, 240], [0, 135, -330], [0, 135, -330]];
export const BotTest: React.FC<{file: string; override?: Partial<import('./Mannequin').Pose>}> = ({file, override}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const rig = useBot(file);
  if (rig) rig.apply({...([0, 4].includes(f) ? POSES.upright : POSES.hunched), ...(override ?? {})});
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, #4a4844 0%, #262523 45%, #0F0F0E 100%)'}}>
      {rig && (
        <ThreeCanvas width={width} height={height} camera={{fov: 30, near: 1, far: 3000}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping}}>
          <Env />
          <Cam pos={VIEWS[f] ?? VIEWS[0]} at={[0, 120, 0]} />
          <ambientLight intensity={0.25} />
          <directionalLight position={[160, 260, 220]} intensity={1.6} />
          <directionalLight position={[0, 200, -300]} intensity={1.4} />
          <directionalLight position={[-220, 80, 120]} intensity={0.45} />
          <primitive object={rig.root} />
        </ThreeCanvas>
      )}
    </AbsoluteFill>
  );
};
