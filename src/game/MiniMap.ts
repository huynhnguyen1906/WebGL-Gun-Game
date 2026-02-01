/**
 * MiniMap UI
 *
 * Hiển thị map nhỏ ở góc dưới bên trái.
 * Cho biết vị trí của player trên map.
 */
import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'

export class MiniMap {
  private container: PIXI.Container
  private mapGraphics: PIXI.Graphics
  private playerDot: PIXI.Graphics
  private scale: number // Scale from world to minimap

  constructor(_screenWidth: number, screenHeight: number) {
    this.container = new PIXI.Container()

    // Minimap size and position
    const minimapSize = 150 // px
    const padding = 20 // px from bottom-left corner
    this.scale = minimapSize / GAME_CONFIG.MAP.SIZE

    // Position in bottom-left corner
    this.container.x = padding
    this.container.y = screenHeight - minimapSize - padding

    // Create background and border
    this.mapGraphics = new PIXI.Graphics()
    this.mapGraphics.rect(0, 0, minimapSize, minimapSize)
    this.mapGraphics.fill({ color: 0xffffff, alpha: 0.3 })
    this.mapGraphics.stroke({ color: 0x000000, width: 2 })
    this.container.addChild(this.mapGraphics)

    // Create player dot
    this.playerDot = new PIXI.Graphics()
    this.playerDot.circle(0, 0, 4)
    this.playerDot.fill({ color: 0x222222 })
    this.container.addChild(this.playerDot)
  }

  // Update player position on minimap
  update(playerX: number, playerY: number): void {
    // Convert world coordinates to minimap coordinates
    this.playerDot.x = playerX * this.scale
    this.playerDot.y = playerY * this.scale
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
