import * as THREE from 'three';

// Camera sits behind and low; look target is aimed at chest height so the
// horizon stays in frame regardless of where the character is on the plane.
const CAMERA_OFFSET  = new THREE.Vector3(0, 4.5, 12);
const LOOK_AT_OFFSET = new THREE.Vector3(0, 1.2, 0);
const BG_COLOR = 0xf0ece0;
const GROUND_LINE_COLOR = 0x9a8f82;

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);
    this.scene.fog = new THREE.Fog(BG_COLOR, 60, 200);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.copy(CAMERA_OFFSET);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);

    this.addGround();

    window.addEventListener('resize', this.onResize);
  }

  private addGround() {
    // Solid base so the fog color bleeds through naturally
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshBasicMaterial({ color: BG_COLOR })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.01;
    this.scene.add(base);

    // Triangulated wireframe grid — matches the low-poly mesh language in the references
    const geo = new THREE.PlaneGeometry(300, 300, 60, 60);
    geo.rotateX(-Math.PI / 2);

    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({
        color: GROUND_LINE_COLOR,
        transparent: true,
        opacity: 0.55,
      })
    );
    this.scene.add(wireframe);
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
