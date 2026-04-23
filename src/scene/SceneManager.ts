import * as THREE from 'three';

const CAMERA_OFFSET  = new THREE.Vector3(0, 4.5, 12);
const LOOK_AT_OFFSET = new THREE.Vector3(0, 1.2, 0);
const BG_COLOR       = 0xf0ece0;

export class SceneManager {
  readonly scene:    THREE.Scene;
  readonly camera:   THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);
    this.scene.fog = new THREE.Fog(BG_COLOR, 95, 280);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.copy(CAMERA_OFFSET);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);

    this.addGround();
    this.addLights();

    window.addEventListener('resize', this.onResize);
  }

  private addGround() {
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshBasicMaterial({ color: BG_COLOR })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.02;
    this.scene.add(base);
  }

  private addLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(5, 12, 8);
    this.scene.add(sun);
  }

  private readonly _lookAt = new THREE.Vector3();

  followTarget(target: THREE.Vector3) {
    this.camera.position.copy(target).add(CAMERA_OFFSET);
    this._lookAt.copy(target).add(LOOK_AT_OFFSET);
    this.camera.lookAt(this._lookAt);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
