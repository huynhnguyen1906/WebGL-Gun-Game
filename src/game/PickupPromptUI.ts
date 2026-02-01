/**
 * Pickup Prompt UI
 *
 * Hiển thị "Press F to pickup [Item Name]" khi player gần item.
 */
import * as PIXI from 'pixi.js'

export class PickupPromptUI {
  private container: PIXI.Container
  private background: PIXI.Graphics
  private text: PIXI.Text

  constructor() {
    this.container = new PIXI.Container()
    this.container.visible = false

    // Background
    this.background = new PIXI.Graphics()
    this.background.rect(-100, -15, 200, 30)
    this.background.fill({ color: 0x000000, alpha: 0.7 })
    this.container.addChild(this.background)

    // Text
    this.text = new PIXI.Text({
      text: 'Press F to pickup',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffffff,
        align: 'center',
      },
    })
    this.text.anchor.set(0.5)
    this.container.addChild(this.text)
  }

  show(itemName: string, x: number, y: number): void {
    this.text.text = `Press F to pickup ${itemName}`
    this.container.x = x
    this.container.y = y - 50 // Above item
    this.container.visible = true
  }

  hide(): void {
    this.container.visible = false
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
