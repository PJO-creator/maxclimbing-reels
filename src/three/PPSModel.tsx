import React, {useEffect, useMemo, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';

// Geometry facts from the CAD file (units: cm)
export const PPS = {
  holeSpacing: 2.38, // centre-to-centre of the top row
  holeY: 3.5, // top row
  handleX: 23.8, // handle holes at ±23.8, y = 0
  handleY: 0,
  thickness: 0.5,
  yCenter: 1.75, // plate spans y -1.5..5
};
/** x position of the anchor hole for a given % on the pulling arm (right = +x) */
export const holeX = (pct: number, side: 'right' | 'left' = 'right') => ((pct - 50) / 5) * PPS.holeSpacing * (side === 'right' ? 1 : -1);

/** Load both meshes BEFORE the 3D canvas mounts (the canvas does not redraw on async state changes). */
export const usePPSGeometry = () => {
  const [geo, setGeo] = useState<{body: THREE.BufferGeometry; print: THREE.BufferGeometry} | null>(null);
  const [handle] = useState(() => delayRender('load PPS model'));
  useEffect(() => {
    const load = (file: string) =>
      fetch(staticFile(file))
        .then((r) => r.text())
        .then((txt) => {
          const g = (new OBJLoader().parse(txt).children[0] as THREE.Mesh).geometry as THREE.BufferGeometry;
          g.computeVertexNormals();
          return g;
        });
    Promise.all([load('models/pps_body.obj'), load('models/pps_print.obj')]).then(([body, print]) => {
      setGeo({body, print});
      continueRender(handle);
    });
  }, [handle]);
  return geo;
};

const steel = new THREE.MeshStandardMaterial({color: '#d9dde2', metalness: 1, roughness: 0.22});
const black = new THREE.MeshStandardMaterial({color: '#1a1a1a', metalness: 0.3, roughness: 0.5, side: THREE.DoubleSide});
const white = new THREE.MeshStandardMaterial({color: '#f2f2f2', metalness: 0, roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.35, side: THREE.DoubleSide});
const strap = new THREE.MeshStandardMaterial({color: '#0c0c0c', metalness: 0, roughness: 0.9});
const rope = new THREE.MeshStandardMaterial({color: '#1d1a19', metalness: 0, roughness: 0.85});
const ropeFleck = new THREE.MeshStandardMaterial({color: '#A10303', metalness: 0, roughness: 0.8});

/** Plate + white engraving */
export const Bar: React.FC<{geo: {body: THREE.BufferGeometry; print: THREE.BufferGeometry}}> = ({geo}) => (
  <group position={[0, -PPS.yCenter, -PPS.thickness / 2]}>
    <mesh geometry={geo.body} material={black} />
    <mesh geometry={geo.print} material={white} />
  </group>
);

/** Carabiner: stadium-shaped ring, in the YZ plane so it threads through a hole */
export const Carabiner: React.FC<{position: [number, number, number]; scale?: number}> = ({position, scale = 1}) => {
  const geo = useMemo(() => {
    const w = 1.3, h = 3.6, r = w / 2;
    const path = new THREE.CurvePath<THREE.Vector3>();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI + (i / 24) * Math.PI; // bottom arc
      pts.push(new THREE.Vector3(0, -h / 2 + r + Math.sin(a) * r, Math.cos(a) * r));
    }
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI; // top arc
      pts.push(new THREE.Vector3(0, h / 2 - r + Math.sin(a) * r, Math.cos(a) * r));
    }
    pts.push(pts[0].clone());
    path.add(new THREE.CatmullRomCurve3(pts, true));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, 0.16, 12, true);
  }, []);
  return <mesh geometry={geo} material={steel} position={position} scale={scale} />;
};

/** Rope from the anchor carabiner straight up out of frame */
export const Rope: React.FC<{x: number; fromY: number; length?: number}> = ({x, fromY, length = 120}) => (
  <group position={[x, fromY + length / 2, 0]}>
    <mesh material={rope}>
      <cylinderGeometry args={[0.42, 0.42, length, 16]} />
    </mesh>
    {Array.from({length: 40}, (_, i) => (
      <mesh key={i} material={ropeFleck} position={[0, -length / 2 + i * 3 + 1, 0]} rotation={[0, (i * 1.7) % 6.28, 0.5]}>
        <torusGeometry args={[0.43, 0.05, 6, 16, 1.2]} />
      </mesh>
    ))}
  </group>
);

/** D-handle: carabiner, V-shaped strap, steel grip */
export const Handle: React.FC<{x: number; highlight?: boolean}> = ({x}) => {
  const top = PPS.handleY - 2.6; // bottom of handle carabiner
  const gripY = top - 13;
  const gripLen = 11;
  const strapLen = Math.hypot(gripLen / 2, top - gripY);
  const ang = Math.atan2(gripLen / 2, top - gripY);
  return (
    <group position={[x, 0, 0]}>
      <Carabiner position={[0, PPS.handleY - 0.9, 0]} />
      {[-1, 1].map((s) => (
        <mesh key={s} material={strap} position={[(s * gripLen) / 4, (top + gripY) / 2, 0]} rotation={[0, 0, s * ang]}>
          <boxGeometry args={[2.4, strapLen, 0.25]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`l${s}`} material={strap} position={[(s * gripLen) / 2, gripY, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.5, 1.5, 2.2, 24]} />
        </mesh>
      ))}
      <mesh material={steel} position={[0, gripY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.25, 1.25, gripLen - 1, 32]} />
      </mesh>
    </group>
  );
};
