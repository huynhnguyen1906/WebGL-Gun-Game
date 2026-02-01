/**
 * Bullet Manager
 * Handles server-side bullet lifecycle and validation
 */

export class BulletManager {
  constructor() {
    this.bullets = []
  }

  // Add bullet to tracking
  addBullet(bullet) {
    this.bullets.push(bullet)
  }

  // Add multiple bullets (shotgun)
  addBullets(bullets) {
    this.bullets.push(...bullets)
  }

  // Update bullets and remove expired ones
  update(deltaSeconds) {
    const now = Date.now()
    this.bullets = this.bullets.filter((bullet) => {
      const age = now - bullet.spawnTime
      const maxAge = (bullet.range / bullet.speed) * 1000
      return age < maxAge
    })
  }

  // Get bullet by ID (for hit validation)
  getBullet(bulletId) {
    return this.bullets.find((b) => b.id === bulletId)
  }

  // Get all bullets
  getAllBullets() {
    return this.bullets
  }

  // Clear all bullets
  clear() {
    this.bullets = []
  }
}
