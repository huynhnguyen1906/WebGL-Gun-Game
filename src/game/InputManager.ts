export class InputManager {
  private keys: Set<string> = new Set()
  private pressedNumbers: Set<number> = new Set() // Track number key presses
  private consumedNumbers: Set<number> = new Set() // Track consumed number presses
  private pressedF: boolean = false // Track F key press
  private pressedR: boolean = false // Track R key press
  public mouseX: number = 0
  public mouseY: number = 0
  public isMouseDown: boolean = false
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.setupListeners()
  }

  private setupListeners(): void {
    // Keyboard
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)

    // Mouse position
    this.canvas.addEventListener('mousemove', this.onMouseMove)

    // Mouse button
    this.canvas.addEventListener('mousedown', this.onMouseDown)
    this.canvas.addEventListener('mouseup', this.onMouseUp)

    // Context menu (prevent right click menu)
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase())

    // Track number keys 1-4 (top row, not numpad)
    if (e.code === 'Digit1') this.pressedNumbers.add(1)
    if (e.code === 'Digit2') this.pressedNumbers.add(2)
    if (e.code === 'Digit3') this.pressedNumbers.add(3)
    if (e.code === 'Digit4') this.pressedNumbers.add(4)

    // Track F key for pickup
    if (e.code === 'KeyF') this.pressedF = true

    // Track R key for reload
    if (e.code === 'KeyR') this.pressedR = true
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase())

    // Clear number key tracking on release
    if (e.code === 'Digit1') {
      this.pressedNumbers.delete(1)
      this.consumedNumbers.delete(1)
    }
    if (e.code === 'Digit2') {
      this.pressedNumbers.delete(2)
      this.consumedNumbers.delete(2)
    }
    if (e.code === 'Digit3') {
      this.pressedNumbers.delete(3)
      this.consumedNumbers.delete(3)
    }
    if (e.code === 'Digit4') {
      this.pressedNumbers.delete(4)
      this.consumedNumbers.delete(4)
    }

    // Clear F and R keys
    if (e.code === 'KeyF') this.pressedF = false
    if (e.code === 'KeyR') this.pressedR = false
  }

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    this.mouseX = e.clientX - rect.left
    this.mouseY = e.clientY - rect.top
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      // Left click
      this.isMouseDown = true
    }
  }

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isMouseDown = false
    }
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase())
  }

  // Get movement vector from WASD
  getMovementVector(): { x: number; y: number } {
    let x = 0
    let y = 0

    if (this.isKeyPressed('w')) y -= 1
    if (this.isKeyPressed('s')) y += 1
    if (this.isKeyPressed('a')) x -= 1
    if (this.isKeyPressed('d')) x += 1

    // Normalize diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y)
      x /= length
      y /= length
    }

    return { x, y }
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number, cameraX: number, cameraY: number): { x: number; y: number } {
    return {
      x: screenX - cameraX,
      y: screenY - cameraY,
    }
  }

  // Get pressed number key (1-4) if any, and consume it
  getPressedNumberKey(): number | null {
    for (const num of this.pressedNumbers) {
      if (!this.consumedNumbers.has(num)) {
        this.consumedNumbers.add(num)
        return num
      }
    }
    return null
  }

  // Check if F key was pressed (for pickup)
  wasFPressed(): boolean {
    if (this.pressedF) {
      this.pressedF = false
      return true
    }
    return false
  }

  // Check if R key was pressed (for reload)
  wasRPressed(): boolean {
    if (this.pressedR) {
      this.pressedR = false
      return true
    }
    return false
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.canvas.removeEventListener('mousemove', this.onMouseMove)
    this.canvas.removeEventListener('mousedown', this.onMouseDown)
    this.canvas.removeEventListener('mouseup', this.onMouseUp)
  }
}
