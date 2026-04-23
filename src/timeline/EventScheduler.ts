import type { SongEvent, ScheduledEntry, EventCallback, HandlerMap } from './SongEvent';

interface RawEventJSON {
  time: string | number;
  type: string;
  data: Record<string, unknown>;
}

function parseTime(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const parts = raw.split(':');
  if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  return parseFloat(raw);
}

export class EventScheduler {
  private entries: ScheduledEntry[];
  private handlers: HandlerMap = {};
  private cursor = 0;

  constructor(entries: ScheduledEntry[]) {
    this.entries = entries;
  }

  on<K extends SongEvent['type']>(
    type: K,
    callback: EventCallback<Extract<SongEvent, { type: K }>>
  ): this {
    (this.handlers as Record<string, unknown>)[type] = callback;
    return this;
  }

  update(songTime: number): void {
    while (this.cursor < this.entries.length) {
      const entry = this.entries[this.cursor];
      if (songTime < entry.time) break;
      if (!entry.fired) {
        entry.fired = true;
        this.dispatch(entry.event, songTime);
      }
      this.cursor++;
    }
  }

  reset(songTime = 0): void {
    this.cursor = 0;
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].time >= songTime) {
        this.cursor = i;
        break;
      }
    }
    for (let i = this.cursor; i < this.entries.length; i++) {
      this.entries[i].fired = false;
    }
  }

  private dispatch(event: SongEvent, songTime: number): void {
    const handler = (this.handlers as Record<string, unknown>)[event.type];
    if (typeof handler === 'function') {
      (handler as EventCallback<typeof event>)(event, songTime);
    }
  }

  static fromJSON(rawEvents: RawEventJSON[]): EventScheduler {
    const entries: ScheduledEntry[] = rawEvents
      .map(raw => ({
        time: parseTime(raw.time),
        fired: false,
        event: { type: raw.type, data: raw.data } as SongEvent,
      }))
      .sort((a, b) => a.time - b.time);
    return new EventScheduler(entries);
  }
}
