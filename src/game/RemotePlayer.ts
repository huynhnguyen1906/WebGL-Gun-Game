/**
 * Remote Player (Other players in multiplayer)
 * Represents other players controlled by the server
 */
import { GAME_CONFIG } from '../config/gameConfig'
import type { WeaponTypeValue } from '../config/serverConfig'
import { BaseEntity } from './BaseEntity'
import { Bullet } from './Bullet'

interface BulletDataFromServer {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  damage: number
  weapon: string
}

export class RemotePlayer extends BaseEntity {
  public playerId: number
  private targetX: number
  private targetY: number
  private targetRotation: number
  private lerpFactor: number = 0.15 // Smooth interpolation factor (like reference)

  constructor(playerId: number, x: number, y: number) {
    super(x, y, GAME_CONFIG.DUMMY, 100) // Use DUMMY visual config
    this.playerId = playerId
    this.targetX = x
    this.targetY = y
    this.targetRotation = 0
  }

  // Update from server position (called from player:moved event)
  updateFromServer(
    x: number,
    y: number,
    rotation: number,
    _direction?: 'up' | 'down' | 'left' | 'right',
    _isMoving?: boolean
  ): void {
    this.targetX = x
    this.targetY = y
    this.targetRotation = rotation
    // Could use _direction and _isMoving for animations in the future
  }

  // Update HP (called from state updates)
  setHp(newHp: number): void {
    this.hp = newHp
    this.updateHpBar()
  }

  // Set current weapon
  setCurrentWeapon(weaponId: string): void {
    // Convert string to WeaponTypeValue and update weapon visual
    const weaponType = weaponId as WeaponTypeValue
    this.currentWeaponId = weaponType
  }

  // Set dead state
  setDead(isDead: boolean): void {
    if (isDead) {
      // Hide player when dead (optional: add death animation)
      this.container.alpha = 0.3
    } else {
      this.container.alpha = 1.0
    }
  }

  // Respawn player at new position
  respawn(x: number, y: number): void {
    this.x = x
    this.y = y
    this.targetX = x
    this.targetY = y
    this.resetHp()
    this.setDead(false)
    this.setPosition(x, y)
  }

  // Create bullet from server data
  createBulletFromServer(bulletData: BulletDataFromServer): Bullet {
    const angle = Math.atan2(bulletData.vy, bulletData.vx)
    const speed = Math.sqrt(bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy)
    const range = 2000 // Default range

    const bullet = new Bullet(bulletData.x, bulletData.y, angle, speed, range, bulletData.damage, this)
    this.bullets.push(bullet)
    return bullet
  }

  // Interpolate to server position (smooth movement using lerp)
  update(deltaSeconds: number): void {
    // Lerp position towards target (like reference implementation)
    this.x += (this.targetX - this.x) * this.lerpFactor
    this.y += (this.targetY - this.y) * this.lerpFactor
    this.rotation += (this.targetRotation - this.rotation) * this.lerpFactor

    this.setPosition(this.x, this.y)
    this.updateArmPositions()

    // Update bullets
    this.updateBullets(deltaSeconds)
  }
}
