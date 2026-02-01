/**
 * Item Manager (Server-side)
 * Manages weapon and healing item spawns across the map
 */
import { GAME_CONFIG } from '../config/gameConfig.js'

export class ItemManager {
  constructor() {
    this.items = new Map() // itemId -> item data
    this.nextItemId = 0
    this.spawnTimer = 0
  }

  // Initialize with starting items
  init() {
    this.spawnInitialItems()
  }

  // Spawn initial items around the map
  spawnInitialItems() {
    const mapSize = GAME_CONFIG.MAP.SIZE
    const mapCenter = mapSize / 2
    const spawnRadius = 400

    // Spawn 5 weapons
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5
      const x = mapCenter + Math.cos(angle) * spawnRadius
      const y = mapCenter + Math.sin(angle) * spawnRadius

      const weaponTypes = ['PISTOL', 'RIFLE', 'SNIPER', 'SHOTGUN']
      const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)]

      this.spawnWeapon(x, y, weaponType)
    }

    // Spawn 8 healing items
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.PI / 8
      const x = mapCenter + Math.cos(angle) * (spawnRadius * 0.7)
      const y = mapCenter + Math.sin(angle) * (spawnRadius * 0.7)

      this.spawnHealing(x, y)
    }

    console.log(`✅ Spawned ${this.items.size} initial items`)
  }

  // Spawn a weapon
  spawnWeapon(x, y, weaponType) {
    const weapon = GAME_CONFIG.WEAPONS[weaponType]
    if (!weapon) return null

    const itemId = this.nextItemId++
    const item = {
      id: itemId,
      type: 'weapon',
      weaponType,
      x,
      y,
      magazine: weapon.magazineSize || 0,
      reserve: weapon.defaultReserve || 0,
      spawnTime: Date.now(),
    }

    this.items.set(itemId, item)
    return item
  }

  // Spawn a healing item
  spawnHealing(x, y) {
    const itemId = this.nextItemId++
    const item = {
      id: itemId,
      type: 'healing',
      x,
      y,
      spawnTime: Date.now(),
    }

    this.items.set(itemId, item)
    return item
  }

  // Player picks up item
  pickup(itemId, player) {
    const item = this.items.get(itemId)
    if (!item) return null

    // Remove item
    this.items.delete(itemId)

    // Apply to player inventory
    if (item.type === 'weapon') {
      // Add weapon to player inventory
      if (!player.inventory) {
        player.inventory = { primary: null, pistol: null, healing: 0 }
      }

      if (item.weaponType === 'PISTOL') {
        player.inventory.pistol = {
          weapon: item.weaponType,
          magazine: item.magazine,
          reserve: item.reserve,
        }
      } else {
        player.inventory.primary = {
          weapon: item.weaponType,
          magazine: item.magazine,
          reserve: item.reserve,
        }
      }

      player.currentWeapon = item.weaponType
    } else if (item.type === 'healing') {
      if (!player.inventory) {
        player.inventory = { primary: null, pistol: null, healing: 0 }
      }
      player.inventory.healing = Math.min((player.inventory.healing || 0) + 1, 3)
    }

    return item
  }

  // Update (called every tick)
  update(deltaSeconds) {
    this.spawnTimer += deltaSeconds

    // Respawn items every 30 seconds if needed
    if (this.spawnTimer >= 30 && this.items.size < 10) {
      const mapSize = GAME_CONFIG.MAP.SIZE
      const mapCenter = mapSize / 2
      const spawnRadius = 400

      // Random spawn position
      const angle = Math.random() * Math.PI * 2
      const distance = spawnRadius * (0.5 + Math.random() * 0.5)
      const x = mapCenter + Math.cos(angle) * distance
      const y = mapCenter + Math.sin(angle) * distance

      // 70% chance weapon, 30% chance healing
      if (Math.random() < 0.7) {
        const weaponTypes = ['PISTOL', 'RIFLE', 'SNIPER', 'SHOTGUN']
        const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)]
        this.spawnWeapon(x, y, weaponType)
      } else {
        this.spawnHealing(x, y)
      }

      this.spawnTimer = 0
    }
  }

  // Get all items (for initial sync)
  getAllItems() {
    return Array.from(this.items.values())
  }

  // Get item by ID
  getItem(itemId) {
    return this.items.get(itemId)
  }
}
