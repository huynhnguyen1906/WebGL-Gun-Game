/**
 * Active Item Display UI
 *
 * Hiển thị thông tin về item đang active ở trên hotbar:
 * - Weapon: Icon + Ammo (magazine/reserve)
 * - Healing: Icon + Count (x3)
 * - Fist: Icon only
 */
import * as PIXI from 'pixi.js'

import type { PlayerInventory } from './PlayerInventory'
import { SlotType } from './PlayerInventory'

export class ActiveItemDisplay {
  private container: PIXI.Container
  private background: PIXI.Graphics
  private iconContainer: PIXI.Container | null = null
  private ammoText: PIXI.Text
  private inventory: PlayerInventory | null = null

  // UI styling
  private readonly DISPLAY_WIDTH = 200
  private readonly DISPLAY_HEIGHT = 80
  private readonly BG_COLOR = 0xf0f0f0
  private readonly BG_ALPHA = 0.5

  constructor() {
    this.container = new PIXI.Container()

    // Background
    this.background = new PIXI.Graphics()
    this.background.roundRect(0, 0, this.DISPLAY_WIDTH, this.DISPLAY_HEIGHT, 8)
    this.background.fill({ color: this.BG_COLOR, alpha: this.BG_ALPHA })
    this.background.stroke({ color: 0x333333, width: 2 })
    this.container.addChild(this.background)

    // Ammo text (centered)
    this.ammoText = new PIXI.Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 22,
        fill: 0x000000,
        fontWeight: 'bold',
      },
    })
    this.ammoText.x = 10
    this.ammoText.y = this.DISPLAY_HEIGHT / 2 - 15
    this.container.addChild(this.ammoText)
  }

  setInventory(inventory: PlayerInventory): void {
    this.inventory = inventory
    this.updateDisplay()
  }

  async updateDisplay(): Promise<void> {
    if (!this.inventory) return

    const currentSlot = this.inventory.currentSlot
    const weapon = this.inventory.getCurrentWeapon()
    const ammo = this.inventory.getCurrentAmmo()
    const healingCount = this.inventory.getHealingCount()

    // Remove old icon
    if (this.iconContainer) {
      this.container.removeChild(this.iconContainer)
      this.iconContainer = null
    }

    // Update based on slot type
    if (currentSlot === SlotType.FIST) {
      this.ammoText.text = ''
      // Load fist icon
      await this.loadIcon('/fist.svg')
    } else if (currentSlot === SlotType.HEALING) {
      this.ammoText.text = healingCount > 0 ? `x${healingCount}` : 'Empty'
      this.ammoText.style.fill = healingCount > 0 ? 0x000000 : 0xff0000

      // Load healing icon
      await this.loadIcon('/medkit.svg')
    } else if (weapon) {
      if (ammo) {
        if (ammo.magazine === 999) {
          this.ammoText.text = '∞'
        } else {
          this.ammoText.text = `${ammo.magazine} / ${ammo.reserve}`
          // Color warning if low ammo
          if (ammo.magazine === 0) {
            this.ammoText.style.fill = 0xff0000
          } else if (ammo.magazine < (weapon.magazineSize || 0) / 4) {
            this.ammoText.style.fill = 0xff8800
          } else {
            this.ammoText.style.fill = 0x000000
          }
        }
      } else {
        this.ammoText.text = ''
      }

      // Load weapon icon
      const iconMap: Record<string, string> = {
        PISTOL: '/pistol.svg',
        RIFLE: '/rifle.svg',
        SNIPER: '/sniper.svg',
        SHOTGUN: '/shotgun.svg',
      }
      const iconPath = iconMap[weapon.id]
      if (iconPath) {
        await this.loadIcon(iconPath)
      }
    }
  }

  private async loadIcon(iconPath: string): Promise<void> {
    try {
      const texture = await PIXI.Assets.load(iconPath)
      const sprite = new PIXI.Sprite(texture)

      sprite.anchor.set(0.5)

      // Create icon container
      this.iconContainer = new PIXI.Container()
      this.iconContainer.x = this.DISPLAY_WIDTH - 45
      this.iconContainer.y = this.DISPLAY_HEIGHT / 2

      // Scale to fit
      const maxSize = 50
      const scale = Math.min(maxSize / texture.width, maxSize / texture.height)
      sprite.scale.set(scale)

      this.iconContainer.addChild(sprite)
      this.container.addChild(this.iconContainer)
    } catch (error) {
      console.error(`Failed to load icon: ${iconPath}`, error)
    }
  }

  updatePosition(screenWidth: number, screenHeight: number): void {
    // Position above hotbar, centered
    this.container.x = screenWidth / 2 - this.DISPLAY_WIDTH / 2
    this.container.y = screenHeight - 200 // Higher above hotbar
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
