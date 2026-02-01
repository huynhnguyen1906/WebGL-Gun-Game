/**
 * Item Pickup System
 *
 * Các items spawn trên map và player có thể nhặt.
 * Types: Weapons, Healing items
 *
 * Online-ready:
 * - Server kiểm soát item spawns và pickups
 * - Client chỉ render và gửi pickup request
 */
import * as PIXI from 'pixi.js'

import type { WeaponTypeValue } from '../config/serverConfig'

// ===== ITEM TYPES =====
export const ItemType = {
  WEAPON: 'WEAPON',
  HEALING: 'HEALING',
} as const

export type ItemTypeValue = (typeof ItemType)[keyof typeof ItemType]

// ===== BASE ITEM PICKUP =====
export abstract class ItemPickup {
  public x: number
  public y: number
  protected container: PIXI.Container
  protected sprite: PIXI.Sprite | null = null
  public isPickedUp: boolean = false
  public abstract itemType: ItemTypeValue

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.container = new PIXI.Container()
    this.container.x = x
    this.container.y = y
  }

  protected async loadSprite(iconPath: string): Promise<void> {
    try {
      const texture = await PIXI.Assets.load(iconPath)
      this.sprite = new PIXI.Sprite(texture)

      // Center sprite
      this.sprite.anchor.set(0.5)

      // Rotate weapon 45 degrees (for weapons)
      this.sprite.rotation = Math.PI / 4 // 45 degrees

      // Create interactive circle background
      const circleRadius = 35
      const circle = new PIXI.Graphics()
      circle.circle(0, 0, circleRadius)
      circle.fill({ color: 0x444444, alpha: 0.6 })
      circle.stroke({ color: 0xffffff, width: 2, alpha: 0.8 })

      // Add glow effect
      const glow = new PIXI.Graphics()
      glow.circle(0, 0, circleRadius + 5)
      glow.fill({ color: 0xffffff, alpha: 0.1 })

      this.container.addChild(glow)
      this.container.addChild(circle)

      // Create icon container with fixed size (like HotbarUI)
      const iconContainer = new PIXI.Container()

      // Scale sprite to fit in circle (max size to fit in diameter)
      const maxSize = circleRadius * 1.4 // Fit within circle diameter
      const scale = Math.min(maxSize / texture.width, maxSize / texture.height)
      this.sprite.scale.set(scale)

      iconContainer.addChild(this.sprite)
      this.container.addChild(iconContainer)

      // Make interactive
      this.container.eventMode = 'static'
      this.container.cursor = 'pointer'

      // Simple bounce animation
      this.addBounceAnimation()
    } catch (error) {
      console.error(`Failed to load icon: ${iconPath}`, error)
      // Fallback: draw simple circle
      this.createFallbackGraphics()
    }
  }

  private addBounceAnimation(): void {
    let time = 0
    const bounceSpeed = 0.05
    const bounceHeight = 8

    const animate = () => {
      if (this.isPickedUp) return

      time += bounceSpeed
      // Bounce the entire container for smooth effect
      this.container.y = this.y + Math.sin(time) * bounceHeight

      requestAnimationFrame(animate)
    }

    animate()
  }

  private createFallbackGraphics(): void {
    const graphics = new PIXI.Graphics()
    graphics.circle(0, 0, 20)
    graphics.fill({ color: 0x888888 })
    this.container.addChild(graphics)
  }

  public getContainer(): PIXI.Container {
    return this.container
  }

  public distanceTo(x: number, y: number): number {
    const dx = this.x - x
    const dy = this.y - y
    return Math.sqrt(dx * dx + dy * dy)
  }

  public pickup(): void {
    this.isPickedUp = true
    this.container.visible = false
  }

  public destroy(): void {
    this.container.destroy({ children: true })
  }
}

// ===== WEAPON PICKUP =====
export class WeaponPickup extends ItemPickup {
  public itemType: ItemTypeValue = ItemType.WEAPON
  public weaponType: WeaponTypeValue
  public ammoInMagazine: number
  public reserveAmmo: number

  constructor(x: number, y: number, weaponType: WeaponTypeValue, ammoInMagazine: number, reserveAmmo: number) {
    super(x, y)
    this.weaponType = weaponType
    this.ammoInMagazine = ammoInMagazine
    this.reserveAmmo = reserveAmmo

    // Load weapon icon
    this.loadWeaponIcon()
  }

  private async loadWeaponIcon(): Promise<void> {
    const iconMap: Record<string, string> = {
      PISTOL: '/pistol.svg',
      RIFLE: '/rifle.svg',
      SNIPER: '/sniper.svg',
      SHOTGUN: '/shotgun.svg',
    }

    const iconPath = iconMap[this.weaponType] || '/pistol.svg'
    await this.loadSprite(iconPath)
  }
}

// ===== HEALING PICKUP =====
export class HealingPickup extends ItemPickup {
  public itemType: ItemTypeValue = ItemType.HEALING
  public healAmount: number = 50 // Heal 50 HP

  constructor(x: number, y: number) {
    super(x, y)
    this.loadHealingIcon()
  }

  private async loadHealingIcon(): Promise<void> {
    await this.loadSprite('/medkit.svg')
  }
}
