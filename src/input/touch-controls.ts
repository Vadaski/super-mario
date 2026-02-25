/** Button state for a single touch control */
interface ButtonState {
  pressed: boolean;
  element: HTMLDivElement;
}

/**
 * Mobile touch controls overlay.
 * Provides D-pad (left/right/down) and action buttons (A=jump, B=run/fireball).
 * Feeds into the same input system as keyboard via polling.
 */
export class TouchControls {
  private container: HTMLDivElement | null = null;
  private overlay: HTMLDivElement | null = null;

  private btnLeft: ButtonState = { pressed: false, element: document.createElement('div') };
  private btnRight: ButtonState = { pressed: false, element: document.createElement('div') };
  private btnDown: ButtonState = { pressed: false, element: document.createElement('div') };
  private btnA: ButtonState = { pressed: false, element: document.createElement('div') };
  private btnB: ButtonState = { pressed: false, element: document.createElement('div') };

  private prevA = false;
  private startTapped = false;

  readonly isMobile: boolean;

  constructor() {
    this.isMobile = navigator.maxTouchPoints > 0 || ('ontouchend' in window);

    if (!this.isMobile) return;

    this.createPortraitOverlay();
    this.createControls();
    this.bindTouchEvents();
    this.listenOrientation();
  }

  // --- Public polling API ---

  get left(): boolean { return this.btnLeft.pressed; }
  get right(): boolean { return this.btnRight.pressed; }
  get down(): boolean { return this.btnDown.pressed; }
  get jump(): boolean { return this.btnA.pressed; }
  get run(): boolean { return this.btnB.pressed; }

  /** True only on the frame jump was first pressed */
  get jumpPressed(): boolean {
    return this.btnA.pressed && !this.prevA;
  }

  /** True only on the frame a start-tap was detected */
  get startPressed(): boolean {
    return this.startTapped;
  }

  /** Call once per frame after reading inputs */
  update(): void {
    this.prevA = this.btnA.pressed;
    this.startTapped = false;
  }

  /** Remove DOM elements */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  // --- DOM construction ---

  private createPortraitOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.id = 'portrait-overlay';
    this.overlay.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">&#x1F504;</div>
        <div style="font-size:18px;font-weight:bold;color:#fff;font-family:monospace;">
          Rotate to Landscape
        </div>
        <div style="font-size:13px;color:#aaa;margin-top:8px;font-family:monospace;">
          This game is best played in landscape mode
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  private createControls(): void {
    this.container = document.createElement('div');
    this.container.id = 'touch-controls';

    // --- Left side: D-pad ---
    const dpad = document.createElement('div');
    dpad.className = 'touch-dpad';

    this.btnLeft.element = this.makeButton('touch-btn touch-dpad-left', '\u25C0');
    this.btnRight.element = this.makeButton('touch-btn touch-dpad-right', '\u25B6');
    this.btnDown.element = this.makeButton('touch-btn touch-dpad-down', '\u25BC');

    dpad.appendChild(this.btnLeft.element);
    dpad.appendChild(this.btnRight.element);
    dpad.appendChild(this.btnDown.element);

    // --- Right side: action buttons ---
    const actions = document.createElement('div');
    actions.className = 'touch-actions';

    this.btnB.element = this.makeButton('touch-btn touch-btn-b', 'B');
    this.btnA.element = this.makeButton('touch-btn touch-btn-a', 'A');

    actions.appendChild(this.btnB.element);
    actions.appendChild(this.btnA.element);

    this.container.appendChild(dpad);
    this.container.appendChild(actions);
    document.body.appendChild(this.container);
  }

  private makeButton(className: string, label: string): HTMLDivElement {
    const btn = document.createElement('div');
    btn.className = className;
    btn.textContent = label;
    return btn;
  }

  // --- Touch event handling ---

  private bindTouchEvents(): void {
    if (!this.container) return;

    const handler = (e: TouchEvent) => {
      e.preventDefault();
      this.resolveAllTouches(e.touches);
    };

    // Also handle taps on the canvas area as "start" for title screen
    document.addEventListener('touchstart', (e: TouchEvent) => {
      // If no control button is being touched, treat as a start tap
      const target = e.target as HTMLElement;
      if (!target.classList.contains('touch-btn')) {
        this.startTapped = true;
      }
    }, { passive: true });

    this.container.addEventListener('touchstart', handler, { passive: false });
    this.container.addEventListener('touchmove', handler, { passive: false });
    this.container.addEventListener('touchend', handler, { passive: false });
    this.container.addEventListener('touchcancel', handler, { passive: false });
  }

  private resolveAllTouches(touches: TouchList): void {
    // Reset all buttons
    this.btnLeft.pressed = false;
    this.btnRight.pressed = false;
    this.btnDown.pressed = false;
    this.btnA.pressed = false;
    this.btnB.pressed = false;

    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (!el) continue;

      if (el === this.btnLeft.element) this.btnLeft.pressed = true;
      else if (el === this.btnRight.element) this.btnRight.pressed = true;
      else if (el === this.btnDown.element) this.btnDown.pressed = true;
      else if (el === this.btnA.element) this.btnA.pressed = true;
      else if (el === this.btnB.element) this.btnB.pressed = true;
    }

    // Update visual highlights
    this.updateHighlight(this.btnLeft);
    this.updateHighlight(this.btnRight);
    this.updateHighlight(this.btnDown);
    this.updateHighlight(this.btnA);
    this.updateHighlight(this.btnB);
  }

  private updateHighlight(btn: ButtonState): void {
    if (btn.pressed) {
      btn.element.classList.add('touch-btn-active');
    } else {
      btn.element.classList.remove('touch-btn-active');
    }
  }

  // --- Orientation handling ---

  private listenOrientation(): void {
    const check = () => {
      if (!this.overlay) return;
      const isPortrait = window.innerHeight > window.innerWidth;
      this.overlay.style.display = isPortrait ? 'flex' : 'none';
    };

    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    check();
  }
}
