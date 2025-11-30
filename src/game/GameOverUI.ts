import * as PIXI from 'pixi.js'

export class GameOverUI {
  private container: PIXI.Container
  private overlay: PIXI.Graphics
  private respawnButton: PIXI.Container
  private onRespawnCallback?: () => void

  constructor(screenWidth: number, screenHeight: number) {
    this.container = new PIXI.Container()
    this.container.visible = false // Hidden by default

    // Dark overlay
    this.overlay = new PIXI.Graphics()
    this.overlay.rect(0, 0, screenWidth, screenHeight)
    this.overlay.fill({ color: 0x000000, alpha: 0.7 })
    this.container.addChild(this.overlay)

    // Game Over text
    const gameOverText = new PIXI.Text({
      text: 'GAME OVER',
      style: {
        fontFamily: 'Arial',
        fontSize: 64,
        fill: 0xff4444,
        fontWeight: 'bold',
        dropShadow: {
          color: 0x000000,
          blur: 4,
          distance: 2,
        },
      },
    })
    gameOverText.anchor.set(0.5)
    gameOverText.x = screenWidth / 2
    gameOverText.y = screenHeight / 2 - 60
    this.container.addChild(gameOverText)

    // Respawn button
    this.respawnButton = new PIXI.Container()

    const buttonBg = new PIXI.Graphics()
    buttonBg.roundRect(-100, -25, 200, 50, 10)
    buttonBg.fill({ color: 0x44aa44 })
    buttonBg.stroke({ color: 0x228822, width: 3 })
    this.respawnButton.addChild(buttonBg)

    const buttonText = new PIXI.Text({
      text: 'RESPAWN',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    })
    buttonText.anchor.set(0.5)
    this.respawnButton.addChild(buttonText)

    this.respawnButton.x = screenWidth / 2
    this.respawnButton.y = screenHeight / 2 + 40
    this.respawnButton.eventMode = 'static'
    this.respawnButton.cursor = 'pointer'

    // Hover effect
    this.respawnButton.on('pointerover', () => {
      buttonBg.clear()
      buttonBg.roundRect(-100, -25, 200, 50, 10)
      buttonBg.fill({ color: 0x55cc55 })
      buttonBg.stroke({ color: 0x33aa33, width: 3 })
    })

    this.respawnButton.on('pointerout', () => {
      buttonBg.clear()
      buttonBg.roundRect(-100, -25, 200, 50, 10)
      buttonBg.fill({ color: 0x44aa44 })
      buttonBg.stroke({ color: 0x228822, width: 3 })
    })

    this.respawnButton.on('pointerdown', () => {
      if (this.onRespawnCallback) {
        this.onRespawnCallback()
      }
    })

    this.container.addChild(this.respawnButton)
  }

  setRespawnCallback(callback: () => void): void {
    this.onRespawnCallback = callback
  }

  show(): void {
    this.container.visible = true
  }

  hide(): void {
    this.container.visible = false
  }

  isVisible(): boolean {
    return this.container.visible
  }

  updatePosition(screenWidth: number, screenHeight: number): void {
    // Update overlay size
    this.overlay.clear()
    this.overlay.rect(0, 0, screenWidth, screenHeight)
    this.overlay.fill({ color: 0x000000, alpha: 0.7 })

    // Update button position
    this.respawnButton.x = screenWidth / 2
    this.respawnButton.y = screenHeight / 2 + 40

    // Update game over text position (need to find and update)
    const gameOverText = this.container.children[1] as PIXI.Text
    if (gameOverText) {
      gameOverText.x = screenWidth / 2
      gameOverText.y = screenHeight / 2 - 60
    }
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
