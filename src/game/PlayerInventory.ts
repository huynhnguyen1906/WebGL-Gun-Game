/**
 * Player Inventory System
 *
 * Quản lý 4 slots của player:
 * Slot 1: Primary weapon (Rifle, Sniper, Shotgun)
 * Slot 2: Secondary weapon (Pistol - infinite ammo)
 * Slot 3: Healing items (max 3 stack)
 * Slot 4: Fist (melee - always available)
 *
 * Online-ready:
 * - Server kiểm soát inventory state
 * - Client chỉ render và gửi action requests
 */
import { HEALING_CONFIG, WEAPONS, type WeaponData, WeaponType, type WeaponTypeValue } from '../config/serverConfig'

export const SlotType = {
  PRIMARY: 1,
  SECONDARY: 2,
  HEALING: 3,
  FIST: 4,
} as const

export type SlotTypeValue = (typeof SlotType)[keyof typeof SlotType]

export interface AmmoState {
  magazine: number
  reserve: number
}

export interface InventorySlot {
  slotNumber: SlotTypeValue
  weaponType: WeaponTypeValue | null
  ammo?: AmmoState
  healingCount?: number
}

export class PlayerInventory {
  private slots: Map<SlotTypeValue, InventorySlot>
  public currentSlot: SlotTypeValue = SlotType.FIST // Default: Fist

  constructor() {
    this.slots = new Map()

    // Initialize empty slots
    this.slots.set(SlotType.PRIMARY, {
      slotNumber: SlotType.PRIMARY,
      weaponType: null,
    })

    this.slots.set(SlotType.SECONDARY, {
      slotNumber: SlotType.SECONDARY,
      weaponType: null,
    })

    this.slots.set(SlotType.HEALING, {
      slotNumber: SlotType.HEALING,
      weaponType: null,
      healingCount: 0,
    })

    this.slots.set(SlotType.FIST, {
      slotNumber: SlotType.FIST,
      weaponType: WeaponType.FIST as WeaponTypeValue,
    })
  }

  // Switch to a slot
  switchToSlot(slotNumber: SlotTypeValue): boolean {
    const slot = this.slots.get(slotNumber)
    if (!slot) return false

    // Can't switch to empty slot (except FIST which is always available)
    if (slotNumber !== SlotType.FIST && slotNumber !== SlotType.HEALING && !slot.weaponType) {
      return false
    }

    // Can't switch to healing slot if no healing items
    if (slotNumber === SlotType.HEALING && (!slot.healingCount || slot.healingCount === 0)) {
      return false
    }

    this.currentSlot = slotNumber
    return true
  }

  // Get current weapon data
  getCurrentWeapon(): WeaponData | null {
    const slot = this.slots.get(this.currentSlot)
    if (!slot || !slot.weaponType) return null

    return WEAPONS.find((w) => w.id === slot.weaponType) || null
  }

  // Get weapon in specific slot
  getWeaponInSlot(slotNumber: SlotTypeValue): WeaponData | null {
    const slot = this.slots.get(slotNumber)
    if (!slot || !slot.weaponType) return null

    return WEAPONS.find((w) => w.id === slot.weaponType) || null
  }

  // Add weapon to inventory
  addWeapon(weaponType: WeaponTypeValue, magazine: number, reserve: number): boolean {
    const weaponData = WEAPONS.find((w) => w.id === weaponType)
    if (!weaponData) return false

    // Pistol always goes to slot 2
    if (weaponType === WeaponType.PISTOL) {
      this.slots.set(SlotType.SECONDARY, {
        slotNumber: SlotType.SECONDARY,
        weaponType: WeaponType.PISTOL,
        ammo: { magazine: 999, reserve: 999 }, // Infinite ammo
      })
      return true
    }

    // Other weapons go to slot 1
    this.slots.set(SlotType.PRIMARY, {
      slotNumber: SlotType.PRIMARY,
      weaponType,
      ammo: { magazine, reserve },
    })

    return true
  }

  // Add healing item (max from config)
  addHealing(): boolean {
    const slot = this.slots.get(SlotType.HEALING)
    if (!slot) return false

    const currentCount = slot.healingCount || 0
    if (currentCount >= HEALING_CONFIG.MAX_STACK) return false

    slot.healingCount = currentCount + 1
    return true
  }

  // Use healing item
  useHealing(): boolean {
    const slot = this.slots.get(SlotType.HEALING)
    if (!slot || !slot.healingCount || slot.healingCount === 0) return false

    slot.healingCount -= 1
    return true
  }

  // Get ammo for current weapon
  getCurrentAmmo(): AmmoState | null {
    const slot = this.slots.get(this.currentSlot)
    if (!slot || !slot.ammo) return null
    return slot.ammo
  }

  // Consume ammo when shooting
  consumeAmmo(slotNumber: SlotTypeValue): boolean {
    const slot = this.slots.get(slotNumber)
    if (!slot || !slot.ammo) return false

    // Infinite ammo check
    if (slot.ammo.magazine === 999) return true

    if (slot.ammo.magazine > 0) {
      slot.ammo.magazine -= 1
      return true
    }

    return false
  }

  // Reload weapon
  reload(slotNumber: SlotTypeValue): boolean {
    const slot = this.slots.get(slotNumber)
    if (!slot || !slot.ammo || !slot.weaponType) return false

    const weaponData = WEAPONS.find((w) => w.id === slot.weaponType)
    if (!weaponData || !weaponData.magazineSize) return false

    // Check if already full
    if (slot.ammo.magazine >= weaponData.magazineSize) return false

    // Check if have reserve ammo
    if (slot.ammo.reserve === 0) return false

    // Calculate ammo needed
    const needed = weaponData.magazineSize - slot.ammo.magazine
    const toReload = Math.min(needed, slot.ammo.reserve)

    slot.ammo.magazine += toReload
    slot.ammo.reserve -= toReload

    return true
  }

  // Get all slots for UI
  getAllSlots(): InventorySlot[] {
    return [
      this.slots.get(SlotType.PRIMARY)!,
      this.slots.get(SlotType.SECONDARY)!,
      this.slots.get(SlotType.HEALING)!,
      this.slots.get(SlotType.FIST)!,
    ]
  }

  // Get healing count
  getHealingCount(): number {
    const slot = this.slots.get(SlotType.HEALING)
    return slot?.healingCount || 0
  }

  // Check if current slot is melee
  isCurrentSlotMelee(): boolean {
    return this.currentSlot === SlotType.FIST
  }

  // Check if current slot is healing
  isCurrentSlotHealing(): boolean {
    return this.currentSlot === SlotType.HEALING
  }
}
