import * as THREE from 'three';

const SIZE       = 140;
const SEGS       = 56;    // 2.5-unit cells
const BG_COLOR   = 0xf0ece0;
const LINE_COLOR = 0x8a8070;

export class Terrain {
  private readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);

    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);

    // Solid fill sits just behind the wireframe to occlude the base plane beneath
    this.group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: BG_COLOR,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })));

    this.group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: LINE_COLOR,
      wireframe: true,
      transparent: true,
      opacity: 0.52,
    })));
  }

  update(px: number, pz: number) {
    this.group.position.set(px, 0, pz);
  }
}
