import * as THREE from 'three';

const SPEED         = 5;
const LINE_COLOR    = 0x18142a;
const FILL_OPACITY  = 0.07;

const RUN_RATE      = 4.5;   // phase radians per second
const HIP_SWING     = 0.55;  // max hip rotation (rad)
const KNEE_BEND     = 0.65;  // max knee bend (rad) — bends shin back on forward leg
const ARM_SWING     = 0.40;  // max shoulder rotation (rad)
const BODY_BOB      = 0.04;  // vertical bob amplitude (units)

export class Character {
  readonly object: THREE.Group;

  // Animated pivot groups
  private hipL!:      THREE.Group;
  private hipR!:      THREE.Group;
  private kneeL!:     THREE.Group;
  private kneeR!:     THREE.Group;
  private shoulderL!: THREE.Group;
  private shoulderR!: THREE.Group;

  private runPhase = 0;

  constructor() {
    this.object = new THREE.Group();
    this.build();
  }

  // ── Geometry helpers ────────────────────────────────────────────────────

  private addGeo(
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    x = 0, y = 0, z = 0, rx = 0, rz = 0
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
      parent.add(obj);
    }
  }

  // Cylinder from local (0,0,0) → (ex, ey, 0) within parent
  private addSeg(
    parent: THREE.Object3D,
    ex: number, ey: number,
    rFat: number, rThin: number, segs: number
  ) {
    const len = Math.sqrt(ex * ex + ey * ey);
    const rz  = Math.atan2(-ex, ey);
    this.addGeo(parent,
      new THREE.CylinderGeometry(rThin, rFat, len, segs, 1, true),
      ex / 2, ey / 2, 0, 0, rz
    );
  }

  private addJoint(parent: THREE.Object3D, r: number) {
    this.addGeo(parent, new THREE.IcosahedronGeometry(r, 0));
  }

  // Creates a child Group positioned at (x, y, 0) within parent
  private mkPivot(parent: THREE.Object3D, x: number, y: number): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    parent.add(g);
    return g;
  }

  // ── Build ────────────────────────────────────────────────────────────────

  private build() {
    const o = this.object;

    // Head — egg-shaped icosahedron, bottom flush with neck top (y 2.40)
    const headGeo = new THREE.IcosahedronGeometry(1, 0);
    headGeo.scale(0.20, 0.26, 0.18);
    this.addGeo(o, headGeo, 0, 2.66);

    // Neck
    this.addGeo(o, new THREE.CylinderGeometry(0.07, 0.08, 0.15, 3, 1, true), 0, 2.325);

    // Torso — broad shoulders (top), pinched waist (bottom)
    this.addGeo(o, new THREE.CylinderGeometry(0.44, 0.12, 0.75, 4, 1, true), 0, 1.875);

    // Pelvis — flares from waist down to hip width
    this.addGeo(o, new THREE.CylinderGeometry(0.12, 0.36, 0.22, 4, 1, true), 0, 1.39);

    // ── Arms (mirrored via side = ±1) ──────────────────────────────────
    for (const side of [-1, 1] as const) {
      const sp = this.mkPivot(o, side * 0.52, 2.18);  // shoulder pivot
      this.addJoint(sp, 0.09);
      this.addSeg(sp, side * 0.10, -0.48, 0.068, 0.055, 3); // upper arm

      const ep = this.mkPivot(sp, side * 0.10, -0.48); // elbow pivot
      this.addJoint(ep, 0.07);
      this.addSeg(ep, side * 0.04, -0.42, 0.054, 0.038, 3); // lower arm

      if (side === -1) this.shoulderL = sp;
      else             this.shoulderR = sp;
    }

    // ── Legs (mirrored via side = ±1) ──────────────────────────────────
    for (const side of [-1, 1] as const) {
      const hp = this.mkPivot(o, side * 0.22, 1.28);   // hip pivot
      this.addSeg(hp, side * 0.02, -0.70, 0.105, 0.090, 4); // thigh

      const kp = this.mkPivot(hp, side * 0.02, -0.70); // knee pivot
      this.addJoint(kp, 0.08);
      this.addSeg(kp, side * -0.02, -0.53, 0.082, 0.060, 3); // shin

      if (side === -1) { this.hipL = hp; this.kneeL = kp; }
      else             { this.hipR = hp; this.kneeR = kp; }
    }
  }

  // ── Per-frame update ─────────────────────────────────────────────────────

  move(dx: number, dz: number, dt: number) {
    const moving = dx !== 0 || dz !== 0;

    this.object.position.x += dx * SPEED * dt;
    this.object.position.z -= dz * SPEED * dt;
    if (moving) this.object.rotation.y = Math.atan2(dx, dz);

    // Advance or decay run phase
    if (moving) {
      this.runPhase += dt * RUN_RATE;
    } else {
      this.runPhase *= Math.max(0, 1 - dt * 8);
    }

    const s = Math.sin(this.runPhase);

    // Hip swing — legs alternate
    this.hipL.rotation.x  =  s * HIP_SWING;
    this.hipR.rotation.x  = -s * HIP_SWING;

    // Knee bend — the FORWARD leg lifts its shin back (negative = shin trails)
    this.kneeL.rotation.x = -Math.max(0,  s) * KNEE_BEND;
    this.kneeR.rotation.x = -Math.max(0, -s) * KNEE_BEND;

    // Arm swing — contralateral (opposite to legs)
    this.shoulderL.rotation.x = -s * ARM_SWING;
    this.shoulderR.rotation.x =  s * ARM_SWING;

    // Subtle vertical bob — peaks at mid-stride
    this.object.position.y = Math.abs(Math.sin(this.runPhase * 2)) * BODY_BOB;
  }
}
