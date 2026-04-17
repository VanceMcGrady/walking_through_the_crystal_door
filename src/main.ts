import { SceneManager } from './scene/SceneManager';
import { Character } from './character/Character';
import { InputManager } from './input/InputManager';

const sceneManager = new SceneManager();
const character = new Character();
const input = new InputManager();

sceneManager.scene.add(character.object);

let lastTime = performance.now();

function loop() {
  requestAnimationFrame(loop);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  const { movement } = input.read();
  character.move(movement.x, movement.y, dt);

  sceneManager.followTarget(character.object.position);
  sceneManager.render();
}

loop();
