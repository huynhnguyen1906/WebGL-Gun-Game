/**
 * Item Spawn Manager
 *
 * Quản lý việc spawn boxes, pillars và items trên map.
 * Items spawn trong boxes, khi box bị phá vỡ sẽ drop item.
 * Pillars là obstacles tĩnh để chắn đạn.
 *
 * Online-ready:
 * - Server kiểm soát tất cả spawns
 * - Client chỉ nhận positions và render
 */
import * as PIXI from 'pixi.js'

import { PILLAR_CONFIG, SPAWN_CONFIG, WeaponType } from '../config/serverConfig'
import { Box, type BoxContent } from './Box'
import { HealingPickup, ItemPickup, WeaponPickup } from './ItemPickup'
import type { GameMap } from './Map'
import { Pillar } from './Pillar'

export class ItemSpawnManager {
  private items: ItemPickup[] = []
  private boxes: Box[] = []
  private pillars: Pillar[] = []
  private map: GameMap
  private worldContainer: PIXI.Container
  // Separate tracking for independent spacing systems
  private pillarPositions: Array<{ x: number; y: number; radius: number }> = []
  private boxPositions: Array<{ x: number; y: number; radius: number }> = []

  constructor(map: GameMap, worldContainer: PIXI.Container) {
    this.map = map
    this.worldContainer = worldContainer
  }

  // Spawn initial pillars and boxes on map
  spawnInitialItems(playerX: number, playerY: number, avoidRadius: number = SPAWN_CONFIG.AVOID_PLAYER_RADIUS): void {
    // First spawn pillars with their own spacing system
    for (let i = 0; i < PILLAR_CONFIG.COUNT; i++) {
      const pos = this.getValidPillarPosition(playerX, playerY, avoidRadius)
      if (pos) {
        this.spawnPillar(pos.x, pos.y)
      }
    }

    // Then spawn boxes with their own spacing system
    for (let i = 0; i < SPAWN_CONFIG.BOXES.RIFLE; i++) {
      const pos = this.getValidBoxPosition(playerX, playerY, avoidRadius)
      if (pos) {
        this.spawnBox(pos.x, pos.y, { type: 'weapon', weaponType: WeaponType.RIFLE })
      }
    }

    for (let i = 0; i < SPAWN_CONFIG.BOXES.SNIPER; i++) {
      const pos = this.getValidBoxPosition(playerX, playerY, avoidRadius)
      if (pos) {
        this.spawnBox(pos.x, pos.y, { type: 'weapon', weaponType: WeaponType.SNIPER })
      }
    }

    for (let i = 0; i < SPAWN_CONFIG.BOXES.SHOTGUN; i++) {
      const pos = this.getValidBoxPosition(playerX, playerY, avoidRadius)
      if (pos) {
        this.spawnBox(pos.x, pos.y, { type: 'weapon', weaponType: WeaponType.SHOTGUN })
      }
    }

    for (let i = 0; i < SPAWN_CONFIG.BOXES.PISTOL; i++) {
      const pos = this.getValidBoxPosition(playerX, playerY, avoidRadius)
      if (pos) {
        this.spawnBox(pos.x, pos.y, { type: 'weapon', weaponType: WeaponType.PISTOL })
      }
    }

    // Spawn healing boxes
    for (let i = 0; i < SPAWN_CONFIG.BOXES.HEALING; i++) {
      const pos = this.getValidBoxPosition(playerX, playerY, avoidRadius)
      if (pos) {
        this.spawnBox(pos.x, pos.y, { type: 'healing' })
      }
    }
  }

  private spawnBox(x: number, y: number, content: BoxContent): void {
    const box = new Box(x, y, content)
    this.boxes.push(box)
    this.boxPositions.push({ x, y, radius: 35 })
    this.worldContainer.addChild(box.getContainer())
  }

  private spawnPillar(x: number, y: number): void {
    const pillar = new Pillar(x, y)
    this.pillars.push(pillar)
    this.pillarPositions.push({ x, y, radius: PILLAR_CONFIG.RADIUS })
    this.worldContainer.addChild(pillar.getContainer())
  }

