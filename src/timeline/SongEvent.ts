export interface CountdownEvent {
  type: 'countdown';
  data: { label: string };
}

export interface SectionChangeEvent {
  type: 'section_change';
  data: {
    section: string;
    preset: string;
    spawnRate: number;
    palette: string;
  };
}

export type SongEvent = CountdownEvent | SectionChangeEvent;

export interface ScheduledEntry<E extends SongEvent = SongEvent> {
  time: number;
  fired: boolean;
  event: E;
}

export type EventCallback<E extends SongEvent> = (event: E, songTime: number) => void;

export type HandlerMap = {
  [K in SongEvent['type']]?: EventCallback<Extract<SongEvent, { type: K }>>;
};
