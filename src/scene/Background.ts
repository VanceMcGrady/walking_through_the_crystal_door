import * as THREE from 'three';

// Mountain backdrop — always follows the player so peaks are never reachable.
// Mountains begin beyond the fog onset so they read as a distant silhouette,
// never as navigable terrain.

const SIZE       = 400;
const SEGS       = 96;
const INNER_FLAT = 105;  // flat within this radius — past fog start (100 units)
const RAMP       = 25;
const BG_COLOR   = 0xf0ece0;
const LINE_COLOR = 0x7a7060;

function peakAt(x: number, z: number): number {
  const d = Math.sqrt(x * x + z * z);
  const t = Math.max(0, Math.min(1, (d - INNER_FLAT) / RAMP));
  if (t === 0) return 0;

  const h =
    Math.sin(x * 0.048) * Math.cos(z * 0.042) * 34 +
    Math.sin(x * 0.095 + 1.70) * Math.sin(z * 0.082 + 0.90) * 19 +
    Math.sin(x * 0.180 + 3.20) * Math.cos(z * 0.150 + 1.10) *  9 +
    Math.sin(x * 0.340)        * Math.sin(z * 0.280 + 2.30) *  4;

  return t * Math.max(0, h);
}

export class Background {
  private readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    // Sink slightly below y=0 so the flat base never z-fights with Terrain
    this.group.position.y = -0.05;
    scene.add(this.group);

    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, peakAt(pos.getX(i), pos.getZ(i)));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    // Solid fill — mountain peaks occlude anything behind them
    this.group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: BG_COLOR,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })));

    // Wireframe silhouette
    this.group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: LINE_COLOR,
      wireframe: true,
      transparent: true,
      opacity: 0.48,
    })));
  }

  update(px: number, pz: number) {
    this.group.position.set(px, -0.05, pz);
  }
}