  // Get valid position for pillar spawn
  // Pillars maintain spacing from other pillars, only check overlap with boxes
  private getValidPillarPosition(
    playerX: number,
    playerY: number,
    avoidRadius: number
  ): { x: number; y: number } | null {
    let attempts = 0
    const maxAttempts = 100
    const minDistance = SPAWN_CONFIG.MIN_DISTANCE_BETWEEN_OBSTACLES
    const pillarRadius = PILLAR_CONFIG.RADIUS

    while (attempts < maxAttempts) {
      const pos = this.map.getRandomValidPosition()

      // Check distance from player
      const dx = pos.x - playerX
      const dy = pos.y - playerY
      const distanceToPlayer = Math.sqrt(dx * dx + dy * dy)

      if (distanceToPlayer <= avoidRadius) {
        attempts++
        continue
      }

      // Check spacing from other pillars (maintain minDistance)
      let tooCloseToOtherPillar = false
      for (const pillar of this.pillarPositions) {
        const pdx = pos.x - pillar.x
        const pdy = pos.y - pillar.y
        const distance = Math.sqrt(pdx * pdx + pdy * pdy)
        const requiredDistance = minDistance + pillar.radius + pillarRadius

        if (distance < requiredDistance) {
          tooCloseToOtherPillar = true
          break
        }
      }

      if (tooCloseToOtherPillar) {
        attempts++
        continue
      }

      // Only check overlap (not full minDistance) with boxes
      let overlapsBox = false
      for (const box of this.boxPositions) {
        const bdx = pos.x - box.x
        const bdy = pos.y - box.y
        const distance = Math.sqrt(bdx * bdx + bdy * bdy)
        const overlapDistance = box.radius + pillarRadius + 10 // Small buffer

        if (distance < overlapDistance) {
          overlapsBox = true
          break
        }
      }

      if (!overlapsBox) {
        return pos
      }

      attempts++
    }

    console.warn('Could not find valid pillar spawn position')
    return this.map.getRandomValidPosition()
  }

  // Get valid position for box spawn
  // Boxes maintain spacing from other boxes, only check overlap with pillars
  private getValidBoxPosition(playerX: number, playerY: number, avoidRadius: number): { x: number; y: number } | null {
    let attempts = 0
    const maxAttempts = 100
    const minDistance = SPAWN_CONFIG.MIN_DISTANCE_BETWEEN_OBSTACLES
    const boxRadius = 35 // Box radius from BOX_CONFIG

    while (attempts < maxAttempts) {
      const pos = this.map.getRandomValidPosition()

      // Check distance from player
      const dx = pos.x - playerX
      const dy = pos.y - playerY
      const distanceToPlayer = Math.sqrt(dx * dx + dy * dy)

      if (distanceToPlayer <= avoidRadius) {
        attempts++
        continue
      }

      // Check spacing from other boxes (maintain minDistance)
      let tooCloseToOtherBox = false
      for (const box of this.boxPositions) {
        const bdx = pos.x - box.x
        const bdy = pos.y - box.y
        const distance = Math.sqrt(bdx * bdx + bdy * bdy)
        const requiredDistance = minDistance + box.radius + boxRadius

        if (distance < requiredDistance) {
          tooCloseToOtherBox = true
          break
        }
      }

      if (tooCloseToOtherBox) {
        attempts++
        continue
      }

      // Only check overlap (not full minDistance) with pillars
      let overlapsPillar = false
      for (const pillar of this.pillarPositions) {
        const pdx = pos.x - pillar.x
        const pdy = pos.y - pillar.y
        const distance = Math.sqrt(pdx * pdx + pdy * pdy)
        const overlapDistance = pillar.radius + boxRadius + 10 // Small buffer

        if (distance < overlapDistance) {
          overlapsPillar = true
          break
        }
      }

      if (!overlapsPillar) {
        return pos
      }

      attempts++
    }

    console.warn('Could not find valid box spawn position')
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

  // Get all pillars
  getAllPillars(): Pillar[] {
    return this.pillars
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

    for (const pillar of this.pillars) {
      pillar.destroy()
    }
    this.pillars = []

    this.pillarPositions = []
    this.boxPositions = []
  }
}
