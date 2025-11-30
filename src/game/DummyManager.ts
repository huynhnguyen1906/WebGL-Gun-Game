/**
 * Dummy Manager
 *
 * Quản lý spawn, respawn, và tracking các dummy players.
 * Tách riêng để dễ xóa khi chuyển sang online (thay bằng RemotePlayer từ socket).
 */
import * as PIXI from 'pixi.js'

import { ENTITY_CONFIG } from '../config/serverConfig'
import { DummyPlayer } from './DummyPlayer'
import { GameMap } from './Map'

export class DummyManager {
  private dummies: DummyPlayer[] = []
  private gameMap: GameMap
  private worldContainer: PIXI.Container
  private playerX: number = 0
  private playerY: number = 0

  constructor(gameMap: GameMap, worldContainer: PIXI.Container) {
    this.gameMap = gameMap
    this.worldContainer = worldContainer
  }

  // Initialize dummies
  spawnInitialDummies(playerX: number, playerY: number): void {
    this.playerX = playerX
    this.playerY = playerY

    const { COUNT } = ENTITY_CONFIG.DUMMY

    for (let i = 0; i < COUNT; i++) {
      this.spawnDummy()
    }
  }

  // Spawn a single dummy at valid position
  private spawnDummy(): DummyPlayer {
    const pos = this.getValidSpawnPosition()
    const dummy = new DummyPlayer(pos.x, pos.y)

    // Set respawn callback
    dummy.setRespawnCallback((d) => this.onDummyRespawn(d))

    this.dummies.push(dummy)
    this.worldContainer.addChild(dummy.getContainer())

    return dummy
  }

  // Get a valid spawn position (away from player and edges)
  private getValidSpawnPosition(): { x: number; y: number } {
    const { SPAWN_MARGIN, MIN_DISTANCE_FROM_PLAYER } = ENTITY_CONFIG.DUMMY
    let pos: { x: number; y: number }
    let attempts = 0
    const maxAttempts = 50

    do {
      pos = this.gameMap.getRandomValidPosition(SPAWN_MARGIN)
      attempts++

      // Check distance from player
      const dx = pos.x - this.playerX
      const dy = pos.y - this.playerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance >= MIN_DISTANCE_FROM_PLAYER) {
        return pos
      }
    } while (attempts < maxAttempts)

    // If can't find valid position, just return any valid position
    return this.gameMap.getRandomValidPosition(SPAWN_MARGIN)
  }

  // Called when a dummy needs to respawn
  private onDummyRespawn(dummy: DummyPlayer): void {
    const pos = this.getValidSpawnPosition()
    dummy.respawn(pos.x, pos.y)
  }

  // Update player position (for spawn distance calculation)
  updatePlayerPosition(x: number, y: number): void {
    this.playerX = x
    this.playerY = y
  }

  // Update all dummies
  update(currentTime: number): void {
    for (const dummy of this.dummies) {
      dummy.update(currentTime, this.worldContainer)
    }
  }

  // Update bullets for all dummies
  updateBullets(deltaSeconds: number): void {
    for (const dummy of this.dummies) {
      dummy.updateBullets(deltaSeconds)
    }
  }

  // Get all dummies (for collision detection)
  getDummies(): DummyPlayer[] {
    return this.dummies
  }

  // Get all alive dummies
  getAliveDummies(): DummyPlayer[] {
    return this.dummies.filter((d) => !d.getIsDead())
  }

  // Get all bullets from all dummies
  getAllBullets() {
    const bullets = []
    for (const dummy of this.dummies) {
      bullets.push(...dummy.bullets)
    }
    return bullets
  }

  destroy(): void {
    for (const dummy of this.dummies) {
      dummy.destroy()
    }
    this.dummies = []
  }
}
