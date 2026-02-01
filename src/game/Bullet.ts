import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'
import type { BaseEntity } from './BaseEntity'

// Bullet states for trail effect
const BulletState = {
  GROWING: 'GROWING', // Trail is extending from spawn point
  FLYING: 'FLYING', // Trail at max length, flying normally
  SHRINKING: 'SHRINKING', // Trail is shrinking into target/end point
} as const

type BulletStateType = (typeof BulletState)[keyof typeof BulletState]

export class Bullet {
  public id: string // Unique bullet ID from server
  private graphics: PIXI.Graphics
  public x: number // Head position
  public y: number
  private tailX: number // Tail position
  private tailY: number
  private vx: number
  private vy: number
  private angle: number
  private speed: number
  private ttl: number // time to live (seconds)
  public maxTTL: number
  public isAlive: boolean = true
  public damage: number
  public owner: BaseEntity

  // Trail effect
  private state: BulletStateType = BulletState.GROWING
  private distanceTraveled: number = 0
  private currentLength: number = 0
  public isShrinking: boolean = false // For collision manager to skip

  constructor(
    x: number,
    y: number,
    vx: number, // Velocity X
    vy: number, // Velocity Y
    range: number,
    damage: number = 0,
    owner: BaseEntity,
    id?: string // Optional ID from server
  ) {
    // Use server ID if provided, otherwise generate client-side ID
    this.id = id || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.x = x
    this.y = y
    this.tailX = x
    this.tailY = y
    this.damage = damage
    this.owner = owner

    // Use vx, vy directly
    this.vx = vx
    this.vy = vy
    this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    this.angle = Math.atan2(this.vy, this.vx)
    this.ttl = this.maxTTL

    // Create graphics container
    this.graphics = new PIXI.Graphics()
    this.drawTrail()
  }

  private drawTrail(): void {
    const { HEAD_WIDTH, TAIL_WIDTH, COLOR, HEAD_ALPHA, TAIL_ALPHA, SEGMENTS } = GAME_CONFIG.BULLET

    this.graphics.clear()

    // Calculate direction vector
    const dx = this.x - this.tailX
    const dy = this.y - this.tailY
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length < 1) {
      // Too short, draw a small dot
      this.graphics.circle(this.x, this.y, HEAD_WIDTH / 2)
      this.graphics.fill({ color: COLOR, alpha: HEAD_ALPHA })
      return
    }

    // Normalize direction
    const nx = dx / length
    const ny = dy / length

    // Perpendicular vector for width
    const px = -ny
    const py = nx

    // Draw tapered trail with gradient using segments
    for (let i = 0; i < SEGMENTS; i++) {
      const t1 = i / SEGMENTS // 0 to 1 (tail to head)
      const t2 = (i + 1) / SEGMENTS

      // Position along trail
      const x1 = this.tailX + dx * t1
      const y1 = this.tailY + dy * t1
      const x2 = this.tailX + dx * t2
      const y2 = this.tailY + dy * t2

      // Width at each point (interpolate from TAIL_WIDTH to HEAD_WIDTH)
      const w1 = TAIL_WIDTH + (HEAD_WIDTH - TAIL_WIDTH) * t1
      const w2 = TAIL_WIDTH + (HEAD_WIDTH - TAIL_WIDTH) * t2

      // Alpha at each point (interpolate from TAIL_ALPHA to HEAD_ALPHA)
      const alpha = TAIL_ALPHA + (HEAD_ALPHA - TAIL_ALPHA) * ((t1 + t2) / 2)

      // Draw trapezoid segment
      this.graphics.moveTo(x1 + px * w1, y1 + py * w1)
      this.graphics.lineTo(x2 + px * w2, y2 + py * w2)
      this.graphics.lineTo(x2 - px * w2, y2 - py * w2)
      this.graphics.lineTo(x1 - px * w1, y1 - py * w1)
      this.graphics.closePath()
      this.graphics.fill({ color: COLOR, alpha })
    }

    // Draw rounded head
    this.graphics.circle(this.x, this.y, HEAD_WIDTH / 2)
    this.graphics.fill({ color: COLOR, alpha: HEAD_ALPHA })
  }

  update(deltaSeconds: number): void {
    if (!this.isAlive) return

    const { MAX_LENGTH, GROW_DISTANCE } = GAME_CONFIG.BULLET
    const moveDistance = this.speed * deltaSeconds

    switch (this.state) {
      case BulletState.GROWING: {
        // Move head forward
        this.x += this.vx * deltaSeconds
        this.y += this.vy * deltaSeconds
        this.distanceTraveled += moveDistance

        // Calculate current trail length (grows from 0 to MAX_LENGTH)
        const growProgress = Math.min(this.distanceTraveled / GROW_DISTANCE, 1)
        this.currentLength = MAX_LENGTH * growProgress

        // Tail stays at spawn initially, then follows at MAX_LENGTH distance
        if (this.distanceTraveled <= GROW_DISTANCE) {
          // Still growing - tail gradually moves
          this.tailX = this.x - Math.cos(this.angle) * this.currentLength
          this.tailY = this.y - Math.sin(this.angle) * this.currentLength
        }

        // Transition to flying state
        if (growProgress >= 1) {
          this.state = BulletState.FLYING
        }
        break
      }

      case BulletState.FLYING:
        // Move both head and tail forward
        this.x += this.vx * deltaSeconds
        this.y += this.vy * deltaSeconds
        this.tailX += this.vx * deltaSeconds
        this.tailY += this.vy * deltaSeconds
        this.distanceTraveled += moveDistance
        break

      case BulletState.SHRINKING: {
        // Head stays still, tail catches up
        const shrinkSpeed = this.speed * 1.5 // Shrink faster than flying
        const shrinkDistance = shrinkSpeed * deltaSeconds

        // Move tail toward head
        const toHeadX = this.x - this.tailX
        const toHeadY = this.y - this.tailY
        const distToHead = Math.sqrt(toHeadX * toHeadX + toHeadY * toHeadY)

        if (distToHead <= shrinkDistance) {
          // Tail reached head - bullet is done
          this.isAlive = false
        } else {
          // Move tail toward head
          const normX = toHeadX / distToHead
          const normY = toHeadY / distToHead
          this.tailX += normX * shrinkDistance
          this.tailY += normY * shrinkDistance
        }
        break
      }
    }

    // Decrease TTL
    this.ttl -= deltaSeconds

    // Start shrinking when TTL runs out (instead of instant death)
    if (this.ttl <= 0 && this.state !== BulletState.SHRINKING) {
      this.startShrinking()
    }

    // Redraw trail
    this.drawTrail()
  }

  // Called when bullet hits something
  public startShrinking(): void {
    if (this.state !== BulletState.SHRINKING) {
      this.state = BulletState.SHRINKING
      this.isShrinking = true
    }
  }

  // Called when bullet hits - immediately mark for shrinking
  public onHit(): void {
    this.startShrinking()
  }

  // Set TTL (used when creating from server data with elapsed time)
  public setTTL(newTTL: number): void {
    this.ttl = Math.max(0, newTTL)
  }

  getGraphics(): PIXI.Graphics {
    return this.graphics
  }

  getRadius(): number {
    return GAME_CONFIG.BULLET.HEAD_WIDTH
  }

  destroy(): void {
    this.graphics.destroy()
  }
}
