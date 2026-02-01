/**
 * Pillar - Static obstacle for cover
 *
 * Pillars are indestructible circular obstacles that block bullets and entities.
 * Larger than boxes, serve as cover in combat.
 */
import * as PIXI from 'pixi.js'

import { PILLAR_CONFIG } from '../config/serverConfig'

export class Pillar {
  private container: PIXI.Container
  private graphics!: PIXI.Graphics // Initialized in createGraphics()
  public x: number
  public y: number
  private radius: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.radius = PILLAR_CONFIG.RADIUS

    this.container = new PIXI.Container()
    this.container.x = x
    this.container.y = y

    this.createGraphics()
  }

  private createGraphics(): void {
    this.graphics = new PIXI.Graphics()

    // Shadow
    this.graphics.circle(2, 2, this.radius)
    this.graphics.fill({ color: 0x000000, alpha: 0.2 })

    // Main pillar
    this.graphics.circle(0, 0, this.radius)
    this.graphics.fill({ color: PILLAR_CONFIG.COLOR })
    this.graphics.stroke({ color: 0x654321, width: 3 })

    this.container.addChild(this.graphics)
  }

  getRadius(): number {
    return this.radius
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
