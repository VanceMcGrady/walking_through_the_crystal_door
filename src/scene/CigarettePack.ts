import * as THREE from 'three';
import * as Tone  from 'tone';

const PICKUP_DIST   = 1.8;
const FLOAT_Y       = 2.2;
const ANIM_DURATION = 0.85;

// ── Canvas label (Marlboro Reds) ──────────────────────────────────────────────

function makeLabel(): THREE.CanvasTexture {
  const W = 512, H = 716;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;

  // ── Base ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#f4efe8';
  ctx.fillRect(0, 0, W, H);

  // ── Red top panel ─────────────────────────────────────────────────────────
  ctx.fillStyle = '#bc0000';
  ctx.fillRect(0, 0, W, 295);

  // Gold separator band
  ctx.fillStyle = '#c9a535';
  ctx.fillRect(0, 292, W, 7);

  // ── MARLBORO text ─────────────────────────────────────────────────────────
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';

  // Outer shadow pass
  ctx.shadowColor  = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur   = 6;
  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 82px "Times New Roman", Georgia, serif';
  ctx.fillText('MARLBORO', W / 2, 145);
  ctx.shadowBlur   = 0;

  // CIGARETTES subtitle
  ctx.fillStyle = '#f5d0b8';
  ctx.font      = 'bold 19px Arial, sans-serif';
  ctx.fillText('CIGARETTES', W / 2, 190);

  // ── Heraldic crest ────────────────────────────────────────────────────────
  drawCrest(ctx, W / 2, 348, 178, 162);

  // ── "Red" script ─────────────────────────────────────────────────────────
  ctx.fillStyle = '#bc0000';
  ctx.font      = 'bold italic 58px "Times New Roman", Georgia, serif';
  ctx.fillText('Red', W / 2, 490);

  // KING SIZE
  ctx.fillStyle = '#777';
  ctx.font      = '20px Arial, sans-serif';
  ctx.fillText('KING SIZE · 20 CIGARETTES', W / 2, 524);

  // Thin red rule
  ctx.fillStyle = '#bc0000';
  ctx.fillRect(36, 542, W - 72, 2);

  // ── Warning strip ─────────────────────────────────────────────────────────
  ctx.fillStyle = '#e6e1d8';
  ctx.fillRect(0, 618, W, H - 618);

  ctx.fillStyle    = '#222';
  ctx.font         = 'bold 13px Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('SURGEON GENERAL\'S WARNING:', W / 2, 628);
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('Smoking Causes Lung Cancer, Heart Disease,', W / 2, 648);
  ctx.fillText('Emphysema, And May Complicate Pregnancy.', W / 2, 664);

  return new THREE.CanvasTexture(c);
}

function drawCrest(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number,  h: number,
): void {
  const l = cx - w / 2, r = cx + w / 2;
  const t = cy - h / 2, b = cy + h / 2;
  const mid = cy + 8; // horizontal divider sits slightly below center

  // ── Outer gold border (rounded rect) ─────────────────────────────────────
  ctx.save();
  roundRect(ctx, l, t, w, h, 10);
  ctx.fillStyle   = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#c9a535';
  ctx.lineWidth   = 4;
  ctx.stroke();

  // Clip everything inside the border
  ctx.clip();

  // ── Upper half: red with white chevron ────────────────────────────────────
  ctx.fillStyle = '#bc0000';
  ctx.fillRect(l, t, w, mid - t);

  // White inverted-V chevron
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(l,  mid);
  ctx.lineTo(cx, t + 28);
  ctx.lineTo(r,  mid);
  ctx.closePath();
  ctx.fill();

  // ── Lower half: quartered red / white ────────────────────────────────────
  // Left quad: red
  ctx.fillStyle = '#bc0000';
  ctx.fillRect(l, mid, w / 2, b - mid);

  // Right quad: white (already white), red diagonal stripes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx, mid, w / 2, b - mid);

  ctx.fillStyle = '#bc0000';
  for (let i = -3; i < 8; i++) {
    const sx = cx + i * 22;
    ctx.beginPath();
    ctx.moveTo(sx,          mid);
    ctx.lineTo(sx + 18,     mid);
    ctx.lineTo(sx + 18 + (b - mid), b);
    ctx.lineTo(sx + (b - mid),      b);
    ctx.closePath();
    ctx.fill();
  }

  // ── Gold horizontal divider line ─────────────────────────────────────────
  ctx.fillStyle = '#c9a535';
  ctx.fillRect(l, mid - 2, w, 4);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Power-up sound ────────────────────────────────────────────────────────────

function playPickupSound(): void {
  const synth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope:   { attack: 0.008, decay: 0.07, sustain: 0.55, release: 0.18 },
    volume:     -7,
  }).toDestination();

  // Classic ascending arpeggio: C4 E4 G4 B4 E5
  const notes: [string, number][] = [
    ['C4', 0.00],
    ['E4', 0.08],
    ['G4', 0.16],
    ['B4', 0.24],
    ['E5', 0.32],
  ];
  const now = Tone.now();
  for (const [note, t] of notes) {
    synth.triggerAttackRelease(note, '16n', now + t);
  }
}

