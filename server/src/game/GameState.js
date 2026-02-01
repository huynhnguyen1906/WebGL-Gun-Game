/**
 * Game State Manager
 * Central authority for all game state and rules
 */
import { GAME_CONFIG } from '../config/gameConfig.js'
import { BoxManager } from './BoxManager.js'
import { BulletManager } from './BulletManager.js'
import { GameMap } from './GameMap.js'
import { Player } from './Player.js'

export class GameState {
  constructor() {
    this.players = new Map() // socketId -> Player
    this.bulletManager = new BulletManager()
    this.gameMap = new GameMap()
    this.boxManager = new BoxManager(this.gameMap)
    this.nextPlayerId = 1

    // Initialize boxes and pillars
    this.boxManager.init()
  }

  // Add new player
  addPlayer(socketId) {
    const playerId = this.nextPlayerId++
    const spawnPos = this.getRandomSpawnPosition()

    const player = new Player(playerId, socketId, spawnPos.x, spawnPos.y)
    this.players.set(socketId, player)

    return player
  }

  // Get player by socket ID
  getPlayer(socketId) {
    return this.players.get(socketId)
  }

  // Get player by player ID
  getPlayerById(playerId) {
    return Array.from(this.players.values()).find((p) => p.id === playerId)
  }

  // Remove player
  removePlayer(socketId) {
    const player = this.players.get(socketId)
    this.players.delete(socketId)
    return player
  }

  // Get all players
  getAllPlayers() {
    return Array.from(this.players.values())
  }

  // Get all alive players
  getAlivePlayers() {
    return this.getAllPlayers().filter((p) => !p.isDead)
  }

  // Get random spawn position
  getRandomSpawnPosition() {
    const { SIZE, PADDING } = GAME_CONFIG.MAP
    const { SPAWN_MARGIN } = GAME_CONFIG.PLAYER

    const minPos = PADDING + SPAWN_MARGIN
    const maxPos = SIZE - PADDING - SPAWN_MARGIN

    return {
      x: minPos + Math.random() * (maxPos - minPos),
      y: minPos + Math.random() * (maxPos - minPos),
    }
  }

  // Update all game entities
  update(deltaSeconds) {
    // Update bullets
    this.bulletManager.update(deltaSeconds)

    // No need to update boxes/items - they're static until destroyed
  }

  // Get game state snapshot for network sync
  getStateSnapshot() {
    return {
      players: this.getAlivePlayers().map((p) => ({
        id: p.id,
        x: Math.round(p.x * 100) / 100,
        y: Math.round(p.y * 100) / 100,
        rotation: Math.round(p.rotation * 100) / 100,
        hp: p.hp,
      })),
      timestamp: Date.now(),
    }
  }

  // Get full game state (for initial connection)
  getFullState() {
    return {
      players: this.getAllPlayers().map((p) => p.getFullState()),
      config: GAME_CONFIG,
    }
  }
}
