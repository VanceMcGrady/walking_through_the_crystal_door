import * as THREE from 'three';

const SPEED = 5;

export class Character {
  readonly object: THREE.Group;

  constructor() {
    this.object = new THREE.Group();
    this.build();
  }

  private build() {
    const mat = new THREE.LineBasicMaterial({ color: 0x000000 });

    const head = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.4, 0.4, 0.4)),
      mat
    );
    head.position.y = 1.7;

    const torso = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, 0.7, 0.3)),
      mat
    );
    torso.position.y = 1.1;

    // Arms and legs as paired line segments
    const limbPoints = [
      new THREE.Vector3(-0.25, 1.45, 0), new THREE.Vector3(-0.55, 0.9, 0), // left arm
      new THREE.Vector3( 0.25, 1.45, 0), new THREE.Vector3( 0.55, 0.9, 0), // right arm
      new THREE.Vector3(-0.15, 0.75, 0), new THREE.Vector3(-0.2,  0.0, 0), // left leg
      new THREE.Vector3( 0.15, 0.75, 0), new THREE.Vector3( 0.2,  0.0, 0), // right leg
    ];
    const limbs = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(limbPoints),
      mat
    );

    this.object.add(head, torso, limbs);
  }

  move(dx: number, dz: number, dt: number) {
    this.object.position.x += dx * SPEED * dt;
    this.object.position.z -= dz * SPEED * dt;

    if (dx !== 0 || dz !== 0) {
      this.object.rotation.y = Math.atan2(dx, dz);
    }
  }
}
