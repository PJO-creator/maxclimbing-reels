import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Bar, CARA, Carabiner, Handle, PPS, Rope, anchorCaraY, handleCaraY, holeX, usePPSGeometry} from './PPSModel';
import {C, FONT} from '../PPSReel';
import {CamKey, V3, camAt, project} from './camera';

// 3D "how to train" reel. Timings in frames @30fps live in data/pps-3d-learn.json.
export type Learn3DContent = {
  hook: {from: number; to: number; text: string; accent?: boolean; panel?: boolean}[];
  steps: {n: string; from: number; to: number; title: string; body: string; badge?: string}[];
  outro: {from: number; to: number; title: string; body: string; sub: string; image?: string};
  clip?: {src: string; start: number; until: number};
};
export const LEARN3D_DURATION = 640;
const FOV = 32;

// One continuous camera path for the whole reel
const KEYS: CamKey[] = [
  {f: 0, pos: [-62, 20, 62], at: [-14, -1, 0]}, // hidden behind the real clip
  {f: 75, pos: [-58, 19, 60], at: [-13, -1, 0]}, // fly-by starts as the clip fades out
  {f: 110, pos: [-18, 9, 42], at: [-2, 1, 0]},
  {f: 140, pos: [30, 5, 45], at: [8, -1, 0]},
  {f: 170, pos: [0, 2, 215], at: [0, -13, 0]}, // front view: bar high in frame, room for labels + text below
  {f: 285, pos: [5, 3, 214], at: [0, -13, 0]},
  {f: 435, pos: [-5, 4, 212], at: [0, -13, 0]},
  {f: 545, pos: [0, 2, 215], at: [0, -13, 0]},
  {f: 640, pos: [-30, 8, 170], at: [0, -10, 0]}, // slow drift while the real product photo takes over
];

const Env: React.FC = () => {
  const {gl, scene} = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    (scene as unknown as {environmentIntensity: number}).environmentIntensity = 0.9;
  }, [gl, scene]);
  return null;
};
const Cam: React.FC<{pos: V3; at: V3}> = ({pos, at}) => {
  const {camera} = useThree();
  camera.position.set(...pos);
  camera.lookAt(...at);
  return null;
};

// ---- Anchor choreography ----
// Anchor position as a signed % : +65 = 65% on the RIGHT arm, -70 = 70% on the LEFT arm
type Hop = {f: number; to: number};
const HOPS: Hop[] = [
  // step 1: search the start, 50 -> 65
  {f: 175, to: 55}, {f: 200, to: 60}, {f: 225, to: 65},
  // step 2: progress 65 -> 80
  {f: 315, to: 70}, {f: 350, to: 75}, {f: 385, to: 80},
  // step 3: back to 75 for the tilt demo
  {f: 443, to: 75},
];
const HOP_LEN = 16;
const sx = (signed: number) => (signed >= 0 ? holeX(signed, 'right') : holeX(-signed, 'left'));
const anchorAt = (f: number) => {
  let cur = 50;
  for (const h of HOPS) {
    if (f < h.f) break;
    const t = Math.min(1, (f - h.f) / (Math.abs(h.to - cur) > 50 ? HOP_LEN * 1.8 : HOP_LEN));
    if (t < 1) {
      const e = Easing.inOut(Easing.cubic)(t);
      return {x: sx(cur) + (sx(h.to) - sx(cur)) * e, lift: Math.sin(t * Math.PI) * 2.5, signed: t > 0.5 ? h.to : cur};
    }
    cur = h.to;
  }
  return {x: sx(cur), lift: 0, signed: cur};
};

