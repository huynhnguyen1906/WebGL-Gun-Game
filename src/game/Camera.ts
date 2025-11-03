import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'

export class Camera {
  private container: PIXI.Container
  private targetX: number = 0
  private targetY: number = 0
  private viewWidth: number
  private viewHeight: number

  constructor(container: PIXI.Container, viewWidth: number, viewHeight: number) {
    this.container = container
    this.viewWidth = viewWidth
    this.viewHeight = viewHeight
  }

  setTarget(x: number, y: number): void {
    this.targetX = x
    this.targetY = y
  }

  update(): void {
    const { SIZE } = GAME_CONFIG.MAP
    const { FOLLOW_LERP } = GAME_CONFIG.CAMERA

    // Compute desired camera position (center on target)
    let camX = this.targetX - this.viewWidth / 2
    let camY = this.targetY - this.viewHeight / 2

    // Clamp so map borders are not revealed
    const maxCamX = SIZE - this.viewWidth
    const maxCamY = SIZE - this.viewHeight

    camX = Math.max(0, Math.min(maxCamX, camX))
    camY = Math.max(0, Math.min(maxCamY, camY))

    // Lerp for smoothing (if FOLLOW_LERP < 1)
    const currentX = -this.container.x
    const currentY = -this.container.y

    const newX = currentX + (camX - currentX) * FOLLOW_LERP
    const newY = currentY + (camY - currentY) * FOLLOW_LERP

    this.container.x = -newX
    this.container.y = -newY
  }

  resize(viewWidth: number, viewHeight: number): void {
    this.viewWidth = viewWidth
    this.viewHeight = viewHeight
  }
}
