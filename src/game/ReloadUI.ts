/**
 * Reload UI
 *
 * Hiển thị reload progress bar khi player đang reload.
 */
import * as PIXI from 'pixi.js'

export class ReloadUI {
  private container: PIXI.Container
  private background: PIXI.Graphics
  private progressBar: PIXI.Graphics
  private text: PIXI.Text
  private isReloading: boolean = false
  private reloadStartTime: number = 0
  private reloadDuration: number = 1500 // 1.5 seconds

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
      text: 'Reloading...',
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

  startReload(currentTime: number, reloadTimeMs: number): void {
    this.isReloading = true
    this.reloadStartTime = currentTime
    this.reloadDuration = reloadTimeMs
    this.container.visible = true
  }

  updateReload(currentTime: number, playerX: number, playerY: number): boolean {
    if (!this.isReloading) return false

    const elapsed = currentTime - this.reloadStartTime
    const progress = Math.min(1, elapsed / this.reloadDuration)

    // Update progress bar
    this.progressBar.clear()
    this.progressBar.rect(-98, -8, 196 * progress, 16)
    this.progressBar.fill({ color: 0xffa500, alpha: 0.8 })

    // Update position (above player)
    this.container.x = playerX
    this.container.y = playerY - 60

    // Check if complete
    if (progress >= 1) {
      this.stopReload()
      return true // Reload complete
    }

    return false
  }

  stopReload(): void {
    this.isReloading = false
    this.container.visible = false
    this.progressBar.clear()
  }

  isActive(): boolean {
    return this.isReloading
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
