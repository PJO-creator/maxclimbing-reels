import * as THREE from 'three';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import type {Pose} from './Mannequin';

/**
 * Mixamo X/Y Bot driven by the same Pose as the procedural mannequin.
 * Every joint rotation is defined around an anatomical WORLD axis of the neutral
 * (arms-down) pose, converted once to the bone's local frame. So "flex the elbow"
 * is the same call whatever the bone orientations in the FBX are.
 * Figure faces +Z, its left is +X (s = +1), units cm.
 */

const D = THREE.MathUtils.degToRad;
/** bone names vary per download: mixamorigLeftArm, mixamorig1:LeftArm, mixamorig9LeftArm… */
const short = (name: string) => name.replace(/^mixamorig\d*:?/, '');

type Joint = {bone: THREE.Bone; q0: THREE.Quaternion; w0: THREE.Quaternion};

export const MUSCLES = ['pecs', 'lats', 'traps', 'cuff', 'neckBack', 'neckFront', 'biceps', 'triceps', 'flexors', 'extensors'] as const;
export type MuscleName = (typeof MUSCLES)[number];

export type BotRig = {
  root: THREE.Object3D;
  /** glow amount (0–1) and colour per muscle */
  setMuscles: (amt: Partial<Record<MuscleName, number>>, color?: Partial<Record<MuscleName, string>>) => void;
  apply: (p: Pose) => void;
  anchor: (name: string) => THREE.Vector3;
  materials: THREE.MeshStandardMaterial[];
};

