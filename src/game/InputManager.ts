export class InputManager {
  private keys: Set<string> = new Set()
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
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase())
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

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.canvas.removeEventListener('mousemove', this.onMouseMove)
    this.canvas.removeEventListener('mousedown', this.onMouseDown)
    this.canvas.removeEventListener('mouseup', this.onMouseUp)
  }
}
