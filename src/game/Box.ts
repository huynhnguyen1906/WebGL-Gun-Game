/**
 * Box - Container for item pickups
 *
 * Box có 30 HP, khi bị damage sẽ scale nhỏ dần (3 sizes: 10hp, 20hp, 30hp)
 * Khi vỡ (HP = 0) sẽ spawn item ngẫu nhiên trong bán kính 50px
 */
import * as PIXI from 'pixi.js'

import type { WeaponTypeValue } from '../config/serverConfig'

export type BoxContent = { type: 'weapon'; weaponType: WeaponTypeValue } | { type: 'healing' }

export class Box {
  private container: PIXI.Container
  private sprite: PIXI.Sprite | null = null
  public x: number
  public y: number
  private hp: number = 30
  private maxHp: number = 30
  private radius: number = 35 // Collision radius

  public isDestroyed: boolean = false
  public content: BoxContent

  constructor(x: number, y: number, content: BoxContent) {
    this.x = x
    this.y = y
    this.content = content

    this.container = new PIXI.Container()
    this.container.x = x
    this.container.y = y

    this.loadSprite()
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

  private updateScale(): void {
    if (!this.sprite) return

    // Scale based on exact HP values: 30hp = 100%, 20hp = 80%, 10hp = 60%
    let scale = 1.0

    if (this.hp > 20) {
      // 30-21 HP: Full size
      scale = 1.0
    } else if (this.hp > 10) {
      // 20-11 HP: 80% size
      scale = 0.8
    } else if (this.hp > 0) {
      // 10-1 HP: 60% size
      scale = 0.6
    }

    // Scale sprite to fit radius with current HP scale
    const baseSize = this.radius * 2
    const spriteScale = (baseSize * scale) / this.sprite.texture.width
    this.sprite.scale.set(spriteScale)
  }

  takeDamage(amount: number): void {
    if (this.isDestroyed) return

    console.log(`Box took ${amount} damage! HP: ${this.hp} -> ${this.hp - amount}`)

    this.hp = Math.max(0, this.hp - amount)
    this.updateScale()

    if (this.hp <= 0) {
      this.isDestroyed = true
      console.log('Box destroyed!')
    }
  }

  getHp(): number {
    return this.hp
  }

  getRadius(): number {
    return this.radius
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  // Get random spawn position within 50px radius
  getItemSpawnPosition(): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * 50 // 0-50px from box center

    return {
      x: this.x + Math.cos(angle) * distance,
      y: this.y + Math.sin(angle) * distance,
    }
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
