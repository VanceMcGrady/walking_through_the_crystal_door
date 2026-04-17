import { KeyboardProvider } from './KeyboardProvider';

export interface InputState {
  movement: { x: number; y: number };
  interactPressed: boolean;
  interactJustPressed: boolean;
}

export class InputManager {
  private keyboard = new KeyboardProvider();
  private prevInteract = false;

  read(): InputState {
    const movement = this.keyboard.getMovement();
    const interactPressed = this.keyboard.isInteractPressed();
    const interactJustPressed = interactPressed && !this.prevInteract;
    this.prevInteract = interactPressed;
    return { movement, interactPressed, interactJustPressed };
  }
}