export const loadBot = (buf: ArrayBuffer, look?: {color?: string; joints?: string}): BotRig => {
  const root = new FBXLoader().parse(buf, '');
  const materials: THREE.MeshStandardMaterial[] = [];
  root.updateMatrixWorld(true);

  // ---- landmarks in the bind (T-)pose, for the muscle regions ----
  const findBone = (n: string) => {
    let hit: THREE.Object3D | undefined;
    root.traverse((o) => {
      if (!hit && (o as THREE.Bone).isBone && short(o.name) === n) hit = o;
    });
    const v = new THREE.Vector3();
    hit?.getWorldPosition(v);
    return v;
  };
  const shL = findBone('LeftArm'), sp2 = findBone('Spine2');
  const elL = findBone('LeftForeArm'), wrL = findBone('LeftHand'), tipL = findBone('LeftHandMiddle3');
  const nk = findBone('Neck'), hd = findBone('Head');
  const cx = Math.abs(shL.x), sy = shL.y, sz = shL.z, zc = sp2.z;
  const ex = Math.abs(elL.x), wx = Math.abs(wrL.x), fx = Math.abs(tipL.x) + 2;

  const sstep = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  type V = [number, number, number];
  /** soft ellipsoid (x mirrored), optional z-range and downward taper */
  const ell = (c: V, r: V, o: {zMin?: number; zMax?: number; taper?: [number, number]} = {}) => (p: THREE.Vector3) => {
    if (o.zMin !== undefined && p.z < o.zMin) return 0;
    if (o.zMax !== undefined && p.z > o.zMax) return 0;
    const rx = o.taper ? r[0] * Math.min(1, Math.max(0.2, 1 - (o.taper[0] - p.y) / o.taper[1])) : r[0];
    const dx = (Math.abs(p.x) - c[0]) / rx, dy = (p.y - c[1]) / r[1], dz = (p.z - c[2]) / r[2];
    return 1 - sstep(0.5, 1.0, Math.sqrt(dx * dx + dy * dy + dz * dz));
  };
  /** soft capsule around segment a→b (x mirrored), only on the side where (p - axis point)·n > 0 */
  const seg = (a: V, b: V, r: number, n?: V) => {
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), AB = Bv.clone().sub(A), L2 = AB.lengthSq();
    const q = new THREE.Vector3(), c = new THREE.Vector3();
    return (p: THREE.Vector3) => {
      q.set(Math.abs(p.x), p.y, p.z);
      const t = Math.min(1, Math.max(0, q.clone().sub(A).dot(AB) / L2));
      c.copy(A).addScaledVector(AB, t);
      const off = q.clone().sub(c);
      let m = 1 - sstep(0.55, 1.0, off.length() / r);
      if (n) m *= sstep(-0.5, 1.5, off.x * n[0] + off.y * n[1] + off.z * n[2]);
      return m;
    };
  };
  // Bind pose = T-pose: arms along ±X, palms down (flexors face -Y), elbow crease faces +Z.
  const REGIONS: Record<MuscleName, ((p: THREE.Vector3) => number)[]> = {
    pecs: [ell([0.55 * cx, sy - 10, zc + 9], [9, 7.5, 9], {zMin: zc + 3})],
    lats: [ell([0.85 * cx, sy - 22, zc - 3], [6.5, 14, 9], {zMax: zc + 4})],
    traps: [ell([0, sy - 14, zc - 9], [12, 17, 8], {zMax: zc - 2, taper: [sy - 2, 34]})],
    cuff: [ell([0.66 * cx, sy - 10, zc - 8], [5, 6, 6], {zMax: zc - 2})],
    neckBack: [seg([0, nk.y - 3, nk.z], [0, hd.y + 4, hd.z], 7.5, [0, 0, -1]), seg([0, nk.y + 1, nk.z - 3], [0.8 * cx, sy + 4, sz - 2], 5.5, [0, 1, -0.6])],
    neckFront: [seg([0, nk.y - 3, nk.z], [0, hd.y - 1, hd.z], 7, [0, 0, 1])],
    biceps: [seg([cx + 4, sy, sz], [ex - 3, sy, sz], 6.5, [0, 0, 1])],
    triceps: [seg([cx + 4, sy, sz], [ex - 2, sy, sz], 6.5, [0, 0, -1])],
    flexors: [seg([ex + 2, sy, sz], [fx, sy, sz], 6, [0, -1, 0])],
    extensors: [seg([ex + 2, sy, sz], [fx, sy, sz], 6, [0, 1, 0])],
  };
  void wx;
  const maskAt = (p: THREE.Vector3, k: number) => {
    const fns = REGIONS[MUSCLES[k]];
    return fns ? Math.max(0, ...fns.map((fn) => fn(p))) : 0;
  };

  const uniforms = {
    uMCol: {value: MUSCLES.map(() => new THREE.Color('#FFB020')).concat([new THREE.Color(), new THREE.Color()])},
    uMAmt: {value: new Array(12).fill(0) as number[]},
  };
  const withGlow = (mat: THREE.MeshStandardMaterial) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uMCol = uniforms.uMCol;
      sh.uniforms.uMAmt = uniforms.uMAmt;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 muscleA;\nattribute vec4 muscleB;\nattribute vec4 muscleC;\nvarying vec4 vMA;\nvarying vec4 vMB;\nvarying vec4 vMC;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMA = muscleA; vMB = muscleB; vMC = muscleC;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec4 vMA;\nvarying vec4 vMB;\nvarying vec4 vMC;\nuniform vec3 uMCol[12];\nuniform float uMAmt[12];')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           vec3 gc = vec3(0.0); float gs = 0.0;
           for (int i = 0; i < 4; i++) {
             float g0 = vMA[i] * uMAmt[i]; gc += uMCol[i] * g0; gs += g0;
             float g1 = vMB[i] * uMAmt[i + 4]; gc += uMCol[i + 4] * g1; gs += g1;
             float g2 = vMC[i] * uMAmt[i + 8]; gc += uMCol[i + 8] * g2; gs += g2;
           }
           gs = clamp(gs, 0.0, 1.0);
           diffuseColor.rgb = mix(diffuseColor.rgb, gc / max(gs, 1e-4), gs * 0.75);
           totalEmissiveRadiance += gc * 0.55;`,
        );
    };
    return mat;
  };

  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    m.frustumCulled = false;
    const orig = ([] as THREE.Material[]).concat(m.material) as THREE.MeshPhongMaterial[];
    const isJoint = /Joints/.test(m.name);
    // per-vertex muscle masks from the bind pose
    const pos = m.geometry.attributes.position;
    const arrs = [0, 1, 2].map(() => new Float32Array(pos.count * 4));
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      for (let k = 0; k < 12; k++) arrs[k >> 2][i * 4 + (k & 3)] = isJoint ? 0 : maskAt(v, k);
    }
    ['muscleA', 'muscleB', 'muscleC'].forEach((n, j) => m.geometry.setAttribute(n, new THREE.BufferAttribute(arrs[j], 4)));
    const mat = withGlow(
      new THREE.MeshStandardMaterial({
        color: isJoint ? look?.joints ?? '#9c968c' : look?.color ?? '#d9d3c9',
        roughness: isJoint ? 0.45 : 0.58,
        metalness: 0,
        normalMap: orig[0]?.normalMap ?? null,
      }),
    );
    m.material = mat;
    materials.push(mat);
  });

  const Z = new THREE.Vector3(0, 0, 1);
  // FBX from Mixamo: each skinned mesh (surface, joints) has its own skeleton → drive all of them
  const skeletons: THREE.Bone[][] = [];
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) skeletons.push(m.skeleton.bones);
  });
  const rigs = skeletons.map((bones) => {
    const by = new Map(bones.map((b) => [short(b.name), b]));
    const bone = (n: string) => by.get(n)!;
    const joints: Record<string, Joint> = {};

    // rotate a bone about a world axis (keeps children attached)
    const rotWorld = (b: THREE.Bone | undefined, axis: THREE.Vector3, deg: number) => {
      if (!b) return;
      root.updateMatrixWorld(true);
      const pw = new THREE.Quaternion();
      b.parent!.getWorldQuaternion(pw);
      const r = new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), D(deg));
      b.quaternion.premultiply(pw.clone().invert().multiply(r).multiply(pw));
    };
    // neutral pose: arms down from the T-pose, palms to the body, thumbs forward
    for (const [side, s] of [['Left', 1], ['Right', -1]] as const) rotWorld(bone(`${side}Arm`), Z, -s * 82);
    root.updateMatrixWorld(true);
    bones.forEach((b) => {
      const w0 = new THREE.Quaternion();
      b.getWorldQuaternion(w0);
      joints[short(b.name)] = {bone: b, q0: b.quaternion.clone(), w0};
    });
    return {bone, joints};
  });
  const bone = (rigs.find((r) => r.bone('LeftArm')) ?? rigs[0]).bone;

  const axisCache = new Map<string, THREE.Vector3>();
  /** world axis of the neutral pose → this bone's local axis */
  const localAxis = (j: Joint, world: THREE.Vector3) => {
    const k = `${j.bone.uuid}|${world.toArray().join(',')}`;
    if (!axisCache.has(k)) axisCache.set(k, world.clone().normalize().applyQuaternion(j.w0.clone().invert()));
    return axisCache.get(k)!;
  };
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);

  const apply = (p: Pose) => {
    for (const {joints} of rigs) {
      Object.values(joints).forEach((j) => j.bone.quaternion.copy(j.q0));
      const rot = (n: string, axis: THREE.Vector3, deg: number) => {
        const j = joints[n];
        if (!j || !deg) return;
        j.bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(localAxis(j, axis), D(deg)));
      };
      rot('Spine', X, p.lumbarFlex * 0.6);
      rot('Spine1', X, p.lumbarFlex * 0.4 + p.thoracicFlex * 0.4);
      rot('Spine2', X, p.thoracicFlex * 0.6);
      rot('Neck', X, p.neckFlex);
      rot('Head', X, -p.headExt);
      for (const [side, s] of [['Left', 1], ['Right', -1]] as const) {
        rot(`${side}Shoulder`, Y, -s * p.protract);
        rot(`${side}Shoulder`, Z, s * p.elevate);
        rot(`${side}Arm`, X, -p.armFlex);
        rot(`${side}Arm`, Z, s * p.armAbd);
        rot(`${side}Arm`, DOWN, s * p.intRot);
        rot(`${side}ForeArm`, X, -p.elbowFlex);
        rot(`${side}ForeArm`, DOWN, s * p.pronation);
        rot(`${side}Hand`, Z, -s * p.wristFlex);
        for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) {
          rot(`${side}Hand${f}1`, Z, -s * 80 * p.fist);
          rot(`${side}Hand${f}2`, Z, -s * 95 * p.fist);
          rot(`${side}Hand${f}3`, Z, -s * 60 * p.fist);
        }
        rot(`${side}HandThumb1`, Z, -s * 20 * p.fist);
        rot(`${side}HandThumb2`, Z, -s * 35 * p.fist);
        rot(`${side}Leg`, X, p.kneeFlex);
      }
    }
    root.updateMatrixWorld(true);
  };

  const ANCHORS: Record<string, [string, THREE.Vector3]> = {
    head: ['Head', new THREE.Vector3(0, 10, 9)],
    neck: ['Neck', new THREE.Vector3()],
    hand1: ['LeftHandMiddle1', new THREE.Vector3()],
    shoulder1: ['LeftArm', new THREE.Vector3()],
    elbow1: ['LeftForeArm', new THREE.Vector3()],
    wrist1: ['LeftHand', new THREE.Vector3()],
  };
  const anchor = (name: string) => {
    const [bn, off] = ANCHORS[name] ?? ['Hips', new THREE.Vector3()];
    const b = bone(bn);
    const v = new THREE.Vector3();
    b.getWorldPosition(v);
    if (name === 'head') v.add(off);
    return v;
  };

  const setMuscles = (amt: Partial<Record<MuscleName, number>>, color?: Partial<Record<MuscleName, string>>) => {
    MUSCLES.forEach((n, i) => {
      uniforms.uMAmt.value[i] = amt[n] ?? 0;
      if (color?.[n]) uniforms.uMCol.value[i].set(color[n]!);
    });
  };
  return {root, apply, anchor, materials, setMuscles};
};
