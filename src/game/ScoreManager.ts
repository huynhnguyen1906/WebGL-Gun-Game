/**
 * Score Manager
 *
 * Quản lý điểm số của player.
 * Tách riêng để dễ replace bằng server-side scoring khi online.
 *
 * Khi chuyển sang online:
 * - Server sẽ validate và track điểm
 * - Client chỉ nhận điểm từ server và hiển thị
 */

export interface ScoreEntry {
  playerId: string
  name: string
  score: number
}

export class ScoreManager {
  private score: number = 0
  private playerId: string
  private playerName: string

  constructor(playerId: string = 'local', playerName: string = 'You') {
    this.playerId = playerId
    this.playerName = playerName
  }

  // Add points (called when killing an enemy)
  addScore(points: number): void {
    this.score += points
  }

  // Get current score
  getScore(): number {
    return this.score
  }

  // Reset score (called on respawn or new game)
  reset(): void {
    this.score = 0
  }

  // Get leaderboard entry for this player
  getEntry(): ScoreEntry {
    return {
      playerId: this.playerId,
      name: this.playerName,
      score: this.score,
    }
  }

  // For future: Get full leaderboard (will be from server)
  getLeaderboard(): ScoreEntry[] {
    // Currently just returns local player
    // In online mode, this will be populated from server
    return [this.getEntry()]
  }
}
