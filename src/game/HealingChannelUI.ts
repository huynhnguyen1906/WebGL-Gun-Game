/**
 * Healing Channel UI
 *
 * Hiển thị progress bar khi player đang sử dụng healing item.
 * Channel time từ serverConfig
 */
import * as PIXI from 'pixi.js'

import { HEALING_CONFIG } from '../config/serverConfig'

export class HealingChannelUI {
  private container: PIXI.Container
  private background: PIXI.Graphics
  private progressBar: PIXI.Graphics
  private text: PIXI.Text
  private isChanneling: boolean = false
  private channelStartTime: number = 0
  private channelDuration: number = HEALING_CONFIG.CHANNEL_TIME_MS

  constructor() {
    this.container = new PIXI.Container()
    this.container.visible = false

    // Background
    this.background = new PIXI.Graphics()
    this.background.rect(-100, -10, 200, 20)
    this.background.fill({ color: 0x000000, alpha: 0.7 })
    this.background.stroke({ color: 0xffffff, width: 2 })
    this.container.addChild(this.background)

    // Progress bar
    this.progressBar = new PIXI.Graphics()
    this.container.addChild(this.progressBar)

    // Text
    this.text = new PIXI.Text({
      text: 'Healing...',
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xffffff,
        align: 'center',
      },
    })
    this.text.anchor.set(0.5)
    this.text.y = 15
    this.container.addChild(this.text)
  }

  startChannel(currentTime: number): void {
    this.isChanneling = true
    this.channelStartTime = currentTime
    this.container.visible = true
  }

  updateChannel(currentTime: number, playerX: number, playerY: number): boolean {
    if (!this.isChanneling) return false

    const elapsed = currentTime - this.channelStartTime
    const progress = Math.min(1, elapsed / this.channelDuration)

    // Update progress bar
    this.progressBar.clear()
    this.progressBar.rect(-98, -8, 196 * progress, 16)
    this.progressBar.fill({ color: 0x00ff00, alpha: 0.8 })

    // Update position (above player)
    this.container.x = playerX
    this.container.y = playerY - 60

    // Check if complete
    if (progress >= 1) {
      this.stopChannel()
      return true // Healing complete
    }

    return false
  }

  stopChannel(): void {
    this.isChanneling = false
    this.container.visible = false
    this.progressBar.clear()
  }

  isActive(): boolean {
    return this.isChanneling
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
