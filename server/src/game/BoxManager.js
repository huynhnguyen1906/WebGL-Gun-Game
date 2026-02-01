/**
 * Box Manager (Server-side)
 * Manages boxes and pillars that contain items
 * When boxes are destroyed, they drop items
 */
import { GAME_CONFIG } from '../config/gameConfig.js'

// Box configuration
const BOX_CONFIG = {
  MAX_HP: 30,
  RADIUS: 35, // Collision radius
  DAMAGE_RADIUS: 50, // Damage detection radius (easier to hit)
  COUNT: {
    RIFLE: 5,
    SNIPER: 3,
    SHOTGUN: 4,
    PISTOL: 6,
    HEALING: 8,
  },
}

// Pillar configuration
const PILLAR_CONFIG = {
  RADIUS: 50,
  COUNT: 12,
}

const SPAWN_CONFIG = {
  MIN_DISTANCE_BETWEEN_OBSTACLES: 150,
  AVOID_PLAYER_RADIUS: 500,
}

export class BoxManager {
  constructor(gameMap) {
    this.boxes = new Map() // boxId -> box data
    this.pillars = new Map() // pillarId -> pillar data
    this.droppedItems = new Map() // itemId -> dropped item data
    this.nextBoxId = 0
    this.nextPillarId = 0
    this.nextItemId = 0
    this.gameMap = gameMap
  }

  // Initialize with starting boxes and pillars
  init(playerPositions = []) {
    this.spawnInitialObstacles(playerPositions)
  }

  // Spawn initial boxes and pillars
  spawnInitialObstacles(playerPositions) {
    const mapSize = GAME_CONFIG.MAP.SIZE
    const pillarPositions = []
    const boxPositions = []

    // Spawn pillars first
    for (let i = 0; i < PILLAR_CONFIG.COUNT; i++) {
      const pos = this.getValidPosition(mapSize, pillarPositions, boxPositions, playerPositions, PILLAR_CONFIG.RADIUS)
      if (pos) {
        this.spawnPillar(pos.x, pos.y)
        pillarPositions.push({ x: pos.x, y: pos.y, radius: PILLAR_CONFIG.RADIUS })
      }
    }

    // Spawn weapon boxes
    const weaponTypes = [
      { type: 'RIFLE', count: BOX_CONFIG.COUNT.RIFLE },
      { type: 'SNIPER', count: BOX_CONFIG.COUNT.SNIPER },
      { type: 'SHOTGUN', count: BOX_CONFIG.COUNT.SHOTGUN },
      { type: 'PISTOL', count: BOX_CONFIG.COUNT.PISTOL },
    ]

    for (const { type, count } of weaponTypes) {
      for (let i = 0; i < count; i++) {
        const pos = this.getValidPosition(mapSize, pillarPositions, boxPositions, playerPositions, BOX_CONFIG.RADIUS)
        if (pos) {
          this.spawnBox(pos.x, pos.y, { type: 'weapon', weaponType: type })
          boxPositions.push({ x: pos.x, y: pos.y, radius: BOX_CONFIG.RADIUS })
        }
      }
    }

    // Spawn healing boxes
    for (let i = 0; i < BOX_CONFIG.COUNT.HEALING; i++) {
      const pos = this.getValidPosition(mapSize, pillarPositions, boxPositions, playerPositions, BOX_CONFIG.RADIUS)
      if (pos) {
        this.spawnBox(pos.x, pos.y, { type: 'healing' })
        boxPositions.push({ x: pos.x, y: pos.y, radius: BOX_CONFIG.RADIUS })
      }
    }

    console.log(`✅ Spawned ${this.boxes.size} boxes and ${this.pillars.size} pillars`)
  }

  // Get valid position avoiding other obstacles and players
  getValidPosition(mapSize, pillarPositions, boxPositions, playerPositions, radius) {
    let attempts = 0
    const maxAttempts = 100

    while (attempts < maxAttempts) {
      const x = Math.random() * mapSize
      const y = Math.random() * mapSize

      // Check if position is valid on map
      if (!this.gameMap.isValidPosition(x, y)) {
        attempts++
        continue
      }

      // Check distance from players
      let tooCloseToPlayer = false
      for (const player of playerPositions) {
        const dx = x - player.x
        const dy = y - player.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < SPAWN_CONFIG.AVOID_PLAYER_RADIUS) {
          tooCloseToPlayer = true
          break
        }
      }

      if (tooCloseToPlayer) {
        attempts++
        continue
      }

      // Check distance from pillars
      let tooCloseToPillar = false
      for (const pillar of pillarPositions) {
        const dx = x - pillar.x
        const dy = y - pillar.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const requiredDistance = SPAWN_CONFIG.MIN_DISTANCE_BETWEEN_OBSTACLES + radius + pillar.radius
        if (distance < requiredDistance) {
          tooCloseToPillar = true
          break
        }
      }

      if (tooCloseToPillar) {
        attempts++
        continue
      }

      // Check distance from boxes
      let tooCloseToBox = false
      for (const box of boxPositions) {
        const dx = x - box.x
        const dy = y - box.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const requiredDistance = SPAWN_CONFIG.MIN_DISTANCE_BETWEEN_OBSTACLES + radius + box.radius
        if (distance < requiredDistance) {
          tooCloseToBox = true
          break
        }
      }

      if (tooCloseToBox) {
        attempts++
        continue
      }

      return { x, y }
    }

