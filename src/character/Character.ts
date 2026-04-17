import * as THREE from 'three';

const SPEED = 5;
const LINE_COLOR = 0x18142a;   // very dark navy — warm, not pure black
const FILL_OPACITY = 0.07;     // ghost-gray triangle fill, like the iStock runner reference

export class Character {
  readonly object: THREE.Group;

  constructor() {
    this.object = new THREE.Group();
    this.build();
  }

  // Adds a low-poly body part: ghost fill + edge wireframe + vertex dots
  private addPart(
    geo: THREE.BufferGeometry,
    x: number, y: number, z: number,
    rx = 0, rz = 0
  ) {
    const transform = (obj: THREE.Object3D) => {
      obj.position.set(x, y, z);
      obj.rotation.x = rx;
      obj.rotation.z = rz;
      this.object.add(obj);
    };

    // Subtle filled faces — reads as a translucent solid
    transform(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: LINE_COLOR,
      transparent: true,
      opacity: FILL_OPACITY,
      side: THREE.DoubleSide,
      depthWrite: false,
    })));

    // Edge wireframe
    transform(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: LINE_COLOR })
    ));

    // Vertex dots — the connective-tissue nodes from the reference
    transform(new THREE.Points(geo, new THREE.PointsMaterial({
      color: LINE_COLOR,
      size: 0.06,
      sizeAttenuation: true,
    })));
  }

  private build() {
    // Head — icosahedron gives the faceted polygon-mesh look
    this.addPart(new THREE.IcosahedronGeometry(0.22, 1), 0, 1.85, 0);

    // Neck
    this.addPart(new THREE.CylinderGeometry(0.07, 0.09, 0.18, 4), 0, 1.64, 0);

    // Torso — 5-sided faceted column
    this.addPart(new THREE.CylinderGeometry(0.22, 0.18, 0.60, 5), 0, 1.23, 0);

    // Hips
    this.addPart(new THREE.CylinderGeometry(0.18, 0.14, 0.18, 5), 0, 0.89, 0);

    // Arms — angled outward from shoulders
    this.addPart(new THREE.CylinderGeometry(0.065, 0.050, 0.38, 4), -0.31, 1.30, 0, 0,  0.50);
    this.addPart(new THREE.CylinderGeometry(0.065, 0.050, 0.38, 4),  0.31, 1.30, 0, 0, -0.50);
    this.addPart(new THREE.CylinderGeometry(0.048, 0.038, 0.30, 4), -0.51, 1.01, 0, 0,  0.30);
    this.addPart(new THREE.CylinderGeometry(0.048, 0.038, 0.30, 4),  0.51, 1.01, 0, 0, -0.30);

    // Legs
    this.addPart(new THREE.CylinderGeometry(0.100, 0.085, 0.44, 4), -0.13, 0.56, 0);
    this.addPart(new THREE.CylinderGeometry(0.100, 0.085, 0.44, 4),  0.13, 0.56, 0);
    this.addPart(new THREE.CylinderGeometry(0.072, 0.055, 0.38, 4), -0.14, 0.20, 0);
    this.addPart(new THREE.CylinderGeometry(0.072, 0.055, 0.38, 4),  0.14, 0.20, 0);
  }

  move(dx: number, dz: number, dt: number) {
    this.object.position.x += dx * SPEED * dt;
    this.object.position.z -= dz * SPEED * dt;

    if (dx !== 0 || dz !== 0) {
      this.object.rotation.y = Math.atan2(dx, dz);
    }
  }
}
