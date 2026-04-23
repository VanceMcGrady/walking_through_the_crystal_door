const HOLD_MS = 700;
const FADE_MS = 500;

export class HUDText {
  private el: HTMLDivElement;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;

  constructor() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position:       'fixed',
      inset:          '0',
      display:        'flex',
      alignItems:     'flex-start',
      justifyContent: 'center',
      paddingTop:     '18vh',
      fontFamily:     'monospace',
      fontWeight:     'bold',
      fontSize:       '72px',
      letterSpacing:  '0.08em',
      color:          '#18142a',
      pointerEvents:  'none',
      zIndex:         '20',
      opacity:        '0',
      userSelect:     'none',
    });
    document.body.appendChild(this.el);
  }

  show(text: string): void {
    if (this.timeoutId !== null) { clearTimeout(this.timeoutId); this.timeoutId = null; }
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }

    this.el.textContent = text;

    // Reset to invisible with no transition, then rAF to let the browser
    // commit that state before transitioning to visible.
    this.el.style.transition = 'none';
    this.el.style.opacity = '0';

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.el.style.transition = `opacity 60ms ease-in`;
      this.el.style.opacity = '1';

      this.timeoutId = setTimeout(() => {
        this.el.style.transition = `opacity ${FADE_MS}ms ease-out`;
        this.el.style.opacity = '0';
        this.timeoutId = null;
      }, HOLD_MS);
    });
  }

  destroy(): void {
    if (this.timeoutId !== null) clearTimeout(this.timeoutId);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.el.remove();
  }
}