    return null
  }

  // Spawn a box
  spawnBox(x, y, content) {
    const boxId = this.nextBoxId++
    const box = {
      id: boxId,
      x,
      y,
      hp: BOX_CONFIG.MAX_HP,
      radius: BOX_CONFIG.RADIUS,
      content,
      isDestroyed: false,
    }

    this.boxes.set(boxId, box)
    return box
  }

  // Spawn a pillar
  spawnPillar(x, y) {
    const pillarId = this.nextPillarId++
    const pillar = {
      id: pillarId,
      x,
      y,
      radius: PILLAR_CONFIG.RADIUS,
    }

    this.pillars.set(pillarId, pillar)
    return pillar
  }

  // Damage a box
  damageBox(boxId, damage) {
    const box = this.boxes.get(boxId)
    if (!box || box.isDestroyed) return null

    box.hp = Math.max(0, box.hp - damage)

    if (box.hp <= 0) {
      box.isDestroyed = true
      // Drop item from box
      const item = this.dropItemFromBox(box)
      // Remove box from map
      this.boxes.delete(boxId)
      return { box, item }
    }

    return { box, item: null }
  }

  // Drop item from destroyed box
  dropItemFromBox(box) {
    // Random offset from box position
    const angle = Math.random() * Math.PI * 2
    const distance = 30 + Math.random() * 20
    const x = box.x + Math.cos(angle) * distance
    const y = box.y + Math.sin(angle) * distance

    const itemId = this.nextItemId++
    let item

    if (box.content.type === 'weapon') {
      const weapon = GAME_CONFIG.WEAPONS[box.content.weaponType]

      // For infinite ammo weapons (like Pistol), use special reserve value
      const reserve = weapon.infiniteAmmo ? 999 : weapon.maxReserveAmmo || 0

      item = {
        id: itemId,
        type: 'weapon',
        weaponType: box.content.weaponType,
        x,
        y,
        magazine: weapon.magazineSize || 0,
        reserve: reserve,
        spawnTime: Date.now(),
      }
    } else {
      item = {
        id: itemId,
        type: 'healing',
        x,
        y,
        spawnTime: Date.now(),
      }
    }

    this.droppedItems.set(itemId, item)
    return item
  }

  // Pick up dropped item
  pickupItem(itemId, player) {
    const item = this.droppedItems.get(itemId)
    if (!item) return null

    // Apply item to player
    if (item.type === 'weapon') {
      // Update player's weapon inventory
      const weaponData = {
        id: item.weaponType,
        magazine: item.magazine,
        reserve: item.reserve,
      }

      // Store in appropriate slot
      if (item.weaponType === 'PISTOL') {
        player.inventory.pistol = weaponData
      } else {
        player.inventory.primary = weaponData
      }

      // Switch to picked up weapon
      player.currentWeapon = item.weaponType
    } else if (item.type === 'healing') {
      player.inventory.healing = Math.min((player.inventory.healing || 0) + 1, 3)
    }

    this.droppedItems.delete(itemId)
    return item
  }

  // Get all data for client sync
  getAllData() {
    return {
      boxes: Array.from(this.boxes.values()),
      pillars: Array.from(this.pillars.values()),
      items: Array.from(this.droppedItems.values()),
    }
  }

  // Check collision with obstacles
  checkCollision(x, y, radius) {
    // Check boxes
    for (const box of this.boxes.values()) {
      if (box.isDestroyed) continue
      const dx = x - box.x
      const dy = y - box.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < radius + box.radius) {
        return { type: 'box', object: box }
      }
    }

    // Check pillars
    for (const pillar of this.pillars.values()) {
      const dx = x - pillar.x
      const dy = y - pillar.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < radius + pillar.radius) {
        return { type: 'pillar', object: pillar }
      }
    }

    return null
  }
}
