/**
 * Multiplayer Network Manager
 * Handles all client-server communication via Socket.IO
 *
 * Architecture:
 * - Client sends inputs (movement, shooting)
 * - Server broadcasts game state (player positions, HP)
 * - Client prediction for smooth movement
 * - Server authority for damage and HP
 */
import { Socket, io } from 'socket.io-client'

// Type definitions for network messages
export interface InitData {
  playerId: number
  player: PlayerData
  players: PlayerData[]
  boxes?: Array<{
    id: number
    x: number
    y: number
    hp: number
    radius: number
    content: { type: 'weapon'; weaponType: string } | { type: 'healing' }
    isDestroyed: boolean
  }>
  pillars?: Array<{
    id: number
    x: number
    y: number
    radius: number
  }>
  items?: ItemData[]
  config?: unknown
}

export interface ItemData {
  id: number
  type: 'weapon' | 'healing'
  weaponType?: string
  x: number
  y: number
  magazine?: number
  reserve?: number
}

export interface PlayerData {
  id: number
  x: number
  y: number
  rotation: number
  direction?: 'up' | 'down' | 'left' | 'right'
  isMoving?: boolean
  hp: number
}

export interface StateData {
  players: PlayerData[]
  timestamp?: number
}

export interface BulletData {
  bullets: Array<{
    id: string
    x: number
    y: number
    vx: number
    vy: number
    rotation: number
    damage: number
    weapon: string
    range: number
    speed: number
    spawnTime: number
  }>
  playerId: number
}

export interface DamageData {
  targetId: number
  attackerId: number
  damage: number
  hp: number
}

export interface PositionData {
  x: number
  y: number
  rotation: number
  direction: 'up' | 'down' | 'left' | 'right'
  isMoving: boolean
}

export class NetworkManager {
  private socket: Socket | null
  private connected: boolean
  private playerId: number | null
  private serverUrl: string

  // Callbacks
  public onInit: ((data: InitData) => void) | null
  public onPlayerJoined: ((player: PlayerData) => void) | null
  public onPlayerLeft: ((playerId: number) => void) | null
  public onPlayerMoved: ((player: PlayerData) => void) | null
  public onWeaponChanged: ((data: { playerId: number; weapon: string }) => void) | null
  public onStateUpdate: ((state: StateData) => void) | null
  public onBullets: ((data: BulletData) => void) | null
  public onDamage: ((data: DamageData) => void) | null
  public onPlayerDied: ((data: { playerId: number; killerId: number }) => void) | null
  public onPlayerRespawned: ((data: { playerId: number; x: number; y: number; hp: number }) => void) | null
  public onPlayerHealed: ((data: { playerId: number; hp: number; maxHp: number }) => void) | null
  public onItemPicked: ((data: { itemId: number; playerId: number }) => void) | null
  public onInventoryUpdate: ((data: { inventory: unknown; currentWeapon: string }) => void) | null
  public onReloadComplete: ((data: { weapon: string; magazine: number; reserve: number }) => void) | null
  public onAmmoUpdate: ((data: { weapon: string; magazine: number; reserve: number }) => void) | null
  public onBoxDamaged: ((data: { boxId: number; hp: number; isDestroyed: boolean }) => void) | null
  public onItemDropped: ((item: ItemData) => void) | null
  public onBulletDestroyed: ((data: { bulletId: string; playerId: number }) => void) | null

  constructor() {
    this.socket = null
    this.connected = false
    this.playerId = null
    this.serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

    this.onInit = null
    this.onPlayerJoined = null
    this.onPlayerLeft = null
    this.onPlayerMoved = null
    this.onWeaponChanged = null
    this.onStateUpdate = null
    this.onBullets = null
    this.onDamage = null
    this.onPlayerDied = null
    this.onPlayerRespawned = null
    this.onPlayerHealed = null
    this.onItemPicked = null
    this.onInventoryUpdate = null
    this.onReloadComplete = null
    this.onAmmoUpdate = null
    this.onBoxDamaged = null
    this.onItemDropped = null
    this.onBulletDestroyed = null
  }

