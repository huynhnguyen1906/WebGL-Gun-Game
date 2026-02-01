/**
 * Game Map (Server-side)
 * Simple map validator for server
 */
import { GAME_CONFIG } from '../config/gameConfig.js'

export class GameMap {
  constructor() {
    this.size = GAME_CONFIG.MAP.SIZE
    this.padding = GAME_CONFIG.MAP.PADDING
  }

  // Check if position is valid (within map bounds)
  isValidPosition(x, y) {
    return x >= this.padding && x <= this.size - this.padding && y >= this.padding && y <= this.size - this.padding
  }

  // Get random valid position
  getRandomValidPosition() {
    const minPos = this.padding
    const maxPos = this.size - this.padding

    return {
      x: minPos + Math.random() * (maxPos - minPos),
      y: minPos + Math.random() * (maxPos - minPos),
    }
  }
}
