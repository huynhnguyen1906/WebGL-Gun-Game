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

  // Melee animation state
  protected isPunchingLeft: boolean = false
  protected isPunchingRight: boolean = false

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

    // Left arm (only update if not punching)
    if (!this.isPunchingLeft) {
      const leftAngle = this.rotation - SPREAD_RAD / 2
      this.leftArm.x = Math.cos(leftAngle) * OFFSET_DISTANCE
      this.leftArm.y = Math.sin(leftAngle) * OFFSET_DISTANCE
    }

    // Right arm (only update if not punching)
    if (!this.isPunchingRight) {
      const rightAngle = this.rotation + SPREAD_RAD / 2
      this.rightArm.x = Math.cos(rightAngle) * OFFSET_DISTANCE
      this.rightArm.y = Math.sin(rightAngle) * OFFSET_DISTANCE
    }
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

  // Shooting / Melee
  tryShoot(targetX: number, targetY: number, currentTime: number): Bullet[] {
    const weaponData = getWeaponById(this.currentWeaponId)
    if (!weaponData) return []

    // If melee weapon, don't create bullets
    if (weaponData.isMelee) return []

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

  // Melee attack - check entities in range and apply damage
  // Returns list of entities hit
  tryMeleeAttack(targetX: number, targetY: number, currentTime: number, entities: BaseEntity[]): BaseEntity[] {
    const weaponData = getWeaponById(this.currentWeaponId)
    if (!weaponData || !weaponData.isMelee) return []

    const { cooldownMs, range, damage } = weaponData

    // Check if already punching
    if (this.isPunchingLeft || this.isPunchingRight) {
      return []
    }

    // Check cooldown
    if (currentTime - this.lastShootTime < cooldownMs) {
      return []
    }

    // Get attack direction for animation
    const angle = Math.atan2(targetY - this.y, targetX - this.x)

    // Play punch animation (alternate between left and right)
    const isLeftPunch = Math.floor(this.lastShootTime / cooldownMs) % 2 === 0
    this.playPunchAnimation(angle, isLeftPunch, range)

    // Find entities in melee range
    const hitEntities: BaseEntity[] = []

    for (const entity of entities) {
      if (entity === this || !entity.isAlive()) continue

      const dx = entity.x - this.x
      const dy = entity.y - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Check if in range
      if (distance <= range) {
        entity.takeDamage(damage)
        hitEntities.push(entity)
      }
    }

    this.lastShootTime = currentTime
    return hitEntities
  }

  // Punch animation - swing arm out to range and back
  protected playPunchAnimation(angle: number, isLeftPunch: boolean, range: number): void {
    const arm = isLeftPunch ? this.leftArm : this.rightArm

    // Mark this hand as punching
    if (isLeftPunch) {
      this.isPunchingLeft = true
    } else {
      this.isPunchingRight = true
    }

    const { ARM } = this.visualConfig
    const { OFFSET_DISTANCE, SPREAD_RAD } = ARM

    // Calculate base position
    const armAngle = isLeftPunch ? angle - SPREAD_RAD / 2 : angle + SPREAD_RAD / 2
    const baseX = Math.cos(armAngle) * OFFSET_DISTANCE
    const baseY = Math.sin(armAngle) * OFFSET_DISTANCE

    // Calculate extended position (fly out to attack range)
    const extendedX = Math.cos(angle) * range
    const extendedY = Math.sin(angle) * range

    // Animation duration
    const flyOutDuration = 150 // ms to fly out
    const flyBackDuration = 150 // ms to fly back
    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime

      if (elapsed < flyOutDuration) {
        // Flying out
        const progress = elapsed / flyOutDuration
        const easeProgress = progress * progress // Ease in
        arm.x = baseX + (extendedX - baseX) * easeProgress
        arm.y = baseY + (extendedY - baseY) * easeProgress
        requestAnimationFrame(animate)
      } else if (elapsed < flyOutDuration + flyBackDuration) {
        // Flying back
        const progress = (elapsed - flyOutDuration) / flyBackDuration
        const easeProgress = 1 - (1 - progress) * (1 - progress) // Ease out
        arm.x = extendedX + (baseX - extendedX) * easeProgress
        arm.y = extendedY + (baseY - extendedY) * easeProgress
        requestAnimationFrame(animate)
      } else {
        // Animation complete - reset to base position
        arm.x = baseX
        arm.y = baseY

        // Mark punching as complete
        if (isLeftPunch) {
          this.isPunchingLeft = false
        } else {
          this.isPunchingRight = false
        }
      }
    }

    animate()
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
