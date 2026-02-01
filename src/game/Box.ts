/**
 * Box - Container for item pickups
 *
 * Box có HP từ serverConfig, khi bị damage sẽ scale nhỏ dần
 * Khi vỡ (HP = 0) sẽ spawn item ngẫu nhiên trong bán kính từ config
 */
import * as PIXI from 'pixi.js'

import { BOX_CONFIG, type WeaponTypeValue } from '../config/serverConfig'

export type BoxContent = { type: 'weapon'; weaponType: WeaponTypeValue } | { type: 'healing' }

export class Box {
  private container: PIXI.Container
  private sprite: PIXI.Sprite | null = null
  private debugGraphics: PIXI.Graphics | null = null
  public id: number = -1 // Server-assigned ID for multiplayer
  public x: number
  public y: number
  private hp: number
  private radius: number // Collision radius
  private damageRadius: number // Damage detection radius

  public isDestroyed: boolean = false
  public content: BoxContent

  constructor(x: number, y: number, content: BoxContent, id: number = -1) {
    this.id = id
    this.x = x
    this.y = y
    this.content = content
    this.hp = BOX_CONFIG.MAX_HP
    this.radius = BOX_CONFIG.RADIUS
    this.damageRadius = BOX_CONFIG.DAMAGE_RADIUS

    this.container = new PIXI.Container()
    this.container.x = x
    this.container.y = y

    this.loadSprite()
    if (BOX_CONFIG.DEBUG_HITBOX) {
      this.createDebugHitbox()
    }
  }

  private async loadSprite(): Promise<void> {
    try {
      const texture = await PIXI.Assets.load('/box.svg')
      this.sprite = new PIXI.Sprite(texture)
      this.sprite.anchor.set(0.5)

      // Initial size based on max HP
      this.updateScale()

      this.container.addChild(this.sprite)
    } catch (error) {
      console.error('Failed to load box sprite:', error)

      // Fallback: draw a simple box
      const graphics = new PIXI.Graphics()
      graphics.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2)
      graphics.fill({ color: 0x8b4513 })
      graphics.stroke({ color: 0x654321, width: 2 })
      this.container.addChild(graphics)
    }
  }

  private createDebugHitbox(): void {
    this.debugGraphics = new PIXI.Graphics()

    // Red circle for collision hitbox
    this.debugGraphics.circle(0, 0, this.radius)
    this.debugGraphics.stroke({ color: 0xff0000, width: 2, alpha: 0.5 })

    // Green circle for damage hitbox
    this.debugGraphics.circle(0, 0, this.damageRadius)
    this.debugGraphics.stroke({ color: 0x00ff00, width: 2, alpha: 0.5 })

    this.container.addChild(this.debugGraphics)
  }

  private updateScale(): void {
    if (!this.sprite) return

    // Scale based on HP thresholds from config
    let scale = 0.6 // Default smallest

    for (const threshold of BOX_CONFIG.SCALE_THRESHOLDS) {
      if (this.hp >= threshold.minHp) {
        scale = threshold.scale
        break
      }
    }

    // Scale sprite to fit radius with current HP scale
    const baseSize = this.radius * 2
    const spriteScale = (baseSize * scale) / this.sprite.texture.width
    this.sprite.scale.set(spriteScale)
  }

  takeDamage(amount: number): void {
    if (this.isDestroyed) return

    this.hp = Math.max(0, this.hp - amount)
    this.updateScale()

    if (this.hp <= 0) {
      this.isDestroyed = true
    }
  }

  getHp(): number {
    return this.hp
  }

  getRadius(): number {
    return this.radius
  }

  getDamageRadius(): number {
    return this.damageRadius
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  // Get random spawn position within configured radius
  getItemSpawnPosition(): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * BOX_CONFIG.SPAWN_RADIUS

    return {
      x: this.x + Math.cos(angle) * distance,
      y: this.y + Math.sin(angle) * distance,
    }
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
