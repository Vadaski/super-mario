/**
 * Gamepad/controller support using the standard Gamepad API.
 * Supports Xbox and PlayStation layouts with D-pad, analog stick, and buttons.
 */

/** Current state of gamepad inputs, matching the signals used by the Input class. */
export interface GamepadState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  run: boolean;
  start: boolean;
}

/** Button indices for standard gamepad mapping (Xbox / PlayStation). */
const BUTTON = {
  /** A (Xbox) / Cross (PS) */
  A: 0,
  /** B (Xbox) / Circle (PS) */
  B: 1,
  /** X (Xbox) / Square (PS) */
  X: 2,
  /** Y (Xbox) / Triangle (PS) */
  Y: 3,
  /** Start (Xbox) / Options (PS) */
  START: 9,
  /** D-pad Up */
  DPAD_UP: 12,
  /** D-pad Down */
  DPAD_DOWN: 13,
  /** D-pad Left */
  DPAD_LEFT: 14,
  /** D-pad Right */
  DPAD_RIGHT: 15,
} as const;

/** Analog stick axis indices for standard gamepad mapping. */
const AXIS = {
  LEFT_X: 0,
  LEFT_Y: 1,
} as const;

/** Dead zone threshold for analog sticks. */
const DEAD_ZONE = 0.2;

/** Duration in frames to show toast notification (approx 3 seconds at 60fps). */
const TOAST_DURATION = 180;

/** Manages gamepad connections and input polling. */
export class GamepadManager {
  private connected = false;
  private gamepadIndex = -1;
  private toastMessage = '';
  private toastTimer = 0;
  private toastElement: HTMLDivElement | null = null;

  private currentState: GamepadState = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    run: false,
    start: false,
  };

  private previousState: GamepadState = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    run: false,
    start: false,
  };

  constructor() {
    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      this.onGamepadConnected(e);
    });
    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      this.onGamepadDisconnected(e);
    });

    // Check for already-connected gamepads (some browsers require polling)
    this.checkExistingGamepads();
  }

  /** Whether a gamepad is currently connected. */
  get isConnected(): boolean {
    return this.connected;
  }

  /** Current frame's gamepad state. */
  get state(): Readonly<GamepadState> {
    return this.currentState;
  }

  /** Whether jump was just pressed this frame (not held from previous frame). */
  get jumpPressed(): boolean {
    return this.currentState.jump && !this.previousState.jump;
  }

  /** Whether start was just pressed this frame. */
  get startPressed(): boolean {
    return this.currentState.start && !this.previousState.start;
  }

  /**
   * Poll the gamepad and update state. Must be called once per frame
   * before reading state, since the Gamepad API requires active polling.
   */
  poll(): void {
    this.previousState = { ...this.currentState };

    if (!this.connected) {
      this.resetState();
      this.updateToast();
      return;
    }

    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepadIndex];

    if (!gp) {
      this.resetState();
      this.updateToast();
      return;
    }

    this.readButtons(gp);
    this.readAxes(gp);
    this.updateToast();
  }

  /** Read button states from the gamepad. */
  private readButtons(gp: Gamepad): void {
    const pressed = (index: number): boolean => {
      if (index >= gp.buttons.length) return false;
      return gp.buttons[index].pressed;
    };

    // D-pad
    const dpadLeft = pressed(BUTTON.DPAD_LEFT);
    const dpadRight = pressed(BUTTON.DPAD_RIGHT);
    const dpadUp = pressed(BUTTON.DPAD_UP);
    const dpadDown = pressed(BUTTON.DPAD_DOWN);

    // Action buttons: A = jump, B/X = run/fireball
    const jumpButton = pressed(BUTTON.A);
    const runButton = pressed(BUTTON.B) || pressed(BUTTON.X) || pressed(BUTTON.Y);
    const startButton = pressed(BUTTON.START);

    // D-pad values (axes will be OR'd in readAxes)
    this.currentState.left = dpadLeft;
    this.currentState.right = dpadRight;
    this.currentState.up = dpadUp;
    this.currentState.down = dpadDown;
    this.currentState.jump = jumpButton;
    this.currentState.run = runButton;
    this.currentState.start = startButton;
  }

  /** Read analog stick axes and merge with button state. */
  private readAxes(gp: Gamepad): void {
    if (gp.axes.length < 2) return;

    const lx = gp.axes[AXIS.LEFT_X];
    const ly = gp.axes[AXIS.LEFT_Y];

    // Apply dead zone and OR with D-pad buttons
    if (lx < -DEAD_ZONE) {
      this.currentState.left = true;
    }
    if (lx > DEAD_ZONE) {
      this.currentState.right = true;
    }
    if (ly < -DEAD_ZONE) {
      this.currentState.up = true;
    }
    if (ly > DEAD_ZONE) {
      this.currentState.down = true;
    }
  }

  /** Reset all state values to false. */
  private resetState(): void {
    this.currentState.left = false;
    this.currentState.right = false;
    this.currentState.up = false;
    this.currentState.down = false;
    this.currentState.jump = false;
    this.currentState.run = false;
    this.currentState.start = false;
  }

  /** Handle a newly connected gamepad. */
  private onGamepadConnected(e: GamepadEvent): void {
    // Only track first connected gamepad
    if (this.connected) return;

    this.connected = true;
    this.gamepadIndex = e.gamepad.index;
    this.showToast(`Gamepad connected: ${e.gamepad.id.substring(0, 40)}`);
  }

  /** Handle a disconnected gamepad. */
  private onGamepadDisconnected(e: GamepadEvent): void {
    if (e.gamepad.index !== this.gamepadIndex) return;

    this.connected = false;
    this.gamepadIndex = -1;
    this.resetState();
    this.showToast('Gamepad disconnected');
  }

  /** Check for gamepads that were connected before the page loaded. */
  private checkExistingGamepads(): void {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp) {
        this.connected = true;
        this.gamepadIndex = gp.index;
        this.showToast(`Gamepad connected: ${gp.id.substring(0, 40)}`);
        break;
      }
    }
  }

  /** Show a toast notification. */
  private showToast(message: string): void {
    this.toastMessage = message;
    this.toastTimer = TOAST_DURATION;

    if (!this.toastElement) {
      this.toastElement = document.createElement('div');
      this.toastElement.style.cssText = [
        'position:fixed',
        'bottom:20px',
        'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(0,0,0,0.8)',
        'color:#fff',
        'padding:8px 16px',
        'border-radius:4px',
        'font-family:monospace',
        'font-size:12px',
        'z-index:9999',
        'pointer-events:none',
        'transition:opacity 0.3s',
      ].join(';');
      document.body.appendChild(this.toastElement);
    }

    this.toastElement.textContent = this.toastMessage;
    this.toastElement.style.opacity = '1';
    this.toastElement.style.display = 'block';
  }

  /** Update toast visibility timer. */
  private updateToast(): void {
    if (this.toastTimer <= 0) return;

    this.toastTimer--;
    if (this.toastTimer <= 0 && this.toastElement) {
      this.toastElement.style.opacity = '0';
      // Hide after fade transition
      setTimeout(() => {
        if (this.toastElement && this.toastTimer <= 0) {
          this.toastElement.style.display = 'none';
        }
      }, 300);
    }
  }
}
