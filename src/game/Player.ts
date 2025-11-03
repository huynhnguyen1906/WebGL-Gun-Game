import * as PIXI from 'pixi.js'

import { GAME_CONFIG, WeaponType } from '../config/gameConfig'
import { Bullet } from './Bullet'

export class Player {
  private container: PIXI.Container
  private body!: PIXI.Graphics
  private leftArm!: PIXI.Graphics
  private rightArm!: PIXI.Graphics
  public x: number
  public y: number
  private rotation: number = 0
  private lastShootTime: number = 0
  public bullets: Bullet[] = []
  private currentWeapon: WeaponType = WeaponType.PISTOL

  constructor(x: number, y: number) {
    this.x = x
    this.y = y

    this.container = new PIXI.Container()
    this.container.x = x
    this.container.y = y

    this.createBody()
    this.createArms()
  }

  private createBody(): void {
    const { RADIUS, COLOR, SHADOW } = GAME_CONFIG.PLAYER

    this.body = new PIXI.Graphics()

    // Shadow (if enabled)
    if (SHADOW.ENABLED) {
      this.body.circle(0, 0, RADIUS)
      this.body.fill({ color: 0x000000, alpha: SHADOW.ALPHA })
      // Slightly offset the shadow
      this.body.x = 2
      this.body.y = 2
    }

    // Main body
    this.body.circle(0, 0, RADIUS)
    this.body.fill({ color: COLOR })
    this.body.x = 0
    this.body.y = 0

    this.container.addChild(this.body)
  }

  private createArms(): void {
    const { ARM } = GAME_CONFIG.PLAYER

    // Left arm
    this.leftArm = new PIXI.Graphics()
    this.leftArm.circle(0, 0, ARM.RADIUS)
    this.leftArm.fill({ color: ARM.COLOR })

    // Right arm
    this.rightArm = new PIXI.Graphics()
    this.rightArm.circle(0, 0, ARM.RADIUS)
    this.rightArm.fill({ color: ARM.COLOR })

    this.container.addChild(this.leftArm)
    this.container.addChild(this.rightArm)

    // Arm positions will be updated in updateArmPositions
    this.updateArmPositions()
  }

  private updateArmPositions(): void {
    const { ARM } = GAME_CONFIG.PLAYER
    const { OFFSET_DISTANCE, SPREAD_RAD } = ARM

    // Left and right arms form a V
    // Left arm: rotation - SPREAD_RAD/2
    const leftAngle = this.rotation - SPREAD_RAD / 2
    this.leftArm.x = Math.cos(leftAngle) * OFFSET_DISTANCE
    this.leftArm.y = Math.sin(leftAngle) * OFFSET_DISTANCE

    // Right arm: rotation + SPREAD_RAD/2
    const rightAngle = this.rotation + SPREAD_RAD / 2
    this.rightArm.x = Math.cos(rightAngle) * OFFSET_DISTANCE
    this.rightArm.y = Math.sin(rightAngle) * OFFSET_DISTANCE
  }

  // Update rotation to face mouse
  setRotation(angle: number): void {
    this.rotation = angle
    this.updateArmPositions()
  }

  // Move player
  move(
    deltaSeconds: number,
    dx: number,
    dy: number,
    mapClampFn: (x: number, y: number, radius: number) => { x: number; y: number }
  ): void {
    const { SPEED, RADIUS } = GAME_CONFIG.PLAYER

    // Apply movement
    this.x += dx * SPEED * deltaSeconds
    this.y += dy * SPEED * deltaSeconds

    // Clamp to map bounds
    const clamped = mapClampFn(this.x, this.y, RADIUS)
    this.x = clamped.x
    this.y = clamped.y

    this.container.x = this.x
    this.container.y = this.y
  }

  // Shoot bullet
  tryShoot(targetX: number, targetY: number, currentTime: number): Bullet[] {
    const weaponConfig = GAME_CONFIG.WEAPONS[this.currentWeapon]
    const { COOLDOWN_MS, SPEED, RANGE } = weaponConfig

    // Check cooldown
    if (currentTime - this.lastShootTime < COOLDOWN_MS) {
      return []
    }

    const bullets: Bullet[] = []

    // Calculate angle to target
    const angle = Math.atan2(targetY - this.y, targetX - this.x)

    // Check if shotgun (multiple pellets)
    if (this.currentWeapon === WeaponType.SHOTGUN) {
      const shotgunConfig = GAME_CONFIG.WEAPONS[WeaponType.SHOTGUN]
      const pelletCount = shotgunConfig.PELLET_COUNT
      const spreadAngleDeg = shotgunConfig.SPREAD_ANGLE
      const spreadAngleRad = (spreadAngleDeg * Math.PI) / 180

      // Create pellets in a spread pattern
      for (let i = 0; i < pelletCount; i++) {
        // Distribute pellets evenly across the spread angle
        const offset = (i / (pelletCount - 1) - 0.5) * spreadAngleRad
        const pelletAngle = angle + offset

        const bullet = new Bullet(this.x, this.y, pelletAngle, SPEED, RANGE)
        this.bullets.push(bullet)
        bullets.push(bullet)
      }
    } else {
      // Single bullet
      const bullet = new Bullet(this.x, this.y, angle, SPEED, RANGE)
      this.bullets.push(bullet)
      bullets.push(bullet)
    }

    this.lastShootTime = currentTime
    return bullets
  }

  // Switch weapon
  setWeapon(weapon: WeaponType): void {
    this.currentWeapon = weapon
  }

  getCurrentWeapon(): WeaponType {
    return this.currentWeapon
  }

  // Update bullets
  updateBullets(deltaSeconds: number): void {
    // Update all bullets
    for (const bullet of this.bullets) {
      bullet.update(deltaSeconds)
    }

    // Remove dead bullets
    this.bullets = this.bullets.filter((b) => {
      if (!b.isAlive) {
        b.destroy()
        return false
      }
      return true
    })
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  destroy(): void {
    // Destroy all bullets
    for (const bullet of this.bullets) {
      bullet.destroy()
    }
    this.bullets = []

    this.container.destroy({ children: true })
  }
}
