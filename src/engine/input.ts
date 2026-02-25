/** Keyboard + touch input manager */
export class Input {
  private keys = new Map<string, boolean>();
  private prevKeys = new Map<string, boolean>();
  private touchLeft = false;
  private touchRight = false;
  private touchJump = false;
  private touchRun = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
      e.preventDefault();
    });
    // Prevent focus loss
    window.addEventListener('blur', () => this.keys.clear());

    this.setupTouch();
  }

  private setupTouch(): void {
    // Create touch overlay for mobile
    if (!('ontouchstart' in window)) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:40%;z-index:100;display:flex;justify-content:space-between;pointer-events:auto;';

    const leftZone = document.createElement('div');
    leftZone.style.cssText = 'width:30%;height:100%;display:flex;';

    const btnLeft = this.createTouchBtn('◀', '0', '0', '50%', '100%');
    const btnRight = this.createTouchBtn('▶', '50%', '0', '50%', '100%');
    leftZone.appendChild(btnLeft);
    leftZone.appendChild(btnRight);

    const rightZone = document.createElement('div');
    rightZone.style.cssText = 'width:30%;height:100%;display:flex;';

    const btnRun = this.createTouchBtn('B', '0', '0', '50%', '100%');
    const btnJump = this.createTouchBtn('A', '50%', '0', '50%', '100%');
    rightZone.appendChild(btnRun);
    rightZone.appendChild(btnJump);

    overlay.appendChild(leftZone);
    overlay.appendChild(document.createElement('div')); // spacer
    overlay.appendChild(rightZone);
    document.body.appendChild(overlay);

    const handle = (e: TouchEvent) => {
      e.preventDefault();
      this.touchLeft = false;
      this.touchRight = false;
      this.touchJump = false;
      this.touchRun = false;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (el === btnLeft) this.touchLeft = true;
        if (el === btnRight) this.touchRight = true;
        if (el === btnJump) this.touchJump = true;
        if (el === btnRun) this.touchRun = true;
      }
    };

    overlay.addEventListener('touchstart', handle, { passive: false });
    overlay.addEventListener('touchmove', handle, { passive: false });
    overlay.addEventListener('touchend', handle, { passive: false });
    overlay.addEventListener('touchcancel', handle, { passive: false });
  }

  private createTouchBtn(label: string, left: string, top: string, width: string, height: string): HTMLDivElement {
    const btn = document.createElement('div');
    btn.textContent = label;
    btn.style.cssText = `position:relative;left:${left};top:${top};width:${width};height:${height};display:flex;align-items:center;justify-content:center;font-size:24px;color:rgba(255,255,255,0.5);user-select:none;-webkit-user-select:none;`;
    return btn;
  }

  update(): void {
    this.prevKeys = new Map(this.keys);
  }

  get left(): boolean { return !!(this.keys.get('ArrowLeft') || this.keys.get('KeyA') || this.touchLeft); }
  get right(): boolean { return !!(this.keys.get('ArrowRight') || this.keys.get('KeyD') || this.touchRight); }
  get jump(): boolean { return !!(this.keys.get('Space') || this.keys.get('ArrowUp') || this.keys.get('KeyW') || this.keys.get('KeyX') || this.touchJump); }
  get run(): boolean { return !!(this.keys.get('ShiftLeft') || this.keys.get('ShiftRight') || this.keys.get('KeyZ') || this.touchRun); }
  get start(): boolean { return !!(this.keys.get('Enter') || this.keys.get('Space')); }
  get down(): boolean { return !!(this.keys.get('ArrowDown') || this.keys.get('KeyS')); }

  justPressed(key: string): boolean {
    return !!(this.keys.get(key) && !this.prevKeys.get(key));
  }

  get jumpPressed(): boolean {
    return !!(
      this.justPressed('Space') ||
      this.justPressed('ArrowUp') ||
      this.justPressed('KeyW') ||
      this.justPressed('KeyX') ||
      (this.touchJump && !this.prevKeys.get('__touchJump'))
    );
  }

  get startPressed(): boolean {
    return !!(this.justPressed('Enter') || this.justPressed('Space'));
  }
}

export const input = new Input();
