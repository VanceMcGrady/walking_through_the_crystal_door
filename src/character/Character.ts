import * as THREE from 'three';

const SPEED         = 14;
const LINE_COLOR    = 0x18142a;
const FILL_OPACITY  = 1;

const RUN_RATE      = 8.0;
const HIP_SWING     = 1.05;
const KNEE_BEND     = 1.55;
const ARM_SWING     = 0.70;
const BODY_BOB      = 0.09;

const ELECTRIC_COLORS = [0x00b4d8, 0x06d6a0, 0xe040fb] as const;
const ELECTRIC_RATE   = 4.3;  // flicker speed

export class Character {
  readonly object: THREE.Group;

  private hipL!:      THREE.Group;
  private hipR!:      THREE.Group;
  private kneeL!:     THREE.Group;
  private kneeR!:     THREE.Group;
  private shoulderL!: THREE.Group;
  private shoulderR!: THREE.Group;
  private elbowR!:    THREE.Group;

  private emberLight: THREE.PointLight | null = null;
  private emberMesh:  THREE.Mesh        | null = null;
  private emberT = 0;

  private attacking     = false;
  private attackT       = 0;
  private readonly ATTACK_DUR = 0.46;

  private runPhase          = 0;
  private electricTime      = 0;
  private electricMats: THREE.LineBasicMaterial[]    = [];
  private electricOverlays: THREE.LineSegments[]     = [];
  private electricBases:    THREE.Vector3[]          = [];

  constructor() {
    this.object = new THREE.Group();
    this.build();
    this.buildElectricOverlay();
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
    const torsoGeo = new THREE.CylinderGeometry(0.44, 0.12, 0.75, 4, 1, true);
    torsoGeo.scale(1, 1, 0.45);
    this.addGeo(o, torsoGeo, 0, 1.875);

    // Pelvis — flares from waist down to hip width
    const pelvisGeo = new THREE.CylinderGeometry(0.12, 0.36, 0.22, 4, 1, true);
    pelvisGeo.scale(1, 1, 0.45);
    this.addGeo(o, pelvisGeo, 0, 1.39);

    // ── Arms (mirrored via side = ±1) ──────────────────────────────────
    for (const side of [-1, 1] as const) {
      const sp = this.mkPivot(o, side * 0.52, 2.18);  // shoulder pivot
      this.addJoint(sp, 0.09);
      this.addSeg(sp, side * 0.10, -0.48, 0.068, 0.055, 3); // upper arm

      const ep = this.mkPivot(sp, side * 0.10, -0.48); // elbow pivot
      this.addJoint(ep, 0.07);
      this.addSeg(ep, side * 0.04, -0.42, 0.054, 0.038, 3); // lower arm

      if (side === -1) this.shoulderL = sp;
      else           { this.shoulderR = sp; this.elbowR = ep; }
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

  // ── Electric overlay ────────────────────────────────────────────────────

  private buildElectricOverlay() {
    this.electricMats = ELECTRIC_COLORS.map(c =>
      new THREE.LineBasicMaterial({
        color: c, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );

    // Collect every LineSegments in the character hierarchy
    const segments: { obj: THREE.LineSegments; world: THREE.Object3D }[] = [];
    this.object.traverse(child => {
      if (child instanceof THREE.LineSegments) segments.push({ obj: child, world: child.parent! });
    });

    // For each color, clone all segments sharing the same geometry
    for (const mat of this.electricMats) {
      for (const { obj, world } of segments) {
        const clone = new THREE.LineSegments(obj.geometry, mat);
        clone.position.copy(obj.position);
        clone.rotation.copy(obj.rotation);
        clone.scale.copy(obj.scale);
        world.add(clone);
        this.electricOverlays.push(clone);
        this.electricBases.push(obj.position.clone());
      }
    }
  }

  // ── Equip cigarette ──────────────────────────────────────────────────────

  equipCigarette(): void {
    // Wrist group at the tip of the right lower arm
    const wrist = new THREE.Group();
    wrist.position.set(0.04, -0.42, 0);
    this.elbowR.add(wrist);

    const cig = new THREE.Group();
    // rotation.x = -π/2 maps the cylinder's Y axis → -Z (character's forward = tip)
    cig.rotation.x = -Math.PI / 2;
    // Offset so the grip sits in the hand; blade extends forward
    cig.position.z = -1.05;
    wrist.add(cig);

    // ── Blade — long tapered white cylinder ──────────────────────────────
    const bodyGeo = new THREE.CylinderGeometry(0.066, 0.040, 2.5, 8);
    cig.add(new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: 0xf2ede4 })));
    cig.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(bodyGeo),
      new THREE.LineBasicMaterial({ color: 0x888070 }),
    ));

