import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'

export class Bullet {
  private graphics: PIXI.Graphics
  public x: number
  public y: number
  private vx: number
  private vy: number
  private ttl: number // time to live (seconds)
  private maxTTL: number
  public isAlive: boolean = true

  constructor(x: number, y: number, angle: number) {
    this.x = x
    this.y = y

    const { SPEED, RANGE, RADIUS, COLOR } = GAME_CONFIG.BULLET

    // Calculate velocity from angle
    this.vx = Math.cos(angle) * SPEED
    this.vy = Math.sin(angle) * SPEED

    // TTL = RANGE / SPEED (giây)
    this.maxTTL = RANGE / SPEED
    this.ttl = this.maxTTL

    // Vẽ đạn
    this.graphics = new PIXI.Graphics()
    this.graphics.circle(0, 0, RADIUS)
    this.graphics.fill({ color: COLOR })
    this.graphics.x = x
    this.graphics.y = y
  }

  update(deltaSeconds: number): void {
    if (!this.isAlive) return

    // Di chuyển
    this.x += this.vx * deltaSeconds
    this.y += this.vy * deltaSeconds

    this.graphics.x = this.x
    this.graphics.y = this.y

    // Giảm TTL
    this.ttl -= deltaSeconds

    // Hủy nếu hết thời gian
    if (this.ttl <= 0) {
      this.isAlive = false
    }
  }

  getGraphics(): PIXI.Graphics {
    return this.graphics
  }

  destroy(): void {
    this.graphics.destroy()
  }
}