// ---- Overlays ----
const useFade = (from: number, to: number, f: number) =>
  interpolate(f, [from, from + 8, to - 8, to], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const Header: React.FC<{n: string; title: string; body: string; o: number; local: number}> = ({n, title, body, o, local}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame: local, fps, config: {damping: 200}});
  return (
    <div style={{position: 'absolute', left: 80, right: 120, top: 1250, opacity: o, transform: `translateY(${(1 - s) * 30}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
        <div style={{width: 100, height: 100, borderRadius: 50, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, fontWeight: 800, flexShrink: 0}}>{n}</div>
        <div style={{fontSize: 74, fontWeight: 800, lineHeight: 1.03, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{title}</div>
      </div>
      <div style={{fontSize: 50, fontWeight: 600, lineHeight: 1.2, color: '#C9C5BD', marginTop: 22, whiteSpace: 'pre-line'}}>{body}</div>
    </div>
  );
};

const LoadLabel: React.FC<{x: number; y: number; pct: number; pulling: boolean; tag?: string}> = ({x, y, pct, pulling, tag}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: 'translateX(-50%)', textAlign: 'center'}}>
    <div
      style={{
        fontSize: pulling ? 84 : 58,
        fontWeight: 800,
        letterSpacing: -2,
        lineHeight: 1,
        padding: pulling ? '8px 22px 14px' : '6px 10px',
        borderRadius: 18,
        background: pulling ? C.accent : 'transparent',
        color: pulling ? C.ink : '#9A968E',
      }}
    >
      {Math.round(pct)}%
    </div>
    {tag && <div style={{fontSize: 34, fontWeight: 800, letterSpacing: 1, color: '#C9C5BD', marginTop: 10, whiteSpace: 'nowrap'}}>{tag}</div>}
  </div>
);

export const PPS3DLearn: React.FC<{content: Learn3DContent}> = ({content: c}) => {
  const f = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const geo = usePPSGeometry();
  const cam = camAt(KEYS, f);
  const a = anchorAt(f);
  const ay = anchorCaraY + a.lift;

  // Step 3: assist arm pulls too hard -> its side drops (bar rotates about the anchor contact point), then levels
  const s3 = c.steps[2];
  const tilt = interpolate(f, [s3.from + 22, s3.from + 40, s3.from + 70, s3.from + 92], [0, 7, 7, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const pivot: V3 = [a.x, PPS.holeY + PPS.holeR, 0];

  // labels under the grips (projected from 3D)
  const gripY = handleCaraY - CARA.h / 2 + CARA.wire - 13;
  // labels follow the grips when the bar tilts (rotate around the anchor contact point)
  const rot = (x: number, y: number): V3 => {
    const t = (tilt * Math.PI) / 180, dx = x - pivot[0], dy = y - pivot[1];
    return [pivot[0] + dx * Math.cos(t) - dy * Math.sin(t), pivot[1] + dx * Math.sin(t) + dy * Math.cos(t), 0];
  };
  const L = project(rot(-PPS.handleX, gripY - 3), cam, FOV, width, height);
  const R = project(rot(PPS.handleX, gripY - 3), cam, FOV, width, height);
  const right = a.signed >= 0;
  const pct = Math.abs(a.signed);
  const labelsO = interpolate(f, [153, 165, c.outro.from - 6, c.outro.from + 4], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const inStep4 = !!c.steps[3] && f >= c.steps[3].from && f < c.steps[3].to;
  const plusTag = f >= c.steps[1].from && f < c.steps[1].to && HOPS.some((h) => f >= h.f && f < h.f + 22 && h.f >= c.steps[1].from);
  const badge1 = c.steps[0].badge && f >= 247 && f < c.steps[0].to;
  const b1 = spring({frame: f - 247, fps, config: {damping: 12}});

  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 35%, #4a4844 0%, #262523 45%, #0F0F0E 100%)', fontFamily: FONT, color: C.ink}}>
      {geo && (
        <ThreeCanvas width={width} height={height} camera={{fov: FOV, near: 0.5, far: 2000}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping}}>
          <Env />
          <Cam pos={cam.pos} at={cam.at} />
          <ambientLight intensity={0.2} />
          <directionalLight position={[-40, 60, 80]} intensity={1.4} />
          <directionalLight position={[60, 10, 40]} intensity={0.5} color="#dfe6ff" />
          <directionalLight position={[0, 80, -80]} intensity={2.2} />
          <directionalLight position={[-70, -10, -50]} intensity={1.2} color="#ffd2c2" />
          <Carabiner position={[a.x, ay, 0]} />
          <Rope x={a.x} fromY={ay + CARA.h / 2 - CARA.wire} />
          {/* everything that hangs from the anchor rotates around the contact point */}
          <group position={pivot} rotation={[0, 0, (tilt * Math.PI) / 180]}>
            <group position={[-pivot[0], -pivot[1], 0]}>
              <group position={[0, PPS.yCenter, 0]}>
                <Bar geo={geo} />
              </group>
              <Handle x={-PPS.handleX} />
              <Handle x={PPS.handleX} />
            </group>
          </group>
        </ThreeCanvas>
      )}

      {/* real footage first: people see it's something you hang on and pull */}
      {c.clip && f < c.clip.until && (
        <Sequence from={0} durationInFrames={c.clip.until}>
          <AbsoluteFill style={{opacity: interpolate(f, [c.clip.until - 12, c.clip.until], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
            <OffthreadVideo src={staticFile(`clips/${c.clip.src}`)} startFrom={Math.round(c.clip.start * 30)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.8) 100%)'}} />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* load per arm */}
      <div style={{opacity: labelsO}}>
        <LoadLabel x={L.x} y={L.y} pct={right ? 100 - pct : pct} pulling={!right} tag={inStep4 ? 'WEAK SIDE' : undefined} />
        <LoadLabel x={R.x} y={R.y} pct={right ? pct : 100 - pct} pulling={right} tag={inStep4 ? 'STRONG SIDE' : undefined} />
        {plusTag && (
          <div style={{position: 'absolute', left: R.x - 150, top: R.y + 14, transform: 'translateX(-100%)', fontSize: 52, fontWeight: 800, color: C.ink, background: C.accent, borderRadius: 14, padding: '4px 18px 8px'}}>+5%</div>
        )}
      </div>

      {/* hook statements */}
      {c.hook.map((h, i) => (
        <div key={i} style={{position: 'absolute', left: 80, right: 120, top: 1250, opacity: useFade(h.from, h.to, f), fontSize: 92, fontWeight: 800, letterSpacing: -2, lineHeight: 1.03, whiteSpace: 'pre-line'}}>
          {h.accent ? (
            <span>
              <span style={{background: C.accent, borderRadius: 18, padding: '0 20px 8px', marginLeft: -20}}>{h.text.split('\n')[0]}</span>
              {'\n' + h.text.split('\n').slice(1).join('\n')}
            </span>
          ) : h.panel ? (
            <div style={{display: 'inline-block', background: 'rgba(15,15,14,.84)', borderRadius: 28, padding: '24px 36px 30px', marginLeft: -36}}>{h.text}</div>
          ) : (
            h.text
          )}
        </div>
      ))}

      {/* steps */}
      {c.steps.map((s) => (f >= s.from - 2 && f < s.to + 2 ? <Header key={s.n} n={s.n} title={s.title} body={s.body} o={useFade(s.from, s.to, f)} local={f - s.from} /> : null))}
      {badge1 && (
        <div style={{position: 'absolute', left: 80, top: 1560, transform: `scale(${0.6 + b1 * 0.4})`, transformOrigin: 'left center', opacity: Math.min(1, b1) * useFade(247, c.steps[0].to, f), background: C.accent, borderRadius: 20, padding: '10px 30px 16px', fontSize: 58, fontWeight: 800}}>
          {c.steps[0].badge}
        </div>
      )}

      {/* outro: the real product, not the model */}
      {c.outro.image && f >= c.outro.from - 2 && (() => {
        const o = interpolate(f, [c.outro.from, c.outro.from + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const pop = spring({frame: f - c.outro.from, fps, config: {damping: 18}});
        const zoom = interpolate(f, [c.outro.from, c.outro.to], [1.1, 1.2]);
        return (
          <AbsoluteFill style={{opacity: o, background: 'radial-gradient(ellipse at 50% 35%, #3a3936 0%, #1c1b1a 55%, #0F0F0E 100%)'}}>
            <div style={{position: 'absolute', left: 80, right: 80, top: 300, height: 780, borderRadius: 36, background: '#FFFFFF', overflow: 'hidden', transform: `scale(${0.92 + pop * 0.08})`, boxShadow: '0 30px 80px rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Img src={staticFile(c.outro.image)} style={{height: '100%', objectFit: 'contain', transform: `scale(${zoom})`}} />
            </div>
          </AbsoluteFill>
        );
      })()}

      {/* outro text */}
      <div style={{position: 'absolute', left: 80, right: 120, top: 1180, opacity: interpolate(f, [c.outro.from + 4, c.outro.from + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        <div style={{fontSize: 88, fontWeight: 800, letterSpacing: -2, lineHeight: 1.03, whiteSpace: 'pre-line'}}>{c.outro.title}</div>
        <div style={{fontSize: 52, fontWeight: 800, marginTop: 30}}>
          <span style={{background: C.accent, borderRadius: 14, padding: '4px 18px 8px'}}>{c.outro.body}</span>
        </div>
        <div style={{fontSize: 40, fontWeight: 600, color: '#B9B5AD', marginTop: 22}}>{c.outro.sub}</div>
      </div>
    </AbsoluteFill>
  );
};
