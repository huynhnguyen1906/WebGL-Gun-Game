/**
 * Combat System
 * Handles shooting, melee, damage calculation, and hit validation
 */
import { GAME_CONFIG } from '../config/gameConfig.js'

export class CombatSystem {
  constructor(gameState) {
    this.gameState = gameState
    this.processedHits = new Set() // Track processed hits to prevent duplicates
  }

  // Handle player shooting
  handleShoot(player, weapon, data) {
    // Check cooldown (server-side validation)
    const now = Date.now()
    if (now - player.lastShootTime < weapon.cooldownMs) {
      return null // Rate limit
    }
    player.lastShootTime = now

    // Melee attacks handled differently
    if (weapon.isMelee) {
      return this.handleMeleeAttack(player, weapon, data)
    }

    // Create bullet(s)
    return this.createBullets(player, weapon, data)
  }

  // Create bullet data
  createBullets(player, weapon, data) {
    const bullets = []
    const now = Date.now()

    if (weapon.pelletCount) {
      // Shotgun - multiple pellets
      for (let i = 0; i < weapon.pelletCount; i++) {
        const spreadRad = (weapon.spreadAngle * Math.PI) / 180
        const randomOffset = (Math.random() - 0.5) * spreadRad
        const angle = data.angle + randomOffset

        // Convert angle and speed to vx, vy for client
        const vx = Math.cos(angle) * weapon.speed
        const vy = Math.sin(angle) * weapon.speed

        const bullet = {
          id: `${player.id}_${now}_${i}`,
          playerId: player.id,
          x: player.x,
          y: player.y,
          vx: vx,
          vy: vy,
          rotation: angle,
          damage: weapon.damage,
          weapon: weapon.id,
          spawnTime: now,
          range: weapon.range,
          speed: weapon.speed,
        }

        bullets.push(bullet)
      }
    } else {
      // Single bullet
      // Convert angle and speed to vx, vy for client
      const vx = Math.cos(data.angle) * weapon.speed
      const vy = Math.sin(data.angle) * weapon.speed

      const bullet = {
        id: `${player.id}_${now}`,
        playerId: player.id,
        x: player.x,
        y: player.y,
        vx: vx,
        vy: vy,
        rotation: data.angle,
        damage: weapon.damage,
        weapon: weapon.id,
        spawnTime: now,
        range: weapon.range,
        speed: weapon.speed,
      }

      bullets.push(bullet)
    }

    // Add to bullet manager
    this.gameState.bulletManager.addBullets(bullets)

    return bullets
  }

  // Handle melee attack
  handleMeleeAttack(player, weapon, data) {
    const hits = []

    // Check all players in range
    for (const target of this.gameState.getAllPlayers()) {
      if (target.id === player.id || target.isDead) continue

      const dx = target.x - player.x
      const dy = target.y - player.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= weapon.range) {
        const result = target.takeDamage(weapon.damage, player.id)
        hits.push({
          targetId: target.id,
          damage: weapon.damage,
          hp: target.hp,
          killed: result.killed,
        })
      }
    }

    return { type: 'melee', hits }
  }

  // Validate and apply bullet hit (client reports, server validates)
  validateHit(shooter, bulletId, targetId, damage) {
    // Create unique hit key to prevent duplicate processing
    const hitKey = `${bulletId}_${targetId}`
    if (this.processedHits.has(hitKey)) {
      return null // Already processed
    }

    // Get target
    const target = this.gameState.getPlayerById(targetId)
    if (!target || target.isDead) {
      return null
    }

    // Validate bullet ownership from bulletId format: "playerId_timestamp_index"
    const bulletOwnerId = parseInt(bulletId.split('_')[0])
    if (bulletOwnerId !== shooter.id) {
      console.log(`❌ Bullet owner mismatch: bulletOwnerId=${bulletOwnerId}, shooter.id=${shooter.id}`)
      return null
    }

    // Mark hit as processed
    this.processedHits.add(hitKey)

    // Cleanup old hits (keep last 1000)
    if (this.processedHits.size > 1000) {
      const entries = Array.from(this.processedHits)
      entries.slice(0, 500).forEach((key) => this.processedHits.delete(key))
    }

    // Apply damage
    const result = target.takeDamage(damage, shooter.id)

    return {
      targetId: target.id,
      attackerId: shooter.id,
      damage: damage,
      hp: target.hp,
      killed: result.killed,
    }
  }
}
