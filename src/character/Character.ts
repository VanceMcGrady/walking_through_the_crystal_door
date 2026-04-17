import * as THREE from 'three';

const SPEED = 5;
const LINE_COLOR = 0x18142a;
const FILL_OPACITY = 0.07;

export class Character {
  readonly object: THREE.Group;

  constructor() {
    this.object = new THREE.Group();
    this.build();
  }

  private addPart(
    geo: THREE.BufferGeometry,
    x: number, y: number, z: number,
    rx = 0, rz = 0
  ) {
    for (const obj of [
      new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: LINE_COLOR, transparent: true, opacity: FILL_OPACITY,
        side: THREE.DoubleSide, depthWrite: false,
      })),
      new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: LINE_COLOR })
      ),
      new THREE.Points(geo, new THREE.PointsMaterial({
        color: LINE_COLOR, size: 0.07, sizeAttenuation: true,
      })),
    ]) {
      obj.position.set(x, y, z);
      obj.rotation.set(rx, 0, rz);
      this.object.add(obj);
    }
  }

  // Places a cylinder whose ends land exactly on (x1,y1) and (x2,y2).
  // rFat = radius at p1 end, rThin = radius at p2 end.
  private addSegment(
    x1: number, y1: number,
    x2: number, y2: number,
    rFat: number, rThin: number,
    radialSegs: number
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    // atan2(-dx, dy) rotates the cylinder's +Y axis to point from p1 → p2
    const rz = Math.atan2(-dx, dy);
    // rFat maps to the bottom (p1 side), rThin to the top (p2 side)
    this.addPart(
      new THREE.CylinderGeometry(rThin, rFat, len, radialSegs, 1, true),
      (x1 + x2) / 2, (y1 + y2) / 2, 0,
      0, rz
    );
  }

  private build() {
    // ── Joint positions (x, y) ───────────────────────────────────────────
    //
    //  HEAD_CTR  (0, 2.55)
    //  NECK_T    (0, 2.30)   NECK_B   (0, 2.15)
    //  TORSO_T   (0, 2.15)   TORSO_B  (0, 1.35)   ← long torso, 0.80 units
    //  SHLDR_L  (-0.52, 2.08)   SHLDR_R  (0.52, 2.08)  ← broad shoulders
    //  ELBOW_L  (-0.74, 1.62)   ELBOW_R  (0.74, 1.62)
    //  WRIST_L  (-0.84, 1.15)   WRIST_R  (0.84, 1.15)
    //  PELVIS_B  (0, 1.18)   ← wide frustum bridging torso→legs
    //  HIP_L    (-0.20, 1.18)   HIP_R    (0.20, 1.18)
    //  KNEE_L   (-0.24, 0.72)   KNEE_R   (0.24, 0.72)
    //  ANKLE_L  (-0.22, 0.05)   ANKLE_R  (0.22, 0.05)

    // Head — unit icosahedron scaled to an egg: taller than wide, slightly flat front-to-back.
    // Bottom of head (2.58 - 0.28 = 2.30) sits flush with neck top.
    const headGeo = new THREE.IcosahedronGeometry(1, 0);
    headGeo.scale(0.22, 0.28, 0.20);
    this.addPart(headGeo, 0, 2.58, 0);

    // Neck
    this.addSegment(0, 2.30,  0, 2.15,  0.09, 0.07, 3);

    // Torso — wide at shoulders, narrow at hips: strong inverted-triangle silhouette
    this.addSegment(0, 2.15,  0, 1.35,  0.44, 0.14, 4);

    // Upper arms: shoulder → elbow
    this.addSegment(-0.52, 2.08, -0.74, 1.62,  0.072, 0.056, 3);
    this.addSegment( 0.52, 2.08,  0.74, 1.62,  0.072, 0.056, 3);

    // Lower arms: elbow → wrist
    this.addSegment(-0.74, 1.62, -0.84, 1.15,  0.054, 0.038, 3);
    this.addSegment( 0.74, 1.62,  0.84, 1.15,  0.054, 0.038, 3);

    // Pelvis — wider than the leg outer edges (~0.31) so hips read as the widest point below the waist
    this.addSegment(0, 1.35,  0, 1.18,  0.36, 0.14, 4);

    // Upper legs: hip → knee
    this.addSegment(-0.22, 1.18, -0.24, 0.72,  0.105, 0.088, 4);
    this.addSegment( 0.22, 1.18,  0.24, 0.72,  0.105, 0.088, 4);

    // Lower legs: knee → ankle
    this.addSegment(-0.24, 0.72, -0.22, 0.05,  0.080, 0.058, 3);
    this.addSegment( 0.24, 0.72,  0.22, 0.05,  0.080, 0.058, 3);
  }

  move(dx: number, dz: number, dt: number) {
    this.object.position.x += dx * SPEED * dt;
    this.object.position.z -= dz * SPEED * dt;

    if (dx !== 0 || dz !== 0) {
      this.object.rotation.y = Math.atan2(dx, dz);
    }
  }
}
