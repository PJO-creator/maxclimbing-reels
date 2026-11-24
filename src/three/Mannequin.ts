import * as THREE from 'three';

/**
 * Reusable posable mannequin (artist-doll style), built imperatively so the same
 * rig drives both the 3D render and the 2D label positions (via getWorldPosition).
 *
 * Units: cm. Y up, the figure faces +Z. Side s = +1 is the figure's left (+X).
 * All angles in degrees.
 */
export type Pose = {
  lumbarFlex: number; // forward bend of the lower back
  thoracicFlex: number; // rounding of the upper back
  neckFlex: number; // neck tilts forward
  headExt: number; // head tilts back to keep the eyes level
  protract: number; // shoulder blades forward around the rib cage
  elevate: number; // shoulders up to the ears
  armFlex: number; // arm forward (+) / back (-)
  armAbd: number; // arm out to the side
  intRot: number; // upper arm rotated inward (+) / outward (-)
  elbowFlex: number;
  pronation: number; // forearm: palm back (+) / thumb forward (0)
  wristFlex: number; // wrist curled towards the palm (+)
  fist: number; // 0 = open hand, 1 = fist
  kneeFlex: number;
};

export const POSES: Record<string, Pose> = {
  // "How I woke up": head forward, shoulders rolled in, arms bent, wrists curled, fists
  hunched: {lumbarFlex: -7, thoracicFlex: 28, neckFlex: 26, headExt: 60, protract: 16, elevate: 4, armFlex: 12, armAbd: 4, intRot: 40, elbowFlex: 55, pronation: 75, wristFlex: 45, fist: 1, kneeFlex: 4},
  // Neutral, tall posture: ears over shoulders, shoulders back and down, arms relaxed
  upright: {lumbarFlex: -2, thoracicFlex: 2, neckFlex: 3, headExt: 0, protract: -4, elevate: -2, armFlex: 0, armAbd: 6, intRot: -8, elbowFlex: 8, pronation: 5, wristFlex: 0, fist: 0.18, kneeFlex: 0},
};

export const lerpPose = (a: Pose, b: Pose, t: Partial<Record<keyof Pose, number>> | number): Pose => {
  const out = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    const tk = typeof t === 'number' ? t : t[k] ?? 0;
    out[k] = a[k] + (b[k] - a[k]) * tk;
  });
  return out;
};

const D = THREE.MathUtils.degToRad;

export type MuscleGroup = 'pecs' | 'lats' | 'traps' | 'cuff';

export type Rig = {
  root: THREE.Group;
  apply: (p: Pose) => void;
  /** world positions of named anchors (call after apply) */
  anchor: (name: string) => THREE.Vector3;
  muscles: Record<MuscleGroup, THREE.MeshStandardMaterial>;
  dispose: () => void;
};

type Parts = Record<string, THREE.Object3D>;

