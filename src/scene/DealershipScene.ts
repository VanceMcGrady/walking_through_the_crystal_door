import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ── Layout constants ──────────────────────────────────────────────────────────

const ROAD_HALF     = 8;    // half-width of the road
const LOT_DEPTH     = 22;   // parking lot depth from road edge to building face
const BLDG_X        = 46;   // building center X from world origin
const SCENE_START_Z = -22;  // Z where content begins (player approaches from +z)
const SCENE_LENGTH  = 260;

const DEALER_ZS     = [-45, -110, -175] as const;
const TARGET_BLDG_H = 13;
const TARGET_CAR_H  = 1.9;

// ── Asset paths ───────────────────────────────────────────────────────────────

const DEALERSHIP_PATHS = [
  '/assets/3D_models/car_dealership.glb',
  '/assets/3D_models/nissan_car_dealership_photogrammetry.glb',
] as const;

const SINGLE_CAR_PATHS = [
  '/assets/3D_models/car.glb',
  '/assets/3D_models/suv_car.glb',
  '/assets/3D_models/dirty_car.glb',
  '/assets/3D_models/vandalized_car.glb',
  '/assets/3D_models/destroyed_car_07_raw_scan.glb',
] as const;

const PACK_PATHS = [
  '/assets/3D_models/generic_passenger_car_pack.glb',
  '/assets/3D_models/lowpoly_cars.glb',
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function scaleToHeight(obj: THREE.Group, targetH: number): void {
  const box  = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > 0) obj.scale.setScalar(targetH / size.y);
}

function groundY(obj: THREE.Group): number {
  const box = new THREE.Box3().setFromObject(obj);
  return -box.min.y;
}

// ── DealershipScene ───────────────────────────────────────────────────────────

export class DealershipScene {
  readonly group: THREE.Group;

  private readonly loader  = new GLTFLoader();
  private readonly models  = new Map<string, THREE.Group>();
  private readonly allPaths = [
    ...DEALERSHIP_PATHS,
    ...SINGLE_CAR_PATHS,
    ...PACK_PATHS,
  ] as const;

  constructor(private readonly scene: THREE.Scene) {
    this.group         = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.loadAll();
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  private loadAll(): void {
    let pending = this.allPaths.length;
    const done  = () => { if (--pending === 0) this.build(); };

    for (const path of this.allPaths) {
      this.loader.load(
        path,
        (gltf) => { this.models.set(path, gltf.scene); done(); },
        undefined,
        ()      => done(),
      );
    }
  }

  // ── Placement helpers ─────────────────────────────────────────────────────

  private clone(path: string): THREE.Group | null {
    const m = this.models.get(path);
    return m ? m.clone(true) : null;
  }

  private placeBuilding(path: string, x: number, z: number, rotY: number): void {
    const obj = this.clone(path);
    if (!obj) return;
    scaleToHeight(obj, TARGET_BLDG_H);
    obj.rotation.y = rotY;
    obj.position.set(x, groundY(obj), z);
    this.group.add(obj);
  }

  private placeCar(
    path: string,
    x: number,
    z: number,
    rotY: number,
  ): void {
    const obj = this.clone(path);
    if (!obj) return;
    scaleToHeight(obj, TARGET_CAR_H);
    obj.rotation.y = rotY;
    obj.position.set(x, groundY(obj), z);
    this.group.add(obj);
  }

  // ── Scene construction ────────────────────────────────────────────────────

  private build(): void {
    this.buildGround();
    this.buildLights();
    this.buildDealerships();
    this.buildParkingLotCars();
    this.buildPackScatter();
    this.buildStreetLamps();
    this.buildBanners();
  }

  private buildGround(): void {
    const totalZ = SCENE_START_Z - SCENE_LENGTH / 2;

    // Asphalt road
    this.group.add(
      flat(ROAD_HALF * 2, SCENE_LENGTH, 0x1e1e1e, 0, 0.005, totalZ),
    );

    // Dashed center line
    for (let z = SCENE_START_Z - 4; z > SCENE_START_Z - SCENE_LENGTH; z -= 10) {
      this.group.add(flat(0.3, 5, 0xf5c518, 0, 0.012, z));
    }

    // Concrete parking lots either side
    for (const side of [-1, 1]) {
      const lotCenterX = side * (ROAD_HALF + LOT_DEPTH / 2);
      this.group.add(flat(LOT_DEPTH, SCENE_LENGTH, 0x7a7a72, lotCenterX, 0.004, totalZ));

      // Parking bay lines (perpendicular to road)
      for (let z = SCENE_START_Z - 5; z > SCENE_START_Z - SCENE_LENGTH; z -= 5.5) {
        const lineX = side * (ROAD_HALF + 2);
        this.group.add(flat(LOT_DEPTH - 4, 0.15, 0xbbbbaa, lotCenterX, 0.015, z));
      }
    }

    // Rear concrete pad (beyond last dealership)
    this.group.add(
      flat(160, 40, 0x7a7a72, 0, 0.004, SCENE_START_Z - SCENE_LENGTH + 15),
    );
  }

  private buildLights(): void {
    // Warm overhead sun for the lot
    const sun = new THREE.DirectionalLight(0xfff5d0, 1.8);
    sun.position.set(20, 30, -80);
    this.group.add(sun);

    // Fill light from opposite side
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.6);
    fill.position.set(-20, 15, -60);
    this.group.add(fill);

    // Ambient
    this.group.add(new THREE.AmbientLight(0xffffff, 0.5));
  }

