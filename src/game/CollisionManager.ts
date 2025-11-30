/**
 * Collision Manager
 *
 * Xử lý va chạm giữa bullets và entities.
 * Tách riêng để dễ replace bằng server-side collision khi online.
 *
 * Khi chuyển sang online:
 * - Server sẽ validate collision
 * - Client chỉ nhận kết quả và render
 */
import { BaseEntity } from './BaseEntity'
import { Bullet } from './Bullet'

export interface CollisionResult {
  bullet: Bullet
  target: BaseEntity
  killer: BaseEntity // Owner of the bullet
  damage: number
}

export interface KillResult {
  victim: BaseEntity
  killer: BaseEntity
}

export class CollisionManager {
  // Check collision between a bullet and an entity
  private checkBulletEntityCollision(bullet: Bullet, entity: BaseEntity): boolean {
    if (!bullet.isAlive || !entity.isAlive()) return false

    // Don't hit the owner of the bullet
    if (bullet.owner === entity) return false

    const dx = bullet.x - entity.x
    const dy = bullet.y - entity.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    const collisionRadius = bullet.getRadius() + entity.getRadius()

    return distance < collisionRadius
  }

  // Check all bullets against all entities
  checkCollisions(bullets: Bullet[], entities: BaseEntity[]): CollisionResult[] {
    const results: CollisionResult[] = []

    for (const bullet of bullets) {
      if (!bullet.isAlive) continue

      for (const entity of entities) {
        if (!entity.isAlive()) continue

        if (this.checkBulletEntityCollision(bullet, entity)) {
          results.push({
            bullet,
            target: entity,
            killer: bullet.owner,
            damage: bullet.damage,
          })

          // Mark bullet as dead after hit
          bullet.isAlive = false
          break // Each bullet can only hit one entity
        }
      }
    }

    return results
  }

  // Apply damage from collision results
  applyDamage(results: CollisionResult[]): KillResult[] {
    const kills: KillResult[] = []

    for (const result of results) {
      const wasAlive = result.target.isAlive()
      result.target.takeDamage(result.damage)

      // Check if entity was killed
      if (wasAlive && !result.target.isAlive()) {
        kills.push({
          victim: result.target,
          killer: result.killer,
        })
      }
    }

    return kills
  }
}
