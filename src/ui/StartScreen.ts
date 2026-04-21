export class StartScreen {
  private el: HTMLDivElement;

  constructor(onStart: () => void) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position:       'fixed',
      inset:          '0',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     '#f0ece0',
      fontFamily:     'monospace',
      fontSize:       '14px',
      color:          '#18142a',
      opacity:        '0.85',
      cursor:         'pointer',
      zIndex:         '10',
      letterSpacing:  '0.12em',
    });
    this.el.textContent = 'click to begin';

    this.el.addEventListener('click', () => {
      onStart();
      this.el.remove();
    }, { once: true });

    document.body.appendChild(this.el);
  }
}