  private buildDealerships(): void {
    for (let i = 0; i < DEALER_ZS.length; i++) {
      const z = DEALER_ZS[i];

      // Alternate which model goes left vs right for variety
      const leftPath  = DEALERSHIP_PATHS[i % DEALERSHIP_PATHS.length];
      const rightPath = DEALERSHIP_PATHS[(i + 1) % DEALERSHIP_PATHS.length];

      // Left building faces road (+x direction)
      this.placeBuilding(leftPath,  -BLDG_X, z, Math.PI / 2);
      // Right building faces road (-x direction)
      this.placeBuilding(rightPath,  BLDG_X, z, -Math.PI / 2);

      // Add a simple signboard above each building
      this.addSign(-BLDG_X, z, -1);
      this.addSign( BLDG_X, z,  1);
    }
  }

  private addSign(x: number, z: number, side: -1 | 1): void {
    const W = 512, H = 96;
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#cc0000';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 3;
    ctx.strokeRect(6, 6, W - 12, H - 12);

    const names = ['VALLEY MOTORS', 'CRYSTAL AUTO', 'SUNBELT CARS', 'PREMIER AUTO', 'GRAND MOTORS', 'APEX MOTORS'];
    const label = names[Math.abs(x + z | 0) % names.length];
    ctx.font         = 'bold 52px Arial';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffffff';
    ctx.fillText(label, W / 2, H / 2);

    const tex  = new THREE.CanvasTexture(canvas);
    const mat  = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), mat);

    mesh.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    mesh.position.set(x, TARGET_BLDG_H + 0.9, z);
    this.group.add(mesh);
  }

  private buildParkingLotCars(): void {
    const carPaths = SINGLE_CAR_PATHS.filter(p => this.models.has(p));
    if (carPaths.length === 0) return;

    let idx = 0;

    for (const dz of DEALER_ZS) {
      for (const side of [-1, 1] as const) {
        // 3 rows × 5 spots per dealership per side
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 5; col++) {
            const path = carPaths[idx % carPaths.length];
            idx++;

            // Rows step away from road; cols step along Z
            const rowOffset = ROAD_HALF + 3 + row * 5.5;
            const colOffset = (col - 2) * 5;

            const cx = side * rowOffset;
            const cz = dz + colOffset;

            // Cars in inner rows face the road; outer rows face away (angled display)
            const rot = side === -1 ? Math.PI / 2 : -Math.PI / 2;
            this.placeCar(path, cx, cz, rot + (row === 0 ? 0 : Math.PI * 0.04 * row));
          }
        }
      }
    }
  }

  private buildPackScatter(): void {
    // Place car packs as scenic clusters at the ends / middle of the strip
    const packPositions: Array<{ x: number; z: number }> = [
      {  x: -32,  z: -78  },
      {  x:  28,  z: -140 },
      {  x: -25,  z: -200 },
    ];

    const packList = PACK_PATHS.filter(p => this.models.has(p));

    for (let i = 0; i < packPositions.length; i++) {
      const path = packList[i % packList.length];
      const obj  = this.clone(path);
      if (!obj) continue;

      // Scale the whole pack so the longest axis spans ~30 units
      const box  = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) obj.scale.setScalar(30 / maxDim);

      obj.rotation.y = (i * Math.PI) / 3;
      const gY = groundY(obj);
      obj.position.set(packPositions[i].x, gY, packPositions[i].z);
      this.group.add(obj);
    }
  }

  private buildStreetLamps(): void {
    for (const side of [-1, 1]) {
      const poleX = side * (ROAD_HALF + 1.5);

      for (let z = SCENE_START_Z - 15; z > SCENE_START_Z - SCENE_LENGTH; z -= 20) {
        // Pole
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.1, 7, 6),
          new THREE.MeshBasicMaterial({ color: 0x555555 }),
        );
        pole.position.set(poleX, 3.5, z);
        this.group.add(pole);

        // Arm
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 2, 4),
          new THREE.MeshBasicMaterial({ color: 0x555555 }),
        );
        arm.rotation.z = Math.PI / 2;
        arm.position.set(poleX - side * 1, 7.2, z);
        this.group.add(arm);

        // Lamp head
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.25, 1.0),
          new THREE.MeshBasicMaterial({ color: 0xffd060 }),
        );
        head.position.set(poleX - side * 2, 7.1, z);
        this.group.add(head);

        // Point light
        const light = new THREE.PointLight(0xffd090, 1.2, 18);
        light.position.set(poleX - side * 2, 7.0, z);
        this.group.add(light);
      }
    }
  }

  private buildBanners(): void {
    // Hanging banner strings between lamp posts across the road
    const bannerZ = DEALER_ZS.map(z => z + 12);
    for (const z of bannerZ) {
      // Simple line of small color flags
      for (let x = -ROAD_HALF + 1; x <= ROAD_HALF - 1; x += 2) {
        const flag = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5, 0.35),
          new THREE.MeshBasicMaterial({
            color: [0xff2222, 0xffdd00, 0x2255ff, 0x22bb55][Math.abs(x | 0) % 4],
            side: THREE.DoubleSide,
          }),
        );
        flag.position.set(x, 6.5, z);
        flag.rotation.y = Math.PI / 8;
        this.group.add(flag);
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  show(): void {
    this.group.visible = true;
  }
}

// ── Geometry utility ──────────────────────────────────────────────────────────

function flat(
  width: number,
  depth: number,
  color: number,
  cx: number,
  cy: number,
  cz: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(cx, cy, cz);
  return mesh;
}
