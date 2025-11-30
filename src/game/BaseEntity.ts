import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'
import { ENTITY_CONFIG, WEAPONS, getWeaponById } from '../config/serverConfig'
import type { WeaponTypeValue } from '../config/serverConfig'
import { Bullet } from './Bullet'

export interface EntityVisualConfig {
  RADIUS: number
  COLOR: number
  SHADOW: { ENABLED: boolean; BLUR: number; ALPHA: number }
  ARM: {
    RADIUS: number
    OFFSET_DISTANCE: number
    SPREAD_RAD: number
    COLOR: number
  }
}

export abstract class BaseEntity {
  protected container: PIXI.Container
  protected body!: PIXI.Graphics
  protected leftArm!: PIXI.Graphics
  protected rightArm!: PIXI.Graphics
  protected hpBar!: PIXI.Graphics
  protected hpBarBg!: PIXI.Graphics

  public x: number
  public y: number
  protected rotation: number = 0

  // HP System
  protected hp: number
  protected maxHp: number

  // Shooting
  protected lastShootTime: number = 0
  public bullets: Bullet[] = []
  protected currentWeaponId: WeaponTypeValue = WEAPONS[0].id

  // Visual config (different for player vs dummy)
  protected visualConfig: EntityVisualConfig

  constructor(x: number, y: number, visualConfig: EntityVisualConfig, maxHp: number = ENTITY_CONFIG.PLAYER.MAX_HP) {
    this.x = x
    this.y = y
    this.visualConfig = visualConfig
    this.maxHp = maxHp
    this.hp = maxHp

    this.container = new PIXI.Container()
    this.container.x = x
    this.container.y = y

    this.createBody()
    this.createArms()
    this.createHpBar()
  }

  protected createBody(): void {
    const { RADIUS, COLOR, SHADOW } = this.visualConfig

    this.body = new PIXI.Graphics()

    // Shadow (if enabled)
    if (SHADOW.ENABLED) {
      this.body.circle(2, 2, RADIUS) // Offset shadow
      this.body.fill({ color: 0x000000, alpha: SHADOW.ALPHA })
    }

    // Main body
    this.body.circle(0, 0, RADIUS)
    this.body.fill({ color: COLOR })

    this.container.addChild(this.body)
  }

  protected createArms(): void {
    const { ARM } = this.visualConfig

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

    this.updateArmPositions()
  }

  protected createHpBar(): void {
    const { WIDTH, HEIGHT, OFFSET_Y, BG_COLOR } = GAME_CONFIG.UI.HP_BAR

    // Background
    this.hpBarBg = new PIXI.Graphics()
    this.hpBarBg.rect(-WIDTH / 2, OFFSET_Y, WIDTH, HEIGHT)
    this.hpBarBg.fill({ color: BG_COLOR })
    this.container.addChild(this.hpBarBg)

    // Fill
    this.hpBar = new PIXI.Graphics()
    this.container.addChild(this.hpBar)
    this.updateHpBar()
  }

  protected updateHpBar(): void {
    const { WIDTH, HEIGHT, OFFSET_Y, FILL_COLOR, LOW_HP_COLOR } = GAME_CONFIG.UI.HP_BAR

    this.hpBar.clear()
    const hpPercent = this.hp / this.maxHp
    const fillWidth = WIDTH * hpPercent
    const color = hpPercent < 0.3 ? LOW_HP_COLOR : FILL_COLOR

    this.hpBar.rect(-WIDTH / 2, OFFSET_Y, fillWidth, HEIGHT)
    this.hpBar.fill({ color })
  }

  protected updateArmPositions(): void {
    const { ARM } = this.visualConfig
    const { OFFSET_DISTANCE, SPREAD_RAD } = ARM

    // Left arm
    const leftAngle = this.rotation - SPREAD_RAD / 2
    this.leftArm.x = Math.cos(leftAngle) * OFFSET_DISTANCE
    this.leftArm.y = Math.sin(leftAngle) * OFFSET_DISTANCE

    // Right arm
    const rightAngle = this.rotation + SPREAD_RAD / 2
    this.rightArm.x = Math.cos(rightAngle) * OFFSET_DISTANCE
    this.rightArm.y = Math.sin(rightAngle) * OFFSET_DISTANCE
  }

  // Set rotation (face direction)
  setRotation(angle: number): void {
    this.rotation = angle
    this.updateArmPositions()
  }

  // Damage system
  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount)
    this.updateHpBar()
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount)
    this.updateHpBar()
  }

  resetHp(): void {
    this.hp = this.maxHp
    this.updateHpBar()
  }

  isAlive(): boolean {
    return this.hp > 0
  }

  getHp(): number {
    return this.hp
  }

  getMaxHp(): number {
    return this.maxHp
  }

  getRadius(): number {
    return this.visualConfig.RADIUS
  }

  // Shooting
  tryShoot(targetX: number, targetY: number, currentTime: number): Bullet[] {
    const weaponData = getWeaponById(this.currentWeaponId)
    if (!weaponData) return []

    const { cooldownMs, speed, range, damage, pelletCount, spreadAngle } = weaponData

    // Check cooldown
    if (currentTime - this.lastShootTime < cooldownMs) {
      return []
    }

    const bullets: Bullet[] = []
    const angle = Math.atan2(targetY - this.y, targetX - this.x)

    // Check if shotgun (multiple pellets)
    if (pelletCount && spreadAngle) {
      const spreadAngleRad = (spreadAngle * Math.PI) / 180

      for (let i = 0; i < pelletCount; i++) {
        const randomOffset = (Math.random() - 0.5) * spreadAngleRad
        const pelletAngle = angle + randomOffset

        const depthOffset = (Math.random() - 0.5) * 20
        const lateralOffset = (Math.random() - 0.5) * 8

        const startX = this.x + Math.cos(angle) * depthOffset + Math.cos(angle + Math.PI / 2) * lateralOffset
        const startY = this.y + Math.sin(angle) * depthOffset + Math.sin(angle + Math.PI / 2) * lateralOffset

        const bullet = new Bullet(startX, startY, pelletAngle, speed, range, damage, this)
        this.bullets.push(bullet)
        bullets.push(bullet)
      }
    } else {
      // Single bullet
      const bullet = new Bullet(this.x, this.y, angle, speed, range, damage, this)
      this.bullets.push(bullet)
      bullets.push(bullet)
    }

    this.lastShootTime = currentTime
    return bullets
  }

  // Update bullets
  updateBullets(deltaSeconds: number): void {
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

  // Set weapon
  setWeapon(weaponId: WeaponTypeValue): void {
    this.currentWeaponId = weaponId
  }

  getCurrentWeaponId(): WeaponTypeValue {
    return this.currentWeaponId
  }

  // Position
  setPosition(x: number, y: number): void {
    this.x = x
    this.y = y
    this.container.x = x
    this.container.y = y
  }

  getContainer(): PIXI.Container {
    return this.container
  }

  destroy(): void {
    for (const bullet of this.bullets) {
      bullet.destroy()
    }
    this.bullets = []
    this.container.destroy({ children: true })
  }
}
