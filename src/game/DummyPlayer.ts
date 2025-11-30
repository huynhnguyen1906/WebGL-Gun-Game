import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'
import { ENTITY_CONFIG, WEAPONS } from '../config/serverConfig'
import { BaseEntity } from './BaseEntity'
import { Bullet } from './Bullet'

export class DummyPlayer extends BaseEntity {
  private shootInterval: number
  private lastAutoShootTime: number = 0
  private isDead: boolean = false
  private deathTime: number = 0
  private respawnCallback?: (dummy: DummyPlayer) => void

  constructor(x: number, y: number) {
    super(x, y, GAME_CONFIG.DUMMY, ENTITY_CONFIG.DUMMY.MAX_HP)

    // Random starting weapon
    this.currentWeaponId = WEAPONS[Math.floor(Math.random() * WEAPONS.length)].id

    // Random starting rotation
    this.rotation = Math.random() * Math.PI * 2
    this.updateArmPositions()

    this.shootInterval = ENTITY_CONFIG.DUMMY.SHOOT_INTERVAL_MS
  }

  setRespawnCallback(callback: (dummy: DummyPlayer) => void): void {
    this.respawnCallback = callback
  }

  // Update dummy (auto-shoot with random direction)
  update(currentTime: number, worldContainer: PIXI.Container): Bullet[] {
    // Check if dead and waiting for respawn
    if (this.isDead) {
      if (currentTime - this.deathTime >= ENTITY_CONFIG.DUMMY.RESPAWN_TIME_MS) {
        // Trigger respawn
        if (this.respawnCallback) {
          this.respawnCallback(this)
        }
      }
      return []
    }

    // Check if time to shoot
    if (currentTime - this.lastAutoShootTime >= this.shootInterval) {
      this.lastAutoShootTime = currentTime

      // Random weapon each shot
      this.currentWeaponId = WEAPONS[Math.floor(Math.random() * WEAPONS.length)].id

      // Random angle (0-360 degrees)
      const randomAngle = Math.random() * Math.PI * 2

      // Update rotation to face shooting direction
      this.setRotation(randomAngle)

      // Calculate target point (far away in random direction)
      const targetX = this.x + Math.cos(randomAngle) * 1000
      const targetY = this.y + Math.sin(randomAngle) * 1000

      // Shoot
      const bullets = this.tryShoot(targetX, targetY, currentTime)

      // Add bullets to world
      for (const bullet of bullets) {
        worldContainer.addChild(bullet.getGraphics())
      }

      return bullets
    }

    return []
  }

  // Override takeDamage to handle death
  takeDamage(amount: number): void {
    super.takeDamage(amount)

    if (!this.isAlive() && !this.isDead) {
      this.onDeath()
    }
  }

  private onDeath(): void {
    this.isDead = true
    this.deathTime = performance.now()

    // Hide the dummy (but don't destroy, will respawn)
    this.container.visible = false
  }

  // Respawn at new position
  respawn(x: number, y: number): void {
    this.isDead = false
    this.setPosition(x, y)
    this.resetHp()
    this.container.visible = true

    // Random new rotation
    this.rotation = Math.random() * Math.PI * 2
    this.updateArmPositions()
  }

  getIsDead(): boolean {
    return this.isDead
  }
}
