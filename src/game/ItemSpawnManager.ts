/**
 * Item Spawn Manager
 *
 * Quản lý việc spawn weapons và healing items trên map.
 * Random positions, avoid player spawn area.
 *
 * Online-ready:
 * - Server kiểm soát item spawns
 * - Client chỉ nhận positions và render
 */
import * as PIXI from 'pixi.js'

import { WeaponType, type WeaponTypeValue } from '../config/serverConfig'
import { HealingPickup, ItemPickup, WeaponPickup } from './ItemPickup'
import type { GameMap } from './Map'

export class ItemSpawnManager {
  private items: ItemPickup[] = []
  private map: GameMap
  private worldContainer: PIXI.Container

  constructor(map: GameMap, worldContainer: PIXI.Container) {
    this.map = map
    this.worldContainer = worldContainer
  }

  // Spawn initial items on map
  spawnInitialItems(playerX: number, playerY: number, avoidRadius: number = 500): void {
    // Spawn 3 rifles
    for (let i = 0; i < 3; i++) {
      const pos = this.getValidSpawnPosition(playerX, playerY, avoidRadius)
      this.spawnWeapon(pos.x, pos.y, WeaponType.RIFLE, 30, 90)
    }

    // Spawn 2 snipers
    for (let i = 0; i < 2; i++) {
      const pos = this.getValidSpawnPosition(playerX, playerY, avoidRadius)
      this.spawnWeapon(pos.x, pos.y, WeaponType.SNIPER, 5, 15)
    }

    // Spawn 2 shotguns
    for (let i = 0; i < 2; i++) {
      const pos = this.getValidSpawnPosition(playerX, playerY, avoidRadius)
      this.spawnWeapon(pos.x, pos.y, WeaponType.SHOTGUN, 6, 18)
    }

    // Spawn 3 pistols
    for (let i = 0; i < 3; i++) {
      const pos = this.getValidSpawnPosition(playerX, playerY, avoidRadius)
      this.spawnWeapon(pos.x, pos.y, WeaponType.PISTOL, 12, 999)
    }

    // Spawn 5 healing items
    for (let i = 0; i < 5; i++) {
      const pos = this.getValidSpawnPosition(playerX, playerY, avoidRadius)
      this.spawnHealing(pos.x, pos.y)
    }
  }

  private spawnWeapon(x: number, y: number, weaponType: WeaponTypeValue, magazine: number, reserve: number): void {
    const weapon = new WeaponPickup(x, y, weaponType, magazine, reserve)
    this.items.push(weapon)
    this.worldContainer.addChild(weapon.getContainer())
  }

  private spawnHealing(x: number, y: number): void {
    const healing = new HealingPickup(x, y)
    this.items.push(healing)
    this.worldContainer.addChild(healing.getContainer())
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

  destroy(): void {
    for (const item of this.items) {
      item.destroy()
    }
    this.items = []
  }
}
