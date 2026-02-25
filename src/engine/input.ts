import { TouchControls } from '../input/touch-controls.js';
import { GamepadManager } from '../input/gamepad.js';

/** Keyboard + touch + gamepad input manager */
export class Input {
  private keys = new Map<string, boolean>();
  private prevKeys = new Map<string, boolean>();
  private touch: TouchControls | null = null;
  readonly gamepad = new GamepadManager();

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
  }

  /** Attach the TouchControls instance (created externally) */
  setTouchControls(tc: TouchControls): void {
    this.touch = tc;
  }

  update(): void {
    this.prevKeys = new Map(this.keys);
    if (this.touch) this.touch.update();
    this.gamepad.poll();
  }

  get left(): boolean {
    return !!(this.keys.get('ArrowLeft') || this.keys.get('KeyA') || this.touch?.left || this.gamepad.state.left);
  }
  get right(): boolean {
    return !!(this.keys.get('ArrowRight') || this.keys.get('KeyD') || this.touch?.right || this.gamepad.state.right);
  }
  get jump(): boolean {
    return !!(this.keys.get('Space') || this.keys.get('ArrowUp') || this.keys.get('KeyW') || this.keys.get('KeyX') || this.touch?.jump || this.gamepad.state.jump);
  }
  get run(): boolean {
    return !!(this.keys.get('ShiftLeft') || this.keys.get('ShiftRight') || this.keys.get('KeyZ') || this.touch?.run || this.gamepad.state.run);
  }
  get start(): boolean {
    return !!(this.keys.get('Enter') || this.keys.get('Space') || this.gamepad.state.start);
  }
  get down(): boolean {
    return !!(this.keys.get('ArrowDown') || this.keys.get('KeyS') || this.touch?.down || this.gamepad.state.down);
  }

  justPressed(key: string): boolean {
    return !!(this.keys.get(key) && !this.prevKeys.get(key));
  }

  get jumpPressed(): boolean {
    return !!(
      this.justPressed('Space') ||
      this.justPressed('ArrowUp') ||
      this.justPressed('KeyW') ||
      this.justPressed('KeyX') ||
      this.touch?.jumpPressed ||
      this.gamepad.jumpPressed
    );
  }

  get startPressed(): boolean {
    return !!(this.justPressed('Enter') || this.justPressed('Space') || this.touch?.startPressed || this.gamepad.startPressed);
  }
}

export const input = new Input();
