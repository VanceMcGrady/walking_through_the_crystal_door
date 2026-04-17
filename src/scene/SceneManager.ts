import * as THREE from 'three';

const CAMERA_OFFSET = new THREE.Vector3(0, 10, 8);

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
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
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    plane.rotation.x = -Math.PI / 2;
    this.scene.add(plane);

    const grid = new THREE.GridHelper(500, 250, 0xdddddd, 0xeeeeee);
    this.scene.add(grid);
  }

  followTarget(target: THREE.Vector3) {
    this.camera.position.copy(target).add(CAMERA_OFFSET);
    this.camera.lookAt(target);
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
