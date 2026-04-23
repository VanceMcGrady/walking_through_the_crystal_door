import * as THREE from 'three';
import * as Tone  from 'tone';
import { SceneManager }   from './scene/SceneManager';
import { Terrain }        from './scene/Terrain';
import { Background }     from './scene/Background';
import { Character }      from './character/Character';
import { InputManager }   from './input/InputManager';
import { SongClock }      from './audio/SongClock';
import { IntroDoor }        from './scene/IntroDoor';
import { DealershipScene }  from './scene/DealershipScene';
import { MonsterManager }   from './scene/MonsterManager';
import { CigarettePack }    from './scene/CigarettePack';
import { EventScheduler }   from './timeline/EventScheduler';
import { HUDText }        from './ui/HUDText';
import { CountdownBeep }  from './audio/CountdownBeep';
import eventsData from '../assets/timelines/events.json';

const sceneManager = new SceneManager();
const background   = new Background(sceneManager.scene);
const terrain      = new Terrain(sceneManager.scene);
const character    = new Character();
const input        = new InputManager();
const coordsEl     = document.getElementById('coords')!;
const songtimeEl   = document.getElementById('songtime')!;
const songClock    = new SongClock();

// Unlock Web Audio context on first user interaction (browser requirement).
// Both keyboard and pointer covered so mobile/desktop both work.
const unlockAudio = () => { void Tone.start(); };
window.addEventListener('keydown',     unlockAudio, { once: true });
window.addEventListener('pointerdown', unlockAudio, { once: true });

const hudText          = new HUDText();
const beep             = new CountdownBeep();
const scheduler        = EventScheduler.fromJSON(eventsData.events);
const dealershipScene  = new DealershipScene(sceneManager.scene);
const monsterManager   = new MonsterManager(sceneManager.scene);
const cigarettePack    = new CigarettePack(
  sceneManager.scene,
  new THREE.Vector3(5, 0, -55),
  () => character.equipCigarette(),
);

// Movement starts enabled so player can walk to the door.
// Entering the door freezes movement during the countdown,
// then "ESCAPE THE WORLD" releases it.
let movementEnabled = true;

scheduler
  .on('countdown', (event) => {
    const isFinal = event.data.label === 'ESCAPE THE WORLD';
    hudText.show(event.data.label);
    beep.play(isFinal);
    if (isFinal) { movementEnabled = true; cigarettePack.show(); }
  })
  .on('section_change', (event) => { console.log('[section]', event.data.section, event.data.preset); });

sceneManager.scene.add(character.object);

const introDoor = new IntroDoor(sceneManager.scene, () => {
  movementEnabled = false;
  songClock.startTransport();
  dealershipScene.show();
  monsterManager.show();
});

let lastTime = performance.now();

function loop() {
  requestAnimationFrame(loop);

  const now      = performance.now();
  const dt       = Math.min((now - lastTime) / 1000, 0.1);
  lastTime       = now;
  const songTime = songClock.currentTime;
  scheduler.update(songTime);

  const m  = Math.floor(songTime / 60);
  const s  = Math.floor(songTime % 60);
  const ms = Math.floor((songTime % 1) * 1000);
  songtimeEl.textContent = `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

  const { movement } = input.read();
  const mx = movementEnabled ? movement.x : 0;
  const mz = movementEnabled ? movement.y : 0;
  character.move(mx, mz, dt);

  const pos = character.object.position;
  cigarettePack.update(dt, pos);
  introDoor.update(pos, dt);
  monsterManager.update(dt, pos);
  background.update(pos.x, pos.z);
  terrain.update(pos.x, pos.z);

  sceneManager.followTarget(pos);
  sceneManager.render();

  coordsEl.textContent = `x  ${pos.x.toFixed(1)}\ny  ${pos.y.toFixed(1)}\nz  ${pos.z.toFixed(1)}`;
}

loop();
