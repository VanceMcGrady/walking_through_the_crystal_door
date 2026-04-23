import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const DOOR_Z   = -7;
const ENTRY_Z  = DOOR_Z + 2.0;
const TARGET_H = 5.5;

// ── Shaders ──────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
uniform float time;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;

  // abs(sin) produces V-shaped tent waves — sharp peaks, angular valleys
  float jag =
    abs(sin(pos.x * 2.8 + time * 1.6)) * abs(sin(pos.y * 2.2 + time * 1.1)) * 0.45 +
    abs(sin(pos.x * 5.5 - time * 2.3)) * abs(sin(pos.y * 4.8 + time * 1.9)) * 0.20 +
    abs(sin(pos.x * 9.0 + time * 3.1)) * 0.08;
  pos.z += jag;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const FRAG = /* glsl */`
uniform float time;
uniform float opacity;
varying vec2 vUv;

void main() {
  vec2 uv = vUv - 0.5;
  float dist = length(uv * vec2(0.85, 1.05));

  // abs(sin) gives V-shaped facets — hard ridges between color bands
  float c1 = abs(sin(uv.x * 6.0 + time * 1.5 + uv.y * 3.5));
  float c2 = abs(sin(uv.y * 7.5 - time * 1.2 + uv.x * 5.0));
  float c3 = abs(sin((uv.x - uv.y) * 10.0 + time * 2.0));

  // Hard step between colors at the ridges — crystal facet boundaries
  vec3 cyan    = vec3(0.0,  1.8,  2.2);
  vec3 green   = vec3(0.06, 2.1,  1.6);
  vec3 magenta = vec3(2.2,  0.63, 2.5);

  vec3 color = mix(cyan,    green,   step(0.55, c1));
  color      = mix(color,   magenta, step(0.60, c2) * step(0.45, c3));
  color      = mix(color,   cyan,    step(0.70, c1 * c2));

  // Bright concentrated hotspots where facets align — like light through a prism
  float hotspot = pow(c1 * c2 * c3, 2.5);
  color += hotspot * 1.8;

  // Spiked discharge pulse — pow sharpens sine into narrow bright spikes
  float spike = pow(abs(sin(time * 3.5 + dist * 5.0)), 5.0);
  float pulse = 0.6 + spike * 0.4;

  float falloff = clamp(1.0 - dist * 1.6, 0.0, 1.0);
  falloff = pow(falloff, 0.8);

  gl_FragColor = vec4(color, falloff * pulse * opacity);
}`;

// ── EtherealGlow ─────────────────────────────────────────────────────────────

class EtherealGlow {
  private meshes: THREE.Mesh[] = [];
  private mats:   THREE.ShaderMaterial[] = [];

  constructor(group: THREE.Group) {
    // 4 planes at 45° intervals — overlapping cloud from every angle
    const count = 4;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, opacity: { value: 1 } },
        vertexShader:   VERT,
        fragmentShader: FRAG,
        transparent:    true,
        depthWrite:     false,
        side:           THREE.DoubleSide,
        blending:       THREE.NormalBlending,
      });

      // Subdivided so vertex displacement has geometry to work with
      const geo  = new THREE.PlaneGeometry(6.5, 8, 40, 40);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.y = (i / count) * Math.PI;
      mesh.position.y = 2.9;
      group.add(mesh);
      this.meshes.push(mesh);
      this.mats.push(mat);
    }
  }

  update(t: number, opacity: number): void {
    for (let i = 0; i < this.mats.length; i++) {
      this.mats[i].uniforms.time.value    = t + i * 0.8; // phase-offset per plane
      this.mats[i].uniforms.opacity.value = opacity;
    }
    // Each plane rotates at a slightly different speed — avoids static look
    for (let i = 0; i < this.meshes.length; i++) {
      this.meshes[i].rotation.y += (0.0004 + i * 0.0002);
    }
  }
}

// ── IntroDoor ─────────────────────────────────────────────────────────────────

export class IntroDoor {
  readonly group: THREE.Group;
  private glow:     THREE.PointLight;
  private ethereal: EtherealGlow;
  private titleMat: THREE.MeshBasicMaterial | null = null;
  private entered     = false;
  private fading      = false;
  private fadeOpacity = 1;
  private t           = 0;
  private model:      THREE.Group | null = null;
  private readonly onEnter: () => void;

  constructor(scene: THREE.Scene, onEnter: () => void) {
    this.onEnter = onEnter;
    this.group   = new THREE.Group();
    this.group.position.set(0, 0, DOOR_Z);
    scene.add(this.group);

    this.glow = new THREE.PointLight(0xffd090, 4, 22);
    this.glow.position.set(0, 3, -1.2);
    this.group.add(this.glow);

    this.ethereal = new EtherealGlow(this.group);
    this.buildTitle();
    this.loadModel();
  }

  private buildTitle(): void {
    const W = 1024, H = 160;
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, W, H);
    ctx.font         = 'bold 58px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Outer glow — cyan halo
    ctx.shadowColor  = '#00b4d8';
    ctx.shadowBlur   = 28;
    ctx.fillStyle    = '#00b4d8';
    ctx.fillText('Through The Crystal Door', W / 2, H / 2);

    // Second pass — bright white core on top of the glow
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = '#e8f8ff';
    ctx.fillText('Through The Crystal Door', W / 2, H / 2);

    const texture = new THREE.CanvasTexture(canvas);
    this.titleMat = new THREE.MeshBasicMaterial({
      map:         texture,
      transparent: true,
      depthWrite:  false,
    });

    // Scale plane to match canvas aspect (1024:160 ≈ 6.4:1)
    const planeW = 6.4;
    const planeH = planeW * (H / W);
    const mesh   = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), this.titleMat);
    // Sit just above the top of the door arch
    mesh.position.set(0, TARGET_H + 1.1 + 0.9, 0);
    this.group.add(mesh);
  }

  private loadModel(): void {
    new GLTFLoader().load('/assets/3D_models/door_with_frame.glb', (gltf) => {
      const model = gltf.scene;

      const box  = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      model.scale.setScalar(TARGET_H / size.y);

      box.setFromObject(model);
      model.position.y -= box.min.y;

      this.model = model;
      this.group.add(model);
    });
  }

  update(charPos: THREE.Vector3, dt: number): void {
    this.t += dt;

    if (this.fading) {
      this.fadeOpacity = Math.max(0, this.fadeOpacity - dt * 1.5);
      const o = this.fadeOpacity;
      this.glow.intensity = o * 4;
      this.ethereal.update(this.t, o);
      if (this.titleMat) this.titleMat.opacity = o;
      if (this.model) {
        this.model.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m: THREE.Material) => { m.transparent = true; m.opacity = o; });
        });
      }
      if (o <= 0) this.group.parent?.remove(this.group);
      return;
    }

    this.glow.intensity = 3.5 + Math.sin(this.t * 1.8) * 1.2;

    const cloudOpacity = 0.82 + Math.sin(this.t * 1.4) * 0.18;
    this.ethereal.update(this.t, cloudOpacity);

    this.group.rotation.y = Math.sin(this.t * 0.35) * 0.03;

    if (!this.entered && charPos.z < ENTRY_Z) {
      this.entered = true;
      this.fading  = true;
      this.onEnter();
    }
  }
}
