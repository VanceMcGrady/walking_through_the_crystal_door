import * as THREE from 'three';

const ARC_COUNT    = 4;   // lightning arcs per monster
const ARC_SEGS     = 9;   // points per arc (including start)
const ARC_RADIUS   = 1.6; // how far arcs extend from center
const GROUND_Y = 0.55; // sits just above the asphalt

const YELLOW = 0xffe000;
const BLUE   = 0x00aaff;

// ── Lightning arc (pre-allocated, mutated every frame) ────────────────────────

class LightningArc {
  readonly line: THREE.Line;
  private readonly buf: Float32Array;
  private readonly attr: THREE.BufferAttribute;

  constructor(color: number) {
    this.buf  = new Float32Array((ARC_SEGS + 1) * 3);
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.buf, 3);
    geo.setAttribute('position', this.attr);

    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity:     0.9,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    this.line = new THREE.Line(geo, mat);
    this.line.frustumCulled = false;
  }

  // Regenerate arc from origin toward a random point on a sphere
  regenerate(): void {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const ex    = Math.sin(phi) * Math.cos(theta) * ARC_RADIUS;
    const ey    = Math.cos(phi) * ARC_RADIUS * 0.6; // flatten vertically a bit
    const ez    = Math.sin(phi) * Math.sin(theta) * ARC_RADIUS;

    for (let s = 0; s <= ARC_SEGS; s++) {
      const t      = s / ARC_SEGS;
      const jitter = t * (1 - t) * 5.5; // parabolic: max at midpoint

      this.buf[s * 3]     = ex * t + (Math.random() - 0.5) * jitter;
      this.buf[s * 3 + 1] = ey * t + (Math.random() - 0.5) * jitter;
      this.buf[s * 3 + 2] = ez * t + (Math.random() - 0.5) * jitter;
    }

    // Anchor origin exactly at center
    this.buf[0] = 0;
    this.buf[1] = 0;
    this.buf[2] = 0;

    this.attr.needsUpdate = true;
  }
}

// ── Monster ───────────────────────────────────────────────────────────────────

export class Monster {
  readonly object: THREE.Group;
  private readonly arcs: LightningArc[];
  private t              = Math.random() * Math.PI * 2; // random phase offset
  private readonly speed: number;

  constructor(pos: THREE.Vector3, speed: number) {
    this.speed  = speed;
    this.object = new THREE.Group();
    this.object.position.copy(pos);
    this.object.position.y = GROUND_Y;

    this.buildCore();
    this.arcs = this.buildArcs();
  }

  private buildCore(): void {
    // Vary core shape per monster instance using time as a proxy for "random"
    const shapes = [
      new THREE.IcosahedronGeometry(0.52, 0),
      new THREE.OctahedronGeometry(0.58, 0),
      new THREE.TetrahedronGeometry(0.60, 0),
    ];
    const geo = shapes[Math.floor(Math.random() * shapes.length)];

    // Dark fill so the lightning pops
    this.object.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color:      0x0d0820,
      side:       THREE.FrontSide,
      depthWrite: true,
    })));

    // Bright edge lines
    const edges = new THREE.EdgesGeometry(geo);
    this.object.add(new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color:    0xaa44ff,
        blending: THREE.AdditiveBlending,
      }),
    ));
  }

  private buildArcs(): LightningArc[] {
    const arcs: LightningArc[] = [];
    for (let i = 0; i < ARC_COUNT; i++) {
      // Alternate yellow and blue, slight bias toward yellow
      const color = i % 3 === 0 ? BLUE : YELLOW;
      const arc   = new LightningArc(color);
      this.object.add(arc.line);
      arcs.push(arc);
    }
    return arcs;
  }

  update(dt: number, charPos: THREE.Vector3): void {
    this.t += dt;

    // ── Pursue character ────────────────────────────────────────────────────
    const dx = charPos.x - this.object.position.x;
    const dz = charPos.z - this.object.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.3) {
      const inv = this.speed * dt / dist;
      this.object.position.x += dx * inv;
      this.object.position.z += dz * inv;
    }

    // ── Spin ────────────────────────────────────────────────────────────────
    this.object.rotation.y += dt * (1.8 + Math.sin(this.t * 0.7) * 0.6);
    this.object.rotation.x += dt * 1.1;

    // ── Lightning: regenerate every frame for maximum flicker ───────────────
    for (const arc of this.arcs) arc.regenerate();
  }
}
