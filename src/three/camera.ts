import * as THREE from 'three';

export type V3 = [number, number, number];
export type CamKey = {f: number; pos: V3; at: V3};

/**
 * Smooth camera path: cubic Hermite spline through keyframes, with Catmull-Rom
 * tangents computed over TIME. Velocity is continuous at every key, so the camera
 * never stops mid-move (zero velocity only at the first and last key).
 */
const hermite = (keys: {f: number; v: number}[], f: number) => {
  if (f <= keys[0].f) return keys[0].v;
  const n = keys.length;
  if (f >= keys[n - 1].f) return keys[n - 1].v;
  let i = 0;
  while (i < n - 2 && f >= keys[i + 1].f) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const slope = (j: number) => {
    if (j === 0 || j === n - 1) return 0;
    return (keys[j + 1].v - keys[j - 1].v) / (keys[j + 1].f - keys[j - 1].f);
  };
  const h = k1.f - k0.f;
  const t = (f - k0.f) / h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * k0.v + (t3 - 2 * t2 + t) * h * slope(i) + (-2 * t3 + 3 * t2) * k1.v + (t3 - t2) * h * slope(i + 1);
};

export const camAt = (keys: CamKey[], f: number) => {
  const comp = (sel: (k: CamKey) => V3, c: 0 | 1 | 2) => hermite(keys.map((k) => ({f: k.f, v: sel(k)[c]})), f);
  const pos: V3 = [comp((k) => k.pos, 0), comp((k) => k.pos, 1), comp((k) => k.pos, 2)];
  const at: V3 = [comp((k) => k.at, 0), comp((k) => k.at, 1), comp((k) => k.at, 2)];
  return {pos, at};
};

/** Project a world point to screen pixels with the same camera the canvas uses */
export const project = (p: V3, cam: {pos: V3; at: V3}, fov: number, w: number, h: number) => {
  const c = new THREE.PerspectiveCamera(fov, w / h, 0.5, 2000);
  c.position.set(...cam.pos);
  c.lookAt(...cam.at);
  c.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(c);
  return {x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h};
};
