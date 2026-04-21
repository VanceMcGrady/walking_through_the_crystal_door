import * as Tone from 'tone';
import songUrl from '/assets/audio/crystal-this-11.23.23.master.wav?url';

export class SongClock {
  private player: Tone.Player;

  constructor() {
    this.player = new Tone.Player(songUrl).toDestination();
    this.player.sync().start(0);
  }

  async start() {
    await Tone.start();
    Tone.getTransport().start();
  }

  get currentTime(): number {
    return Tone.getTransport().seconds;
  }

  get isPlaying(): boolean {
    return Tone.getTransport().state === 'started';
  }

  get duration(): number {
    return this.player.buffer.loaded ? this.player.buffer.duration : 0;
  }
}
