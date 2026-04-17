import { SceneManager } from './scene/SceneManager';
import { Terrain } from './scene/Terrain';
import { Background } from './scene/Background';
import { Character } from './character/Character';
import { InputManager } from './input/InputManager';

const sceneManager = new SceneManager();
const background   = new Background(sceneManager.scene);
const terrain      = new Terrain(sceneManager.scene);
const character    = new Character();
const input        = new InputManager();
const coordsEl     = document.getElementById('coords')!;

sceneManager.scene.add(character.object);

let lastTime = performance.now();

function loop() {
  requestAnimationFrame(loop);

  const now = performance.now();
  const dt  = Math.min((now - lastTime) / 1000, 0.1);
  lastTime  = now;

  const { movement } = input.read();
  character.move(movement.x, movement.y, dt);

  const pos = character.object.position;
  background.update(pos.x, pos.z);
  terrain.update(pos.x, pos.z);

  sceneManager.followTarget(pos);
  sceneManager.render();

  coordsEl.textContent = `x  ${pos.x.toFixed(1)}\ny  ${pos.y.toFixed(1)}\nz  ${pos.z.toFixed(1)}`;
}

loop();