  // Connect to server
  connect(): Promise<InitData> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
      })

      this.socket.on('connect', () => {
        console.log('🌐 Connected to server:', this.socket?.id)
        this.connected = true
      })

      this.socket.on('init', (data: InitData) => {
        console.log('🎮 Game initialized:', data)
        this.playerId = data.playerId

        if (this.onInit) {
          this.onInit(data)
        }

        resolve(data)
      })

      this.socket.on('player_joined', (player: PlayerData) => {
        console.log('👤 Player joined:', player.id)
        if (this.onPlayerJoined) {
          this.onPlayerJoined(player)
        }
      })

      this.socket.on('player:moved', (player: PlayerData) => {
        if (this.onPlayerMoved) {
          this.onPlayerMoved(player)
        }
      })

      this.socket.on('weapon_changed', (data: { playerId: number; weapon: string }) => {
        if (this.onWeaponChanged) {
          this.onWeaponChanged(data)
        }
      })

      this.socket.on('player_left', (data: { playerId: number }) => {
        console.log('👋 Player left:', data.playerId)
        if (this.onPlayerLeft) {
          this.onPlayerLeft(data.playerId)
        }
      })

      this.socket.on('state', (state: StateData) => {
        if (this.onStateUpdate) {
          this.onStateUpdate(state)
        }
      })

      this.socket.on('bullets', (data: BulletData) => {
        if (this.onBullets) {
          this.onBullets(data)
        }
      })

      this.socket.on('damage', (data: DamageData) => {
        console.log(
          `💥 Damage: Player ${data.attackerId} -> Player ${data.targetId} (${data.damage} dmg, ${data.hp} HP)`
        )
        if (this.onDamage) {
          this.onDamage(data)
        }
      })

      this.socket.on('player_died', (data: { playerId: number; killerId: number }) => {
        console.log(`💀 Player ${data.playerId} died. Killed by Player ${data.killerId}`)
        if (this.onPlayerDied) {
          this.onPlayerDied(data)
        }
      })

      this.socket.on('player_respawned', (data: { playerId: number; x: number; y: number; hp: number }) => {
        console.log(`♻️ Player ${data.playerId} respawned at (${data.x}, ${data.y})`)
        if (this.onPlayerRespawned) {
          this.onPlayerRespawned(data)
        }
      })

      this.socket.on('player_healed', (data: { playerId: number; hp: number; maxHp: number }) => {
        if (this.onPlayerHealed) {
          this.onPlayerHealed(data)
        }
      })

      this.socket.on('item_picked', (data: { itemId: number; playerId: number }) => {
        if (this.onItemPicked) {
          this.onItemPicked(data)
        }
      })

      this.socket.on('inventory_update', (data: { inventory: unknown; currentWeapon: string }) => {
        if (this.onInventoryUpdate) {
          this.onInventoryUpdate(data)
        }
      })

      this.socket.on('reload_complete', (data: { weapon: string; magazine: number; reserve: number }) => {
        if (this.onReloadComplete) {
          this.onReloadComplete(data)
        }
      })

      this.socket.on('ammo_update', (data: { weapon: string; magazine: number; reserve: number }) => {
        if (this.onAmmoUpdate) {
          this.onAmmoUpdate(data)
        }
      })

      this.socket.on('box_damaged', (data: { boxId: number; hp: number; isDestroyed: boolean }) => {
        if (this.onBoxDamaged) {
          this.onBoxDamaged(data)
        }
      })

      this.socket.on('item_dropped', (item: ItemData) => {
        if (this.onItemDropped) {
          this.onItemDropped(item)
        }
      })

      this.socket.on('bullet_destroyed', (data: { bulletId: string; playerId: number }) => {
        console.log(`🔌 NetworkManager received bullet_destroyed event:`, data)
        if (this.onBulletDestroyed) {
          console.log('✅ Calling onBulletDestroyed callback')
          this.onBulletDestroyed(data)
        } else {
          console.warn('⚠️ onBulletDestroyed callback is NULL!')
        }
      })

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from server')
        this.connected = false
      })

      this.socket.on('connect_error', (error: Error) => {
        console.error('Connection error:', error)
        reject(error)
      })

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'))
        }
      }, 5000)
    })
  }

  // Send player position to server
  sendPosition(position: PositionData): void {
    if (!this.connected) return
    this.socket?.emit('player:move', position)
  }

  // Send weapon switch to server
  sendWeaponSwitch(weapon: string): void {
    if (!this.connected) return
    this.socket?.emit('weapon_switch', { weapon })
  }

  // Send shoot event
  sendShoot(weapon: string, angle: number): void {
    if (!this.connected) return
    this.socket?.emit('shoot', { weapon, angle })
  }

  // Send hit validation
  sendHit(bulletId: string, targetId: number, damage: number): void {
    if (!this.connected) return
    this.socket?.emit('hit', { bulletId, targetId, damage })
  }

  // Request respawn
  sendRespawn(): void {
    if (!this.connected) return
    this.socket?.emit('respawn')
  }

  // Send item pickup request
  sendPickupItem(itemId: number): void {
    if (!this.connected) return
    this.socket?.emit('pickup_item', { itemId })
  }

  // Send reload request
  sendReload(weapon: string): void {
    if (!this.connected) return
    this.socket?.emit('reload', { weapon })
  }

  // Send box damage
  sendBoxDamage(boxId: number, damage: number): void {
    if (!this.connected) return
    this.socket?.emit('box_damage', { boxId, damage })
  }

  // Send heal event
  sendHeal(amount: number): void {
    if (!this.connected) return
    this.socket?.emit('heal', { amount })
  }

  // Send bullet destroyed notification
  sendBulletDestroyed(bulletId: string): void {
    if (!this.connected) return
    this.socket?.emit('bullet_destroyed', { bulletId })
  }

  // Disconnect from server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.connected
  }

  // Get player ID
  getPlayerId(): number | null {
    return this.playerId
  }
}
