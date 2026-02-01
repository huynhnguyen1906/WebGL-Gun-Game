/**
 * Server-side Player class
 * Authority for player state, validation, and collision
 */
import { GAME_CONFIG } from '../config/gameConfig.js'

export class Player {
  constructor(id, socketId, x, y) {
    this.id = id
    this.socketId = socketId
    this.x = x
    this.y = y
    this.rotation = 0
    this.hp = GAME_CONFIG.PLAYER.MAX_HP
    this.maxHp = GAME_CONFIG.PLAYER.MAX_HP
    this.isDead = false

    // Movement state (client calculates position, server validates)
    this.direction = 'down' // Direction player is facing
    this.isMoving = false // Whether player is currently moving

    // Weapon state
    this.currentWeapon = 'FIST'
    this.lastShootTime = 0

    // Inventory (simplified for now - client handles full inventory)
    this.inventory = {
      primary: null,
      pistol: null,
      healing: 0,
    }

    // Network
    this.lastInputSeq = 0
  }

  // Update player position from client data (client-authoritative movement)
  updatePosition(data, boxManager = null) {
    if (this.isDead) return

    // Store old position for rollback if needed
    const oldX = this.x
    const oldY = this.y

    // Directly update position from client (server validates bounds)
    if (data.x !== undefined) this.x = data.x
    if (data.y !== undefined) this.y = data.y
    if (data.direction !== undefined) this.direction = data.direction
    if (data.isMoving !== undefined) this.isMoving = data.isMoving
    if (data.rotation !== undefined) this.rotation = data.rotation

    // Validate and clamp to map bounds
    const { SIZE, PADDING } = GAME_CONFIG.MAP
    const radius = GAME_CONFIG.PLAYER.RADIUS
    this.x = Math.max(PADDING + radius, Math.min(SIZE - PADDING - radius, this.x))
    this.y = Math.max(PADDING + radius, Math.min(SIZE - PADDING - radius, this.y))

    // Validate collision with boxes and pillars
    if (boxManager) {
      this.validateCollisions(boxManager)
    }
  }

  // Validate and resolve collisions with obstacles
  validateCollisions(boxManager) {
    const playerRadius = GAME_CONFIG.PLAYER.RADIUS

    // Check collision with boxes
    for (const box of boxManager.boxes.values()) {
      if (box.isDestroyed) continue

      const dx = this.x - box.x
      const dy = this.y - box.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const minDistance = playerRadius + box.radius

      if (distance < minDistance) {
        // Push player away from box
        const overlap = minDistance - distance
        const pushAngle = Math.atan2(dy, dx)
        this.x += Math.cos(pushAngle) * overlap
        this.y += Math.sin(pushAngle) * overlap
      }
    }

    // Check collision with pillars
    for (const pillar of boxManager.pillars.values()) {
      const dx = this.x - pillar.x
      const dy = this.y - pillar.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const minDistance = playerRadius + pillar.radius

      if (distance < minDistance) {
        // Push player away from pillar
        const overlap = minDistance - distance
        const pushAngle = Math.atan2(dy, dx)
        this.x += Math.cos(pushAngle) * overlap
        this.y += Math.sin(pushAngle) * overlap
      }
    }
  }

  // Take damage
  takeDamage(amount, attackerId) {
    if (this.isDead) return false

    this.hp = Math.max(0, this.hp - amount)

    if (this.hp <= 0) {
      this.isDead = true
      return { killed: true, attackerId }
    }

    return { killed: false, attackerId }
  }

  // Heal player
  heal(amount) {
    if (this.isDead) return false

    this.hp = Math.min(this.hp + amount, this.maxHp)
    return true
  }

  // Respawn player
  respawn(x, y) {
    this.x = x
    this.y = y
    this.hp = this.maxHp
    this.isDead = false
    this.isMoving = false
    this.currentWeapon = 'FIST'
  }

  // Get state for network sync
  getState() {
    return {
      id: this.id,
      x: Math.round(this.x * 100) / 100, // Round to 2 decimals
      y: Math.round(this.y * 100) / 100,
      rotation: Math.round(this.rotation * 100) / 100,
      direction: this.direction,
      isMoving: this.isMoving,
      hp: this.hp,
      currentWeapon: this.currentWeapon,
      isDead: this.isDead,
    }
  }

  // Get full state (for initial sync)
  getFullState() {
    return {
      ...this.getState(),
      maxHp: this.maxHp,
      inventory: this.inventory,
    }
  }
}
