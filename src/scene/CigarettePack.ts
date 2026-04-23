import * as THREE from 'three';

const PICKUP_DIST = 1.4;
const FLOAT_Y     = 1.6;

export class CigarettePack {
  readonly object: THREE.Group;
  private t        = 0;
  private pickedUp = false;
  private active   = false;

  constructor(
    scene:           THREE.Scene,
    pos:             THREE.Vector3,
    private readonly onPickup: () => void,
  ) {
    this.object = new THREE.Group();
    this.object.position.set(pos.x, FLOAT_Y, pos.z);
    this.object.visible = false;
    scene.add(this.object);
    this.build();
  }

  show(): void {
    this.active         = true;
    this.object.visible = true;
  }

  private build(): void {
    // Pack proportions: ~0.5 wide × 0.7 tall × 0.22 deep
    const geo = new THREE.BoxGeometry(0.5, 0.7, 0.22);

    // Off-white fill matching the scene background
    this.object.add(new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: 0xf0ece0 }),
    ));

    // Dark wireframe edges (same language as the character / terrain)
    this.object.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x18142a }),
    ));

    // Canvas label on the front face
    const label = this.makeLabel();
    const face  = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.68),
      new THREE.MeshBasicMaterial({ map: label, transparent: true }),
    );
    face.position.z = 0.112;
    this.object.add(face);

    // Subtle glow so it reads against the white plane
    const glow = new THREE.PointLight(0xfff5c0, 0.9, 4.5);
    this.object.add(glow);
  }

  private makeLabel(): THREE.CanvasTexture {
    const W = 256, H = 352;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;

    // Red background
    ctx.fillStyle = '#bb0000';
    ctx.fillRect(0, 0, W, H);

    // White inner panel
    ctx.fillStyle = '#f8f4ee';
    ctx.fillRect(10, 10, W - 20, H - 20);

    // Brand name
    ctx.fillStyle = '#bb0000';
    ctx.font      = 'bold 42px serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRYSTAL', W / 2, 110);

    ctx.font      = 'bold 34px serif';
    ctx.fillText('LIGHTS', W / 2, 155);

    // Gold stripe
    ctx.fillStyle = '#d4a800';
    ctx.fillRect(10, 175, W - 20, 12);

    // Small warning text
    ctx.fillStyle = '#444';
    ctx.font      = '18px sans-serif';
    ctx.fillText('PICK UP', W / 2, 240);
    ctx.fillText('TO WIELD', W / 2, 265);

    return new THREE.CanvasTexture(c);
  }

  update(dt: number, charPos: THREE.Vector3): void {
    if (!this.active || this.pickedUp) return;

    this.t += dt;

    // Bob and spin
    this.object.position.y = FLOAT_Y + Math.sin(this.t * 2.2) * 0.14;
    this.object.rotation.y += dt * 0.9;

    // Pickup radius check (XZ only — height doesn't matter)
    const dx = charPos.x - this.object.position.x;
    const dz = charPos.z - this.object.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < PICKUP_DIST) {
      this.pickedUp = true;
      this.object.removeFromParent();
      this.onPickup();
    }
  }
}