export const buildMannequin = (opts?: {skin?: string; joint?: string}): Rig => {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const skin = new THREE.MeshStandardMaterial({color: opts?.skin ?? '#d8d2c8', roughness: 0.62, metalness: 0.0});
  const jointMat = new THREE.MeshStandardMaterial({color: opts?.joint ?? '#bdb6aa', roughness: 0.5, metalness: 0.0});
  const boneMat = new THREE.MeshStandardMaterial({color: '#efe9dd', roughness: 0.7, transparent: true, opacity: 0.0});
  mats.push(skin, jointMat, boneMat);

  const mk = (color: string) => {
    const m = new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: 0.9, roughness: 0.5, transparent: true, opacity: 0, depthWrite: false});
    mats.push(m);
    return m;
  };
  const muscles: Record<MuscleGroup, THREE.MeshStandardMaterial> = {
    pecs: mk('#FFB020'),
    lats: mk('#FFB020'),
    traps: mk('#E0201B'),
    cuff: mk('#E0201B'),
  };

  const sphere = new THREE.SphereGeometry(1, 48, 32);
  geos.push(sphere);
  const capCache: Record<string, THREE.CapsuleGeometry> = {};
  const capsule = (r: number, len: number) => {
    const k = `${r}-${len}`;
    if (!capCache[k]) {
      capCache[k] = new THREE.CapsuleGeometry(r, len, 12, 32);
      geos.push(capCache[k]);
    }
    return capCache[k];
  };

  const P: Parts = {};
  const node = (name: string, parent: THREE.Object3D, pos: [number, number, number]) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(...pos);
    g.rotation.order = 'YXZ';
    parent.add(g);
    P[name] = g;
    return g;
  };
  const ell = (parent: THREE.Object3D, pos: [number, number, number], scale: [number, number, number], mat: THREE.Material = skin, rot?: [number, number, number]) => {
    const m = new THREE.Mesh(sphere, mat);
    m.position.set(...pos);
    m.scale.set(...scale);
    if (rot) m.rotation.set(D(rot[0]), D(rot[1]), D(rot[2]));
    parent.add(m);
    return m;
  };
  /** capsule hanging down from the parent origin */
  const limb = (parent: THREE.Object3D, r: number, len: number, mat: THREE.Material = skin) => {
    const m = new THREE.Mesh(capsule(r, len - 2 * r), mat);
    m.position.set(0, -len / 2, 0);
    parent.add(m);
    return m;
  };
  const anchorPt = (name: string, parent: THREE.Object3D, pos: [number, number, number]) => node(`a:${name}`, parent, pos);

  const root = new THREE.Group();

  // ---- pelvis + legs ----
  const pelvis = node('pelvis', root, [0, 98, 0]);
  ell(pelvis, [0, 0, 0], [14.5, 9.5, 10.5]);
  for (const s of [1, -1]) {
    const hip = node(`hip${s}`, pelvis, [s * 9, -5, 0]);
    ell(hip, [0, 0, 0], [6.5, 6.5, 6.5], jointMat);
    limb(hip, 6.6, 44);
    const knee = node(`knee${s}`, hip, [0, -44, 0]);
    ell(knee, [0, 0, 0], [5, 5, 5], jointMat);
    limb(knee, 5, 42);
    const ankle = node(`ankle${s}`, knee, [0, -42, 0]);
    ell(ankle, [0, 0, 0], [3.6, 3.6, 3.6], jointMat);
    ell(ankle, [0, -3.5, 6], [4.6, 3, 11]);
  }

  // ---- spine ----
  const lumbar = node('lumbar', pelvis, [0, 5, 0]);
  ell(lumbar, [0, 6, 0.5], [12.2, 9.8, 8.8]);
  const thorax = node('thorax', lumbar, [0, 13, 0]);
  ell(thorax, [0, 16, 0], [15.2, 17.5, 10.4]); // rib cage
  // muscles on the rib cage
  for (const s of [1, -1]) {
    ell(thorax, [s * 8.2, 23, 8.6], [7.6, 5.6, 2.6], muscles.pecs, [8, s * 18, 0]);
    ell(thorax, [s * 11.5, 10, -6.5], [5.2, 13, 3.2], muscles.lats, [0, s * -28, s * -14]);
    ell(thorax, [s * 5.2, 15, -9.6], [3.6, 9.5, 1.3], muscles.traps, [-8, 0, s * -24]); // lower traps: low at the spine, up and out to the shoulder blade
    ell(thorax, [s * 6.2, 25.5, -9.2], [6, 2.8, 1.3], muscles.traps, [8, 0, 0]); // middle traps
  }
  anchorPt('upperBack', thorax, [0, 22, -12]);
  anchorPt('chest', thorax, [0, 24, 11]);

  // ---- neck + head ----
  const neck = node('neck', thorax, [0, 33, -1]);
  limb(neck, 4.4, 10);
  // the capsule hangs down; flip it up
  (neck.children[0] as THREE.Mesh).position.set(0, 5, 0);
  const head = node('head', neck, [0, 9, 0]);
  ell(head, [0, 10, 1.5], [9.2, 11.8, 10.8]);
  ell(head, [0, 2.2, 6.5], [5.8, 3.2, 4.2]); // jaw
  anchorPt('head', head, [0, 10, 10]);
  anchorPt('ear', head, [9, 10, 0]);

  // ---- shoulder girdle + arms ----
  for (const s of [1, -1]) {
    // clavicle pivots near the sternum; rotating it moves the shoulder forward/up
    const clav = node(`clav${s}`, thorax, [s * 2.5, 30, 7]);
    const shoulder = node(`shoulder${s}`, clav, [s * 15, -1, -9]);
    ell(shoulder, [0, 0, 0], [5.6, 5.6, 5.6], jointMat);
    ell(shoulder, [-s * 6.5, -7.5, -7.2], [4, 5.2, 1], muscles.cuff, [0, 0, s * 8]); // infraspinatus on the shoulder blade
    anchorPt(`shoulder${s}`, shoulder, [0, 0, 0]);
    const arm = node(`arm${s}`, shoulder, [0, 0, 0]);
    limb(arm, 4.6, 30);
    const elbow = node(`elbow${s}`, arm, [0, -30, 0]);
    ell(elbow, [0, 0, 0], [3.9, 3.9, 3.9], jointMat);
    anchorPt(`elbow${s}`, elbow, [0, 0, 0]);
    const fore = node(`fore${s}`, elbow, [0, 0, 0]);
    limb(fore, 3.7, 26);
    const wrist = node(`wrist${s}`, fore, [0, -26, 0]);
    ell(wrist, [0, 0, 0], [2.7, 2.7, 2.7], jointMat);
    anchorPt(`wrist${s}`, wrist, [0, -4, 0]);
    // hand: palm faces -s*X (towards the body) in the neutral forearm, thumb towards +Z
    const palm = new THREE.Mesh(sphere, skin);
    palm.position.set(0, -5, 0);
    palm.scale.set(2.2, 5.2, 4.4);
    wrist.add(palm);
    const zs = [3.1, 1.05, -1.0, -2.9];
    const lens = [[4.2, 3.4], [4.6, 3.8], [4.4, 3.6], [3.6, 2.9]];
    zs.forEach((z, i) => {
      let par: THREE.Object3D = node(`f${s}${i}a`, wrist, [0, -9.6, z]);
      lens[i].forEach((L, j) => {
        if (j > 0) par = node(`f${s}${i}${j === 1 ? 'b' : 'c'}`, par, [0, -lens[i][j - 1], 0]);
        limb(par, 0.95, L + 0.6);
      });
    });
    const th = node(`thumb${s}a`, wrist, [-s * 0.8, -3.5, 3.6]);
    limb(th, 1.15, 4.4);
    const th2 = node(`thumb${s}b`, th, [0, -4.4, 0]);
    limb(th2, 1.05, 3.6);
  }

  const apply = (p: Pose) => {
    P.lumbar.rotation.x = D(p.lumbarFlex);
    P.thorax.rotation.x = D(p.thoracicFlex);
    P.neck.rotation.x = D(p.neckFlex);
    P.head.rotation.x = D(-p.headExt);
    for (const s of [1, -1]) {
      P[`clav${s}`].rotation.y = D(-s * p.protract);
      P[`clav${s}`].rotation.z = D(s * p.elevate);
      const arm = P[`arm${s}`];
      arm.rotation.x = D(-p.armFlex);
      arm.rotation.z = D(s * p.armAbd);
      arm.rotation.y = D(-s * p.intRot);
      P[`elbow${s}`].rotation.x = D(-p.elbowFlex);
      P[`fore${s}`].rotation.y = D(-s * p.pronation);
      P[`wrist${s}`].rotation.z = D(-s * p.wristFlex);
      for (let i = 0; i < 4; i++) {
        P[`f${s}${i}a`].rotation.z = D(-s * 85 * p.fist);
        P[`f${s}${i}b`].rotation.z = D(-s * 100 * p.fist);
      }
      P[`thumb${s}a`].rotation.set(D(25 - 10 * p.fist), 0, D(-s * (10 + 45 * p.fist)));
      P[`thumb${s}b`].rotation.z = D(-s * 35 * p.fist);
      P[`knee${s}`].rotation.x = D(p.kneeFlex);
    }
    P.pelvis.position.y = 98 - p.kneeFlex * 0.15;
    root.updateMatrixWorld(true);
  };

  const anchor = (name: string) => {
    const o = P[`a:${name}`];
    const v = new THREE.Vector3();
    if (o) o.getWorldPosition(v);
    return v;
  };

  apply(POSES.upright);

  return {
    root,
    apply,
    anchor,
    muscles,
    dispose: () => {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
    },
  };
};
