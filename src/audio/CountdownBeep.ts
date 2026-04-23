import * as Tone from 'tone';

export class CountdownBeep {
  private synth: Tone.Synth;

  constructor() {
    this.synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 1, sustain: 1, release: 1 },
      volume: -6,
    }).toDestination();
  }

  // tick = regular count beat, final = "Escape!" beat (lower, longer)
  play(final = false): void {
    const note = final ? 'A5' : 'A6';
    const dur  = final ? '8n' : '16n';
    this.synth.triggerAttackRelease(note, dur);
  }
}

