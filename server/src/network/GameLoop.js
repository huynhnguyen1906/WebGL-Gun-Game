/**
 * Game Loop
 * Handles server tick updates and state broadcasting
 */
import { GAME_CONFIG } from '../config/gameConfig.js'

export class GameLoop {
  constructor(io, gameState) {
    this.io = io
    this.gameState = gameState
    this.lastTickTime = Date.now()
    this.tickRate = 1000 / GAME_CONFIG.NETWORK.TICK_RATE
    this.isRunning = false
  }

  // Start game loop
  start() {
    if (this.isRunning) return

    this.isRunning = true
    this.lastTickTime = Date.now()

    this.tickInterval = setInterval(() => {
      this.tick()
    }, this.tickRate)

    console.log(`Game loop started: ${GAME_CONFIG.NETWORK.TICK_RATE} ticks/s`)
  }

  // Stop game loop
  stop() {
    if (!this.isRunning) return

    this.isRunning = false
    clearInterval(this.tickInterval)

    console.log('Game loop stopped')
  }

  // Main game tick
  tick() {
    const now = Date.now()
    const deltaMs = now - this.lastTickTime
    const deltaSeconds = deltaMs / 1000
    this.lastTickTime = now

    // Update game state
    this.gameState.update(deltaSeconds)

    // Broadcast state to all clients
    this.broadcastState()
  }

  // Broadcast game state to all connected clients
  broadcastState() {
    const state = this.gameState.getStateSnapshot()
    this.io.emit('state', state)
  }
}
