import { GAME_CONFIG } from '../config/gameConfig'
import { ENTITY_CONFIG, WEAPONS } from '../config/serverConfig'
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
  range: number
  speed: number
  spawnTime: number
}

export class Player extends BaseEntity {
  constructor(x: number, y: number) {
    super(x, y, GAME_CONFIG.PLAYER, ENTITY_CONFIG.PLAYER.MAX_HP)
    // Default weapon is the first one
    this.currentWeaponId = WEAPONS[0].id
  }

  // Move player with input
  move(
    deltaSeconds: number,
    dx: number,
    dy: number,
    mapClampFn: (x: number, y: number, radius: number) => { x: number; y: number }
  ): void {
    const { SPEED } = ENTITY_CONFIG.PLAYER
    const radius = this.visualConfig.RADIUS

    // Apply movement
    this.x += dx * SPEED * deltaSeconds
    this.y += dy * SPEED * deltaSeconds

    // Clamp to map bounds
    const clamped = mapClampFn(this.x, this.y, radius)
    this.x = clamped.x
    this.y = clamped.y

    this.container.x = this.x
    this.container.y = this.y
  }

  // Override setWeapon to use WeaponTypeValue
  setWeapon(weaponId: WeaponTypeValue): void {
    this.currentWeaponId = weaponId
    // Call parent to update visual (arms and weapon line)
    this.updateArmPositions()
  }

  getCurrentWeapon(): WeaponTypeValue {
    return this.currentWeaponId
  }

  // Set HP directly (for server sync)
  setHp(newHp: number): void {
    this.hp = Math.max(0, Math.min(newHp, this.maxHp))
  }

  // Create bullet from server data (same as RemotePlayer)
  createBulletFromServer(bulletData: BulletDataFromServer): Bullet {
    // Use vx, vy directly from server to avoid rounding errors
    const bullet = new Bullet(
      bulletData.x,
      bulletData.y,
      bulletData.vx,
      bulletData.vy,
      bulletData.range || 2000,
      bulletData.damage,
      this,
      bulletData.id
    )

    // Adjust TTL based on elapsed time since spawn
    if (bulletData.spawnTime) {
      const elapsedSeconds = (Date.now() - bulletData.spawnTime) / 1000
      bullet.setTTL(bullet.maxTTL - elapsedSeconds)
    }

    this.bullets.push(bullet)
    return bullet
  }

  // Respawn player at new position
  respawn(x: number, y: number): void {
    this.setPosition(x, y)
    this.resetHp()
  }
}
