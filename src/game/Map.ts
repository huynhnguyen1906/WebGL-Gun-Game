import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'

export class GameMap {
  private container: PIXI.Container
  private graphics: PIXI.Graphics

  constructor() {
    this.container = new PIXI.Container()
    this.graphics = new PIXI.Graphics()
    this.container.addChild(this.graphics)

    this.drawMap()
  }

  private drawMap(): void {
    const { SIZE, TILE, PADDING, COLOR_BG, GRID_COLOR } = GAME_CONFIG.MAP

    // Vẽ background
    this.graphics.rect(0, 0, SIZE, SIZE)
    this.graphics.fill({ color: COLOR_BG })

    // Vẽ grid (lưới gạch 32x32)
    this.graphics.stroke({ color: GRID_COLOR, width: 1 })

    // Vẽ đường dọc
    for (let x = 0; x <= SIZE; x += TILE) {
      this.graphics.moveTo(x, 0)
      this.graphics.lineTo(x, SIZE)
    }

    // Vẽ đường ngang
    for (let y = 0; y <= SIZE; y += TILE) {
      this.graphics.moveTo(0, y)
      this.graphics.lineTo(SIZE, y)
    }

    this.graphics.stroke()

    // Vẽ padding zone (viền đỏ nhạt để debug - sẽ bỏ sau)
    // Vùng này player không được vào
    this.graphics.rect(0, 0, SIZE, PADDING) // top
    this.graphics.rect(0, SIZE - PADDING, SIZE, PADDING) // bottom
    this.graphics.rect(0, 0, PADDING, SIZE) // left
    this.graphics.rect(SIZE - PADDING, 0, PADDING, SIZE) // right
    this.graphics.fill({ color: 0xff0000, alpha: 0.1 })
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  // Kiểm tra xem một điểm có trong vùng hợp lệ không (không ở padding)
  isValidPosition(x: number, y: number, radius: number = 0): boolean {
    const { SIZE, PADDING } = GAME_CONFIG.MAP
    return (
      x - radius >= PADDING && x + radius <= SIZE - PADDING && y - radius >= PADDING && y + radius <= SIZE - PADDING
    )
  }

  // Clamp position vào vùng hợp lệ
  clampPosition(x: number, y: number, radius: number = 0): { x: number; y: number } {
    const { SIZE, PADDING } = GAME_CONFIG.MAP
    return {
      x: Math.max(PADDING + radius, Math.min(SIZE - PADDING - radius, x)),
      y: Math.max(PADDING + radius, Math.min(SIZE - PADDING - radius, y)),
    }
  }

  // Random position trong vùng hợp lệ (cho spawn)
  getRandomValidPosition(margin: number = GAME_CONFIG.PLAYER.SPAWN_MARGIN): {
    x: number
    y: number
  } {
    const { SIZE, PADDING } = GAME_CONFIG.MAP
    const minPos = PADDING + margin
    const maxPos = SIZE - PADDING - margin

    return {
      x: minPos + Math.random() * (maxPos - minPos),
      y: minPos + Math.random() * (maxPos - minPos),
    }
  }
}
