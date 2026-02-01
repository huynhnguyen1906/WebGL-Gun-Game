/**
 * Server Box Manager (Client-side)
 * Manages boxes and pillars received from server
 * Renders visual representation only
 */
import * as PIXI from 'pixi.js'

import type { WeaponTypeValue } from '../config/serverConfig'
import { Box, type BoxContent } from './Box'
import { HealingPickup, ItemPickup, WeaponPickup } from './ItemPickup'
import { Pillar } from './Pillar'

export class ServerBoxManager {
  private boxes: Map<number, Box> = new Map()
  private pillars: Map<number, Pillar> = new Map()
  private items: Map<number, ItemPickup> = new Map()
  private worldContainer: PIXI.Container

  constructor(worldContainer: PIXI.Container) {
    this.worldContainer = worldContainer
  }

  // Initialize boxes and pillars from server data
  async initBoxesAndPillars(
    boxesData: Array<{
      id: number
      x: number
      y: number
      hp: number
      content: { type: 'weapon'; weaponType: string } | { type: 'healing' }
      isDestroyed: boolean
    }>,
    pillarsData: Array<{
      id: number
      x: number
      y: number
    }>
  ): Promise<void> {
    // Spawn boxes
    for (const boxData of boxesData) {
      if (!boxData.isDestroyed) {
        // Cast content to proper type
        let content: BoxContent
        if (boxData.content.type === 'weapon') {
          content = {
            type: 'weapon',
            weaponType: boxData.content.weaponType as WeaponTypeValue,
          }
        } else {
          content = { type: 'healing' }
        }

        const box = new Box(boxData.x, boxData.y, content, boxData.id)
        // Set HP to match server
        const currentHp = box.getHp()
        if (currentHp > boxData.hp) {
          box.takeDamage(currentHp - boxData.hp)
        }
        this.boxes.set(boxData.id, box)
        this.worldContainer.addChild(box.getContainer())
      }
    }

    // Spawn pillars
    for (const pillarData of pillarsData) {
      const pillar = new Pillar(pillarData.x, pillarData.y)
      this.pillars.set(pillarData.id, pillar)
      this.worldContainer.addChild(pillar.getContainer())
    }

    console.log(`✅ Loaded ${this.boxes.size} boxes and ${this.pillars.size} pillars from server`)
  }

  // Initialize dropped items from server data
  async initItems(
    itemsData: Array<{
      id: number
      type: 'weapon' | 'healing'
      weaponType?: string
      x: number
      y: number
    }>
  ): Promise<void> {
    for (const itemData of itemsData) {
      await this.spawnItem(itemData)
    }

    console.log(`✅ Loaded ${this.items.size} items from server`)
  }

  // Spawn item from server
  async spawnItem(itemData: {
    id: number
    type: 'weapon' | 'healing'
    weaponType?: string
    x: number
    y: number
    magazine?: number
    reserve?: number
  }): Promise<void> {
    let item: ItemPickup

    if (itemData.type === 'weapon' && itemData.weaponType) {
      item = new WeaponPickup(
        itemData.x,
        itemData.y,
        itemData.weaponType as WeaponTypeValue,
        itemData.magazine || 0,
        itemData.reserve || 0
      )
    } else {
      item = new HealingPickup(itemData.x, itemData.y)
    }

    // Wait for sprite to load
    await new Promise<void>((resolve) => {
      const checkLoaded = () => {
        if (item.getContainer().children.length > 0) {
          resolve()
        } else {
          setTimeout(checkLoaded, 50)
        }
      }
      checkLoaded()
    })

    this.items.set(itemData.id, item)
    this.worldContainer.addChild(item.getContainer())
  }

  // Update box damage from server
  damageBox(boxId: number, newHp: number, isDestroyed: boolean): void {
    const box = this.boxes.get(boxId)
    if (!box) {
      return
    }

    const currentHp = box.getHp()
    if (currentHp > newHp) {
      box.takeDamage(currentHp - newHp)
    }

    // Remove box if destroyed
    if (isDestroyed) {
      box.isDestroyed = true
      // Remove from world
      this.worldContainer.removeChild(box.getContainer())
      this.boxes.delete(boxId)
    }
  }

  // Remove item from world
  removeItem(itemId: number): void {
    const item = this.items.get(itemId)
    if (!item) return

    this.worldContainer.removeChild(item.getContainer())
    item.destroy()
    this.items.delete(itemId)
  }

  // Get closest item in range
  getClosestItemInRange(x: number, y: number, range: number): { item: ItemPickup; id: number } | null {
    let closestItem: ItemPickup | null = null
    let closestId: number = -1
    let closestDistance = range

    for (const [id, item] of this.items.entries()) {
      const dx = item.x - x
      const dy = item.y - y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < closestDistance) {
        closestItem = item
        closestId = id
        closestDistance = distance
      }
    }

    return closestItem ? { item: closestItem, id: closestId } : null
  }

  // Check collision with boxes/pillars
  checkCollision(x: number, y: number, radius: number): boolean {
    // Check boxes
    for (const box of this.boxes.values()) {
      if (box.isDestroyed) continue
      const dx = x - box.x
      const dy = y - box.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < radius + box.getRadius()) {
        return true
      }
    }

    // Check pillars
    for (const pillar of this.pillars.values()) {
      const dx = x - pillar.x
      const dy = y - pillar.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < radius + pillar.radius) {
        return true
      }
    }

    return false
  }

  // Get all boxes for collision detection
  getAllBoxes(): Box[] {
    return Array.from(this.boxes.values()).filter((box) => !box.isDestroyed)
  }

  // Get all pillars for collision detection
  getAllPillars(): Pillar[] {
    return Array.from(this.pillars.values())
  }

  destroy(): void {
    for (const box of this.boxes.values()) {
      this.worldContainer.removeChild(box.getContainer())
    }
    for (const pillar of this.pillars.values()) {
      this.worldContainer.removeChild(pillar.getContainer())
    }
    for (const item of this.items.values()) {
      this.worldContainer.removeChild(item.getContainer())
      item.destroy()
    }
    this.boxes.clear()
    this.pillars.clear()
    this.items.clear()
  }
}
