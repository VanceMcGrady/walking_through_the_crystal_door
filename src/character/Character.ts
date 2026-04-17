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

  // Small icosahedron sphere for mechanical ball joints (shoulders, elbows, knees)
  private addJoint(x: number, y: number, radius: number) {
    this.addPart(new THREE.IcosahedronGeometry(radius, 0), x, y, 0);
  }

  private build() {
    // ── Joint positions — proportioned from character_inspo.jpg ─────────
    //
    //  HEAD_CTR  (0, 2.66)   small head, ~1/7 total height
    //  NECK_T    (0, 2.40)   NECK_B   (0, 2.25)
    //  TORSO_T   (0, 2.25)   TORSO_B  (0, 1.50)   strong V-shape
    //  SHLDR_L  (-0.52, 2.18)   SHLDR_R  (0.52, 2.18)  ball joints
    //  ELBOW_L  (-0.62, 1.70)   ELBOW_R  (0.62, 1.70)  ball joints
    //  WRIST_L  (-0.66, 1.28)   WRIST_R  (0.66, 1.28)
    //  PELVIS_T  (0, 1.50)   PELVIS_B (0, 1.28)
    //  HIP_L    (-0.22, 1.28)   HIP_R    (0.22, 1.28)
    //  KNEE_L   (-0.24, 0.58)   KNEE_R   (0.24, 0.58)  ball joints
    //  ANKLE_L  (-0.22, 0.05)   ANKLE_R  (0.22, 0.05)
    //  thigh 0.70, shin 0.53  — thighs clearly longer, per reference

    // Head — egg-shaped (bottom flush with neck top at 2.40)
    const headGeo = new THREE.IcosahedronGeometry(1, 0);
    headGeo.scale(0.20, 0.26, 0.18);
    this.addPart(headGeo, 0, 2.66, 0);

    // Neck
    this.addSegment(0, 2.40,  0, 2.25,  0.08, 0.07, 3);

    // Torso — dramatic V: broad chest, pinched waist
    this.addSegment(0, 2.25,  0, 1.50,  0.44, 0.12, 4);

    // Shoulder ball joints
    this.addJoint(-0.52, 2.18, 0.09);
    this.addJoint( 0.52, 2.18, 0.09);

    // Upper arms — close to body, slight outward drop
    this.addSegment(-0.52, 2.18, -0.62, 1.70,  0.068, 0.055, 3);
    this.addSegment( 0.52, 2.18,  0.62, 1.70,  0.068, 0.055, 3);

    // Elbow ball joints
    this.addJoint(-0.62, 1.70, 0.07);
    this.addJoint( 0.62, 1.70, 0.07);

    // Lower arms
    this.addSegment(-0.62, 1.70, -0.66, 1.28,  0.054, 0.038, 3);
    this.addSegment( 0.62, 1.70,  0.66, 1.28,  0.054, 0.038, 3);

    // Pelvis — shield-shaped frustum, wider than legs
    this.addSegment(0, 1.50,  0, 1.28,  0.36, 0.12, 4);

    // Upper legs — thighs noticeably longer than shins (0.70 vs 0.53)
    this.addSegment(-0.22, 1.28, -0.24, 0.58,  0.105, 0.090, 4);
    this.addSegment( 0.22, 1.28,  0.24, 0.58,  0.105, 0.090, 4);

    // Knee ball joints
    this.addJoint(-0.24, 0.58, 0.08);
    this.addJoint( 0.24, 0.58, 0.08);

    // Lower legs — shins
    this.addSegment(-0.24, 0.58, -0.22, 0.05,  0.082, 0.060, 3);
    this.addSegment( 0.24, 0.58,  0.22, 0.05,  0.082, 0.060, 3);
  }

  move(dx: number, dz: number, dt: number) {
    this.object.position.x += dx * SPEED * dt;
    this.object.position.z -= dz * SPEED * dt;

    if (dx !== 0 || dz !== 0) {
      this.object.rotation.y = Math.atan2(dx, dz);
    }
  }
}
