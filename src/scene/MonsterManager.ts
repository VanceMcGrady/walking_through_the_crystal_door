import * as THREE from 'three';
import { Monster } from './Monster';

// Spawn points distributed throughout the dealership strip.
// Z values match the dealership layout (scene starts at z=-22, extends to ~-260).
const SPAWN_POSITIONS: Array<[number, number, number]> = [
  // Around first dealership cluster  (z ≈ -45)
  [ 18, 0, -38],
  [-20, 0, -52],
  [  6, 0, -60],

  // Mid-strip  (z ≈ -90)
  [-14, 0, -82],
  [ 22, 0, -95],
  [  0, 0, -105],

  // Around second dealership cluster  (z ≈ -110)
  [-24, 0, -120],
  [ 12, 0, -130],

  // Deep strip  (z ≈ -155–175)
  [ -8, 0, -155],
  [ 20, 0, -162],
  [-18, 0, -178],
  [  4, 0, -190],
];

// Speed range: monsters are slower than the player (speed=14) but persistent.
const MIN_SPEED = 5.2;
const MAX_SPEED = 7.6;

export class MonsterManager {
  readonly group: THREE.Group;
  private readonly monsters: Monster[] = [];
  private active = false;

  constructor(scene: THREE.Scene) {
    this.group         = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    for (const [x, y, z] of SPAWN_POSITIONS) {
      const speed   = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      const monster = new Monster(new THREE.Vector3(x, y, z), speed);
      this.group.add(monster.object);
      this.monsters.push(monster);
    }
  }

  show(): void {
    this.group.visible = true;
    this.active        = true;
  }

  update(dt: number, charPos: THREE.Vector3): void {
    if (!this.active) return;
    for (const m of this.monsters) m.update(dt, charPos);
  }
}
