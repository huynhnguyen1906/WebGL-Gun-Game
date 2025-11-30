import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'
import type { BaseEntity } from './BaseEntity'

export class Bullet {
  private graphics: PIXI.Graphics
  public x: number
  public y: number
  private vx: number
  private vy: number
  private ttl: number // time to live (seconds)
  private maxTTL: number
  public isAlive: boolean = true
  public damage: number
  public owner: BaseEntity // Reference to the entity that fired this bullet

  constructor(
    x: number,
    y: number,
    angle: number,
    speed: number,
    range: number,
    damage: number = 0,
    owner: BaseEntity
  ) {
    this.x = x
    this.y = y
    this.damage = damage
    this.owner = owner

    const { RADIUS, COLOR } = GAME_CONFIG.BULLET

    // Calculate velocity from angle
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed

    // TTL = RANGE / SPEED (seconds)
    this.maxTTL = range / speed
    this.ttl = this.maxTTL

    // Draw bullet
    this.graphics = new PIXI.Graphics()
    this.graphics.circle(0, 0, RADIUS)
    this.graphics.fill({ color: COLOR })
    this.graphics.x = x
    this.graphics.y = y
  }

  update(deltaSeconds: number): void {
    if (!this.isAlive) return

    // Move
    this.x += this.vx * deltaSeconds
    this.y += this.vy * deltaSeconds

    this.graphics.x = this.x
    this.graphics.y = this.y

    // Decrease TTL
    this.ttl -= deltaSeconds

    // Destroy when time runs out
    if (this.ttl <= 0) {
      this.isAlive = false
    }
  }

  getGraphics(): PIXI.Graphics {
    return this.graphics
  }

  getRadius(): number {
    return GAME_CONFIG.BULLET.RADIUS
  }

  destroy(): void {
    this.graphics.destroy()
  }
}
