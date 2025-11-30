import * as PIXI from 'pixi.js'

import { WEAPONS } from '../config/serverConfig'
import type { WeaponTypeValue } from '../config/serverConfig'

export class HotbarUI {
  private container: PIXI.Container
  private slots: PIXI.Graphics[] = []
  private labels: PIXI.Text[] = []
  private activeSlotIndex: number = 0
  private weapons: WeaponTypeValue[]
  private onWeaponChange?: (weapon: WeaponTypeValue) => void

  // UI styling constants
  private readonly SLOT_SIZE = 60
  private readonly SLOT_SPACING = 10
  private readonly SLOT_COLOR = 0x8b7355 // brown
  private readonly SLOT_BORDER_COLOR = 0x000000
  private readonly SLOT_ACTIVE_COLOR = 0xffffff
  private readonly SLOT_BORDER_WIDTH = 3

  constructor(screenWidth: number, screenHeight: number) {
    this.container = new PIXI.Container()
    // Get weapons from serverConfig
    this.weapons = WEAPONS.map((w) => w.id)
    this.createSlots()
    this.updatePosition(screenWidth, screenHeight)
  }

  private createSlots(): void {
    const slotCount = this.weapons.length
    const totalWidth = this.SLOT_SIZE * slotCount + this.SLOT_SPACING * (slotCount - 1)

    for (let i = 0; i < slotCount; i++) {
      // Create slot background
      const slot = new PIXI.Graphics()
      const x = i * (this.SLOT_SIZE + this.SLOT_SPACING)

      // Draw slot
      slot.rect(x, 0, this.SLOT_SIZE, this.SLOT_SIZE)
      slot.fill({ color: this.SLOT_COLOR })
      slot.stroke({ color: this.SLOT_BORDER_COLOR, width: 2 })

      // Make interactive
      slot.eventMode = 'static'
      slot.cursor = 'pointer'
      slot.on('pointerdown', () => this.selectSlot(i))

      this.container.addChild(slot)
      this.slots.push(slot)

      // Create weapon label
      const weaponName = WEAPONS[i].name
      const label = new PIXI.Text({
        text: weaponName,
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0xffffff,
          align: 'center',
        },
      })
      label.anchor.set(0.5)
      label.x = x + this.SLOT_SIZE / 2
      label.y = this.SLOT_SIZE / 2

      this.container.addChild(label)
      this.labels.push(label)
    }

    // Center the entire hotbar
    this.container.pivot.x = totalWidth / 2
    this.container.pivot.y = this.SLOT_SIZE / 2

    // Highlight first slot
    this.updateActiveSlot()
  }

  private updateActiveSlot(): void {
    // Clear all slots
    this.slots.forEach((slot, i) => {
      slot.clear()
      const x = i * (this.SLOT_SIZE + this.SLOT_SPACING)

      slot.rect(x, 0, this.SLOT_SIZE, this.SLOT_SIZE)
      slot.fill({ color: this.SLOT_COLOR })
      slot.stroke({
        color: i === this.activeSlotIndex ? this.SLOT_ACTIVE_COLOR : this.SLOT_BORDER_COLOR,
        width: i === this.activeSlotIndex ? this.SLOT_BORDER_WIDTH : 2,
      })
    })
  }

  private selectSlot(index: number): void {
    if (index === this.activeSlotIndex) return

    this.activeSlotIndex = index
    this.updateActiveSlot()

    // Notify weapon change
    if (this.onWeaponChange) {
      this.onWeaponChange(this.weapons[index])
    }
  }

  public setWeaponChangeCallback(callback: (weapon: WeaponTypeValue) => void): void {
    this.onWeaponChange = callback
  }

  public updatePosition(screenWidth: number, screenHeight: number): void {
    // Position at bottom-center of screen
    this.container.x = screenWidth / 2
    this.container.y = screenHeight - 80 // 80px from bottom
  }

  public getContainer(): PIXI.Container {
    return this.container
  }

  public getCurrentWeapon(): WeaponTypeValue {
    return this.weapons[this.activeSlotIndex]
  }

  // Check if a screen point is inside the hotbar UI
  public isPointInside(screenX: number, screenY: number): boolean {
    const bounds = this.container.getBounds()
    return (
      screenX >= bounds.x &&
      screenX <= bounds.x + bounds.width &&
      screenY >= bounds.y &&
      screenY <= bounds.y + bounds.height
    )
  }

  // Switch weapon by index (0-3)
  public selectWeaponByIndex(index: number): void {
    if (index >= 0 && index < this.weapons.length) {
      this.selectSlot(index)
    }
  }

  public destroy(): void {
    this.container.destroy({ children: true })
  }
}
