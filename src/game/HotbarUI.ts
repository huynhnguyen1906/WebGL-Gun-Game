/**
 * Hotbar UI - Inventory Display
 *
 * Hiển thị 4 slots của player:
 * Slot 1: Primary weapon
 * Slot 2: Secondary weapon (Pistol)
 * Slot 3: Healing item
 * Slot 4: Fist (melee)
 */
import * as PIXI from 'pixi.js'

import type { PlayerInventory, SlotTypeValue } from './PlayerInventory'
import { SlotType } from './PlayerInventory'

export class HotbarUI {
  private container: PIXI.Container
  private slots: PIXI.Graphics[] = []
  private slotNumbers: PIXI.Text[] = []
  private icons: (PIXI.Container | null)[] = [null, null, null, null]
  private ammoTexts: PIXI.Text[] = []
  private inventory: PlayerInventory | null = null

  // UI styling constants
  private readonly SLOT_SIZE = 60
  private readonly SLOT_SPACING = 10
  private readonly SLOT_COLOR = 0xf0f0f0
  private readonly SLOT_ALPHA = 0.5
  private readonly SLOT_BORDER_COLOR = 0x666666
  private readonly SLOT_ACTIVE_COLOR = 0xffa500
  private readonly SLOT_BORDER_WIDTH = 3

  constructor(screenWidth: number, screenHeight: number) {
    this.container = new PIXI.Container()
    this.createSlots()
    this.updatePosition(screenWidth, screenHeight)
  }

  private createSlots(): void {
    const slotCount = 4
    const totalWidth = this.SLOT_SIZE * slotCount + this.SLOT_SPACING * (slotCount - 1)

    for (let i = 0; i < slotCount; i++) {
      // Create slot background
      const slot = new PIXI.Graphics()
      const x = i * (this.SLOT_SIZE + this.SLOT_SPACING)

      // Draw slot
      slot.rect(x, 0, this.SLOT_SIZE, this.SLOT_SIZE)
      slot.fill({ color: this.SLOT_COLOR, alpha: this.SLOT_ALPHA })
      slot.stroke({ color: this.SLOT_BORDER_COLOR, width: 2 })

      this.container.addChild(slot)
      this.slots.push(slot)

      // Create slot number (1-4)
      const number = new PIXI.Text({
        text: `${i + 1}`,
        style: {
          fontFamily: 'Arial',
          fontSize: 16,
          fill: 0x000000,
          fontWeight: 'bold',
        },
      })
      number.anchor.set(0.5)
      number.x = x + 10
      number.y = 10

      this.container.addChild(number)
      this.slotNumbers.push(number)

      // Create ammo text (bottom of slot)
      const ammoText = new PIXI.Text({
        text: '',
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0x000000,
          align: 'center',
        },
      })
      ammoText.anchor.set(0.5)
      ammoText.x = x + this.SLOT_SIZE / 2
      ammoText.y = this.SLOT_SIZE - 10

      this.container.addChild(ammoText)
      this.ammoTexts.push(ammoText)
    }

    // Center the entire hotbar
    this.container.pivot.x = totalWidth / 2
    this.container.pivot.y = this.SLOT_SIZE / 2
  }

  // Set inventory reference
  setInventory(inventory: PlayerInventory): void {
    this.inventory = inventory
    this.updateDisplay()
  }

  // Update display based on inventory
  async updateDisplay(): Promise<void> {
    if (!this.inventory) return

    const slots = this.inventory.getAllSlots()
    const currentSlot = this.inventory.currentSlot

    for (let i = 0; i < 4; i++) {
      const slotData = slots[i]
      const slotNumber = (i + 1) as SlotTypeValue
      const x = i * (this.SLOT_SIZE + this.SLOT_SPACING)

      // Update border (active or not)
      const isActive = currentSlot === slotNumber
      this.slots[i].clear()
      this.slots[i].rect(x, 0, this.SLOT_SIZE, this.SLOT_SIZE)
      this.slots[i].fill({ color: this.SLOT_COLOR, alpha: this.SLOT_ALPHA })
      this.slots[i].stroke({
        color: isActive ? this.SLOT_ACTIVE_COLOR : this.SLOT_BORDER_COLOR,
        width: isActive ? this.SLOT_BORDER_WIDTH : 2,
      })

      // Remove old icon
      if (this.icons[i]) {
        this.container.removeChild(this.icons[i]!)
        this.icons[i] = null
      }

      // Load and display icon
      if (slotData.weaponType) {
        await this.loadIcon(i, slotData.weaponType, x)
      } else if (slotNumber === SlotType.HEALING && slotData.healingCount && slotData.healingCount > 0) {
        await this.loadHealingIcon(i, x)
      }

      // Update ammo/count text
      let ammoText = ''
      if (slotNumber === SlotType.HEALING) {
        const count = slotData.healingCount || 0
        ammoText = count > 0 ? `x${count}` : ''
      } else if (slotData.ammo && slotData.weaponType) {
        const { magazine, reserve } = slotData.ammo
        if (magazine === 999) {
          ammoText = '∞' // Infinite
        } else {
          ammoText = `${magazine}/${reserve}`
        }
      }

      this.ammoTexts[i].text = ammoText
    }
  }

  private async loadIcon(index: number, weaponType: string, x: number): Promise<void> {
    const iconMap: Record<string, string> = {
      FIST: '/fist.svg',
      PISTOL: '/pistol.svg',
      RIFLE: '/rifle.svg',
      SNIPER: '/sniper.svg',
      SHOTGUN: '/shotgun.svg',
    }

    const iconPath = iconMap[weaponType]
    if (!iconPath) return

    try {
      const texture = await PIXI.Assets.load(iconPath)
      const sprite = new PIXI.Sprite(texture)

      sprite.anchor.set(0.5)

      // Create icon container with fixed size
      const iconContainer = new PIXI.Container()
      iconContainer.x = x + this.SLOT_SIZE / 2
      iconContainer.y = this.SLOT_SIZE / 2

      // Scale sprite to fit in container (max 40x40)
      const maxSize = 40
      const scale = Math.min(maxSize / texture.width, maxSize / texture.height)
      sprite.scale.set(scale)

      iconContainer.addChild(sprite)
      this.container.addChild(iconContainer)

      // Store the container (not just sprite)
      this.icons[index] = iconContainer
    } catch (error) {
      console.error(`Failed to load icon: ${iconPath}`, error)
    }
  }

  private async loadHealingIcon(index: number, x: number): Promise<void> {
    try {
      const texture = await PIXI.Assets.load('/medkit.svg')
      const sprite = new PIXI.Sprite(texture)

      sprite.anchor.set(0.5)

      // Create icon container with fixed size
      const iconContainer = new PIXI.Container()
      iconContainer.x = x + this.SLOT_SIZE / 2
      iconContainer.y = this.SLOT_SIZE / 2

      // Scale sprite to fit in container (max 40x40)
      const maxSize = 40
      const scale = Math.min(maxSize / texture.width, maxSize / texture.height)
      sprite.scale.set(scale)

      iconContainer.addChild(sprite)
      this.container.addChild(iconContainer)

      this.icons[index] = iconContainer
    } catch (error) {
      console.error('Failed to load medkit icon', error)
    }
  }

  public updatePosition(screenWidth: number, screenHeight: number): void {
    // Position at bottom-center of screen
    this.container.x = screenWidth / 2
    this.container.y = screenHeight - 80 // 80px from bottom
  }

  public isPointInside(x: number, y: number): boolean {
    const bounds = this.container.getBounds()
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height
  }

  public getContainer(): PIXI.Container {
    return this.container
  }
}
