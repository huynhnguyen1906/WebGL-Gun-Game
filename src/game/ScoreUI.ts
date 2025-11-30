import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'

export class ScoreUI {
  private container: PIXI.Container
  private scoreText: PIXI.Text
  private score: number = 0

  constructor(screenWidth: number) {
    this.container = new PIXI.Container()

    const { FONT_SIZE, COLOR } = GAME_CONFIG.UI.SCORE

    // Create background
    const bg = new PIXI.Graphics()
    bg.roundRect(0, 0, 150, 40, 8)
    bg.fill({ color: 0x000000, alpha: 0.5 })
    this.container.addChild(bg)

    // Create score text
    this.scoreText = new PIXI.Text({
      text: 'Score: 0',
      style: {
        fontFamily: 'Arial',
        fontSize: FONT_SIZE,
        fill: COLOR,
        fontWeight: 'bold',
      },
    })
    this.scoreText.x = 15
    this.scoreText.y = 10
    this.container.addChild(this.scoreText)

    // Position at top-right
    this.updatePosition(screenWidth)
  }

  updatePosition(screenWidth: number): void {
    const { PADDING } = GAME_CONFIG.UI.SCORE
    this.container.x = screenWidth - 150 - PADDING
    this.container.y = PADDING
  }

  setScore(score: number): void {
    this.score = score
    this.scoreText.text = `Score: ${score}`
  }

  addScore(points: number): void {
    this.score += points
    this.scoreText.text = `Score: ${this.score}`
  }

  getScore(): number {
    return this.score
  }

  reset(): void {
    this.score = 0
    this.scoreText.text = 'Score: 0'
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
