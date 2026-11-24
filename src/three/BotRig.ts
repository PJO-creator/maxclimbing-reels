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

export type BotRig = {
  root: THREE.Object3D;
  apply: (p: Pose) => void;
  anchor: (name: string) => THREE.Vector3;
  materials: THREE.MeshStandardMaterial[];
};

export const loadBot = (buf: ArrayBuffer, look?: {color?: string; joints?: string}): BotRig => {
  const root = new FBXLoader().parse(buf, '');
  const materials: THREE.MeshStandardMaterial[] = [];
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    const orig = ([] as THREE.Material[]).concat(m.material);
    m.frustumCulled = false;
    if (orig.some((x) => (x as THREE.MeshPhongMaterial).map)) return; // textured character: keep its look
    const isJoint = /Joints/.test(m.name);
    const mat = new THREE.MeshStandardMaterial({color: isJoint ? look?.joints ?? '#9c968c' : look?.color ?? '#d8d2c8', roughness: isJoint ? 0.45 : 0.6, metalness: 0});
    m.material = mat;
    m.frustumCulled = false;
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

  return {root, apply, anchor, materials};
};