// ── CigarettePack ─────────────────────────────────────────────────────────────

export class CigarettePack {
  readonly object: THREE.Group;

  private t         = 0;
  private pickedUp  = false;
  private active    = false;
  private animT     = 0;
  private animating = false;

  private burstLight: THREE.PointLight;

  constructor(
    scene:           THREE.Scene,
    pos:             THREE.Vector3,
    private readonly onPickup: () => void,
  ) {
    this.object = new THREE.Group();
    this.object.position.set(pos.x, FLOAT_Y, pos.z);
    this.object.visible = false;
    scene.add(this.object);

    this.burstLight = new THREE.PointLight(0xff6622, 0, 10);
    this.object.add(this.burstLight);

    this.build();
  }

  show(): void {
    this.active         = true;
    this.object.visible = true;
  }

  // ── Geometry ──────────────────────────────────────────────────────────────

  private build(): void {
    const geo = new THREE.BoxGeometry(1.1, 1.55, 0.34);

    // Solid white body
    this.object.add(new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: 0xf4efe8 }),
    ));

    // Thin dark edges
    this.object.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x2a1a0a }),
    ));

    // Front face label
    const label = makeLabel();
    const face  = new THREE.Mesh(
      new THREE.PlaneGeometry(1.08, 1.53),
      new THREE.MeshBasicMaterial({ map: label, transparent: true }),
    );
    face.position.z = 0.172;
    this.object.add(face);

    // Ambient glow
    this.object.add(new THREE.PointLight(0xfff0d0, 1.1, 6));
  }

  // ── Per-frame ─────────────────────────────────────────────────────────────

  update(dt: number, charPos: THREE.Vector3): void {
    if (!this.active) return;

    if (this.animating) {
      this.tickAnimation(dt);
      return;
    }

    if (this.pickedUp) return;

    this.t += dt;

    // Float bob + slow spin
    this.object.position.y  = FLOAT_Y + Math.sin(this.t * 2.1) * 0.18;
    this.object.rotation.y += dt * 0.85;

    // Pickup check
    const dx = charPos.x - this.object.position.x;
    const dz = charPos.z - this.object.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < PICKUP_DIST) {
      this.pickedUp  = true;
      this.animating = true;
      this.animT     = 0;
      this.onPickup();
      playPickupSound();
    }
  }

  private tickAnimation(dt: number): void {
    this.animT += dt;
    const p = Math.min(this.animT / ANIM_DURATION, 1); // 0 → 1

    // Fast spin
    this.object.rotation.y += dt * (8 + p * 20);

    // Scale: punch up to 1.6 then shrink to 0
    const scale = p < 0.35
      ? 1 + (p / 0.35) * 0.6          // 1.0 → 1.6
      : 1.6 * (1 - (p - 0.35) / 0.65); // 1.6 → 0
    this.object.scale.setScalar(Math.max(scale, 0));

    // Rise
    this.object.position.y = FLOAT_Y + p * 3.5;

    // Burst light flare: peaks at p=0.2
    this.burstLight.intensity = Math.max(0, (1 - Math.abs(p - 0.2) / 0.2)) * 6;

    if (p >= 1) {
      this.animating = false;
      this.object.removeFromParent();
    }
  }
}
