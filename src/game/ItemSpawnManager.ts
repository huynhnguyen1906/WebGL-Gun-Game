/**
 * Item Spawn Manager
 *
 * Quản lý việc spawn boxes và items trên map.
 * Items spawn trong boxes, khi box bị phá vỡ sẽ drop item.
 *
 * Online-ready:
 * - Server kiểm soát item spawns
 * - Client chỉ nhận positions và render
 */
import * as PIXI from 'pixi.js'

import { WeaponType, type WeaponTypeValue } from '../config/serverConfig'
import { Box, type BoxContent } from './Box'
import { HealingPickup, ItemPickup, WeaponPickup } from './ItemPickup'
import type { GameMap } from './Map'

export class ItemSpawnManager {
  private items: ItemPickup[] = []
  private boxes: Box[] = []
  private map: GameMap
  private worldContainer: PIXI.Container

  constructor(map: GameMap, worldContainer: PIXI.Container) {
    this.map = map
    this.worldContainer = worldContainer
  }

  // Spawn initial boxes on map
  spawnInitialItems(playerX: number, playerY: number, avoidRadius: number = 500): void {
    // Spawn 3 boxes with rifles
    for (let i = 0; i < 3; i++) {
      const pos = this.getValidSpawnPosition(playerX, playerY, avoidRadius)
      this.spawnBox(pos.x, pos.y, { type: 'weapon', weaponType: WeaponType.RIFLE })
    }

    // Spawn 2 boxes with snipers
    for (let i = 0; i < 2; i++) {
      const pos = this.getValidSpawnPosition(playerX, playerY, avoidRadius)
      this.spawnBox(pos.x, pos.y, { type: 'weapon', weaponType: WeaponType.SNIPER })
    }

    // Spawn 2 boxes with shotguns
    for (let i = 0; i < 2; i++) {
      const pos = this.getValidSpawnPosition(playerX, playerY, avoidRadius)
      this.spawnBox(pos.x, pos.y, { type: 'weapon', weaponType: WeaponType.SHOTGUN })
    }

    // Spawn 3 boxes with pistols
    for (let i = 0; i < 3; i++) {
      const pos = this.getValidSpawnPosition(playerX, playerY, avoidRadius)
      this.spawnBox(pos.x, pos.y, { type: 'weapon', weaponType: WeaponType.PISTOL })
    }

    // Spawn 5 boxes with healing
    for (let i = 0; i < 5; i++) {
      const pos = this.getValidSpawnPosition(playerX, playerY, avoidRadius)
      this.spawnBox(pos.x, pos.y, { type: 'healing' })
    }
  }

  private spawnBox(x: number, y: number, content: BoxContent): void {
    const box = new Box(x, y, content)
    this.boxes.push(box)
    this.worldContainer.addChild(box.getContainer())
  }

  private getValidSpawnPosition(playerX: number, playerY: number, avoidRadius: number): { x: number; y: number } {
    let attempts = 0
    const maxAttempts = 100

    while (attempts < maxAttempts) {
      const pos = this.map.getRandomValidPosition()

      // Check distance from player
      const dx = pos.x - playerX
      const dy = pos.y - playerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > avoidRadius) {
        return pos
      }

      attempts++
    }

    // Fallback: return random position anyway
    return this.map.getRandomValidPosition()
  }

  // Get item closest to player within pickup range
  getClosestItemInRange(playerX: number, playerY: number, range: number = 100): ItemPickup | null {
    let closest: ItemPickup | null = null
    let closestDistance = range

    for (const item of this.items) {
      if (item.isPickedUp) continue

      const distance = item.distanceTo(playerX, playerY)
      if (distance < closestDistance) {
        closestDistance = distance
        closest = item
      }
    }

    return closest
  }

  // Remove picked up item
  removeItem(item: ItemPickup): void {
    item.destroy()
    this.items = this.items.filter((i) => i !== item)
  }

  // Get all items
  getAllItems(): ItemPickup[] {
    return this.items
  }

  // Get all boxes
  getAllBoxes(): Box[] {
    return this.boxes
  }

  // Handle box destruction and spawn item
  checkDestroyedBoxes(): void {
    const destroyedBoxes = this.boxes.filter((box) => box.isDestroyed)

    for (const box of destroyedBoxes) {
      // Spawn item from box
      const spawnPos = box.getItemSpawnPosition()

      if (box.content.type === 'weapon') {
        // Get default ammo for weapon type
        let magazine = 0
        let reserve = 0

        switch (box.content.weaponType) {
          case WeaponType.PISTOL:
            magazine = 12
            reserve = 999
            break
          case WeaponType.RIFLE:
            magazine = 30
            reserve = 60
            break
          case WeaponType.SNIPER:
            magazine = 5
            reserve = 15
            break
          case WeaponType.SHOTGUN:
            magazine = 6
            reserve = 18
            break
        }

        const weapon = new WeaponPickup(spawnPos.x, spawnPos.y, box.content.weaponType, magazine, reserve)
        this.items.push(weapon)
        this.worldContainer.addChild(weapon.getContainer())
      } else if (box.content.type === 'healing') {
        const healing = new HealingPickup(spawnPos.x, spawnPos.y)
        this.items.push(healing)
        this.worldContainer.addChild(healing.getContainer())
      }

      // Remove box
      box.destroy()
    }

    // Remove destroyed boxes from list
    this.boxes = this.boxes.filter((box) => !box.isDestroyed)
  }

  destroy(): void {
    for (const item of this.items) {
      item.destroy()
    }
    this.items = []

    for (const box of this.boxes) {
      box.destroy()
    }
    this.boxes = []
  }
}