    // ── Guard — flat disc at blade/grip junction ──────────────────────────
    const guardGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.07, 10);
    const guard    = new THREE.Mesh(guardGeo, new THREE.MeshBasicMaterial({ color: 0x7a5530 }));
    guard.position.y = -1.12;
    cig.add(guard);
    const guardEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(guardGeo),
      new THREE.LineBasicMaterial({ color: 0x3a2010 }),
    );
    guardEdges.position.y = -1.12;
    cig.add(guardEdges);

    // ── Grip — thick tan cylinder ─────────────────────────────────────────
    const gripGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.30, 8);
    const grip    = new THREE.Mesh(gripGeo, new THREE.MeshBasicMaterial({ color: 0x9b7040 }));
    grip.position.y = -1.40;
    cig.add(grip);

    // ── Ember — orange-red glowing tip (at +y → forward) ─────────────────
    const emberGeo = new THREE.SphereGeometry(0.10, 8, 6);
    this.emberMesh = new THREE.Mesh(emberGeo, new THREE.MeshBasicMaterial({ color: 0xff5500 }));
    this.emberMesh.position.y = 1.30;
    cig.add(this.emberMesh);

    // Ash collar behind ember
    const ashGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.08, 8);
    const ash    = new THREE.Mesh(ashGeo, new THREE.MeshBasicMaterial({ color: 0xbbbbbb }));
    ash.position.y = 1.12;
    cig.add(ash);

    // ── Ember light ───────────────────────────────────────────────────────
    this.emberLight           = new THREE.PointLight(0xff4400, 1.0, 4.0);
    this.emberLight.position.y = 1.30;
    cig.add(this.emberLight);
  }

  // ── Attack ───────────────────────────────────────────────────────────────

  startAttack(): void {
    if (!this.emberLight || this.attacking) return;
    this.attacking = true;
    this.attackT   = 0;
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

    // Knee bend — leading leg gets full lift, trailing leg keeps a 55% follow-through bend
    this.kneeL.rotation.x = (Math.max(0,  s) + Math.max(0, -s) * 0.55) * KNEE_BEND;
    this.kneeR.rotation.x = (Math.max(0, -s) + Math.max(0,  s) * 0.55) * KNEE_BEND;

    // Arm swing — contralateral (opposite to legs)
    this.shoulderL.rotation.x = -s * ARM_SWING;

    if (this.attacking) {
      this.attackT = Math.min(this.attackT + dt, this.ATTACK_DUR);
      const p = this.attackT / this.ATTACK_DUR; // 0 → 1

      // Wind up (0–0.28): arm pulls back to +1.9
      // Slash  (0.28–0.68): quadratic ease-in swing through to −2.5 (fast acceleration)
      // Recovery (0.68–1): return to rest
      if (p < 0.28) {
        this.shoulderR.rotation.x = (p / 0.28) * 1.9;
      } else if (p < 0.68) {
        const sp = (p - 0.28) / 0.40;
        this.shoulderR.rotation.x = 1.9 - sp * sp * 4.4;
      } else {
        const rp = (p - 0.68) / 0.32;
        this.shoulderR.rotation.x = -2.5 + rp * 2.5;
      }

      if (this.attackT >= this.ATTACK_DUR) this.attacking = false;
    } else {
      this.shoulderR.rotation.x = s * ARM_SWING;
    }

    // Subtle vertical bob — peaks at mid-stride
    this.object.position.y = Math.abs(Math.sin(this.runPhase * 2)) * BODY_BOB;

    // Electric flicker
    this.electricTime += dt * ELECTRIC_RATE;
    const phase = Math.PI * 2 / 3;
    for (let i = 0; i < this.electricMats.length; i++) {
      const t = this.electricTime + i * phase;
      // Sharp spike envelope: narrow bright pulses
      const spike = Math.pow(Math.max(0, Math.sin(t)), 6) * 0.82
                  + Math.pow(Math.max(0, Math.sin(t * 2.7 + 0.9)), 10) * 0.55;
      this.electricMats[i].opacity = Math.min(1, spike);
    }

    // Ember flicker
    if (this.emberLight && this.emberMesh) {
      this.emberT += dt;
      const flicker = 0.55 + Math.sin(this.emberT * 11.3) * 0.25 + Math.random() * 0.2;
      this.emberLight.intensity = flicker;
      (this.emberMesh.material as THREE.MeshBasicMaterial).color.setHSL(
        0.06 - Math.random() * 0.03, 1, 0.52 + Math.random() * 0.12,
      );
    }

    // Jitter each overlay slightly so arcs appear to wander
    for (let j = 0; j < this.electricOverlays.length; j++) {
      const ov   = this.electricOverlays[j];
      const base = this.electricBases[j];
      ov.position.set(
        base.x + (Math.random() - 0.5) * 0.030,
        base.y + (Math.random() - 0.5) * 0.030,
        base.z + (Math.random() - 0.5) * 0.030,
      );
    }
  }
}
