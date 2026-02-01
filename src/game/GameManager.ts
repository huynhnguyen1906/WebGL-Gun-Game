import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'
import { HEALING_CONFIG, WEAPONS, WeaponType, type WeaponTypeValue } from '../config/serverConfig'
import { ActiveItemDisplay } from './ActiveItemDisplay'
import { BaseEntity } from './BaseEntity'
import { Camera } from './Camera'
import { CollisionManager } from './CollisionManager'
import { DummyManager } from './DummyManager'
import { DummyPlayer } from './DummyPlayer'
import { GameOverUI } from './GameOverUI'
import { HealingChannelUI } from './HealingChannelUI'
import { HotbarUI } from './HotbarUI'
import { InputManager } from './InputManager'
import { HealingPickup, ItemType, WeaponPickup } from './ItemPickup'
import { ItemSpawnManager } from './ItemSpawnManager'
import { GameMap } from './Map'
import { MiniMap } from './MiniMap'
import {
  type BulletData,
  type DamageData,
  type InitData,
  type ItemData,
  NetworkManager,
  type PlayerData,
  type StateData,
} from './NetworkManager'
import { PickupPromptUI } from './PickupPromptUI'
import { Player } from './Player'
import { PlayerInventory, type SlotTypeValue } from './PlayerInventory'
import { ReloadUI } from './ReloadUI'
import { RemotePlayer } from './RemotePlayer'
import { ScoreUI } from './ScoreUI'
import { ServerBoxManager } from './ServerBoxManager'

export class GameManager {
  private app: PIXI.Application
  private gameMap: GameMap
  private player: Player
  private camera: Camera
  private inputManager: InputManager
  private hotbarUI: HotbarUI
  private activeItemDisplay: ActiveItemDisplay
  private scoreUI: ScoreUI
  private gameOverUI: GameOverUI
  private dummyManager: DummyManager | null = null
  private collisionManager: CollisionManager
  private itemSpawnManager: ItemSpawnManager | null = null
  private serverBoxManager: ServerBoxManager | null = null
  private playerInventory: PlayerInventory
  private pickupPromptUI: PickupPromptUI
  private healingChannelUI: HealingChannelUI
  private reloadUI: ReloadUI
  private miniMap: MiniMap
  private networkManager: NetworkManager | null = null
  private remotePlayers: Map<number, RemotePlayer> = new Map()
  private isMultiplayer: boolean = false
  private worldContainer: PIXI.Container
  private uiContainer: PIXI.Container
  private lastTime: number = 0
  private isGameOver: boolean = false
  private lastMeleeAttackTime: number = 0
  private lastShootTime: number = 0 // Track shooting cooldown
  private sentHits: Set<string> = new Set() // Track sent hits to prevent duplicates
  private destroyedBullets: Set<string> = new Set() // Track destroyed bullets to prevent duplicate broadcasts

  constructor(app: PIXI.Application, multiplayer: boolean = false) {
    this.app = app
    this.isMultiplayer = multiplayer
    this.worldContainer = new PIXI.Container()
    this.app.stage.addChild(this.worldContainer)

    // Create UI container (separate from world for fixed positioning)
    this.uiContainer = new PIXI.Container()
    this.app.stage.addChild(this.uiContainer)

    // Create map
    this.gameMap = new GameMap()
    this.worldContainer.addChild(this.gameMap.getContainer())

    // Create player at random position
    const spawnPos = this.gameMap.getRandomValidPosition()
    this.player = new Player(spawnPos.x, spawnPos.y)
    this.worldContainer.addChild(this.player.getContainer())

    // Create camera
    this.camera = new Camera(this.worldContainer, this.app.screen.width, this.app.screen.height)

    // Create input manager
    this.inputManager = new InputManager(this.app.canvas as HTMLCanvasElement)

    // Create collision manager
    this.collisionManager = new CollisionManager()

    // Multiplayer mode: disable bots and items, will be controlled by server
    if (!this.isMultiplayer) {
      // Single player mode: spawn bots and items
      this.dummyManager = new DummyManager(this.gameMap, this.worldContainer)
      this.dummyManager.spawnInitialDummies(this.player.x, this.player.y)

      this.itemSpawnManager = new ItemSpawnManager(this.gameMap, this.worldContainer)
      this.itemSpawnManager.spawnInitialItems(this.player.x, this.player.y, 500)
    } else {
      // Multiplayer mode: use server-side boxes and items
      this.serverBoxManager = new ServerBoxManager(this.worldContainer)
    }

    // Create player inventory and set to hotbar
    this.playerInventory = new PlayerInventory()

    // Create UI elements
    this.hotbarUI = new HotbarUI(this.app.screen.width, this.app.screen.height)
    this.hotbarUI.setInventory(this.playerInventory)
    this.uiContainer.addChild(this.hotbarUI.getContainer())

    this.activeItemDisplay = new ActiveItemDisplay()
    this.activeItemDisplay.setInventory(this.playerInventory)
    this.activeItemDisplay.updatePosition(this.app.screen.width, this.app.screen.height)
    this.uiContainer.addChild(this.activeItemDisplay.getContainer())

    this.scoreUI = new ScoreUI(this.app.screen.width)
    this.uiContainer.addChild(this.scoreUI.getContainer())

    this.gameOverUI = new GameOverUI(this.app.screen.width, this.app.screen.height)
    this.uiContainer.addChild(this.gameOverUI.getContainer())

    this.pickupPromptUI = new PickupPromptUI()
    this.worldContainer.addChild(this.pickupPromptUI.getContainer())

    this.healingChannelUI = new HealingChannelUI()
    this.worldContainer.addChild(this.healingChannelUI.getContainer())

    this.reloadUI = new ReloadUI()
    this.worldContainer.addChild(this.reloadUI.getContainer())

    this.miniMap = new MiniMap(this.app.screen.width, this.app.screen.height)
    this.uiContainer.addChild(this.miniMap.getContainer())

    // Connect respawn callback
    this.gameOverUI.setRespawnCallback(() => {
      this.respawnPlayer()
    })

    // Setup game loop
    this.app.ticker.add(this.gameLoop)

    // Handle resize
    window.addEventListener('resize', this.onResize)

    // Initialize multiplayer if enabled
    if (this.isMultiplayer) {
      this.initMultiplayer().catch((error) => {
        console.error('Failed to initialize multiplayer:', error)
        alert('Could not connect to server. Starting in offline mode.')
        this.isMultiplayer = false
        // Spawn bots and items for offline mode
        this.dummyManager = new DummyManager(this.gameMap, this.worldContainer)
        this.dummyManager.spawnInitialDummies(this.player.x, this.player.y)
        this.itemSpawnManager = new ItemSpawnManager(this.gameMap, this.worldContainer)
        this.itemSpawnManager.spawnInitialItems(this.player.x, this.player.y, 500)
      })
    }
  }

  // Initialize multiplayer connection
  private async initMultiplayer(): Promise<void> {
    this.networkManager = new NetworkManager()

    // Setup callbacks
    this.networkManager.onInit = async (data: InitData) => {
      console.log('🎮 Multiplayer initialized!')
      console.log('My player ID:', data.playerId)
      console.log('My position:', data.player)
      console.log('Other players count:', data.players.length)
      console.log('Other players data:', data.players)

      // Spawn other players (server already filters out self)
      for (const playerData of data.players) {
        console.log(`📍 Spawning remote player ${playerData.id} at (${playerData.x}, ${playerData.y})`)
        this.spawnRemotePlayer(playerData)
      }

      // Load boxes, pillars, and items from server
      if (this.serverBoxManager) {
        if (data.boxes && data.pillars) {
          await this.serverBoxManager.initBoxesAndPillars(data.boxes, data.pillars)
        }
        if (data.items) {
          await this.serverBoxManager.initItems(data.items)
        }
      }

      console.log('✅ Remote players spawned:', this.remotePlayers.size)
    }

    this.networkManager.onPlayerJoined = (playerData: PlayerData) => {
      console.log(`👥 New player joined: ID ${playerData.id} at (${playerData.x}, ${playerData.y})`)
      this.spawnRemotePlayer(playerData)
    }

    this.networkManager.onPlayerMoved = (playerData: PlayerData) => {
      // Update specific remote player position
      const remotePlayer = this.remotePlayers.get(playerData.id)
      if (remotePlayer) {
        remotePlayer.updateFromServer(
          playerData.x,
          playerData.y,
          playerData.rotation,
          playerData.direction,
          playerData.isMoving
        )
      }
    }

    this.networkManager.onPlayerLeft = (playerId: number) => {
      console.log(`👋 Player left: ID ${playerId}`)
      this.removeRemotePlayer(playerId)
    }

    this.networkManager.onStateUpdate = (state: StateData) => {
      // Fallback: Only update remote players from state if needed (for initial sync)
      // Primary updates come from player:moved events
      this.updateRemotePlayers(state.players)
    }

    this.networkManager.onBullets = (data: BulletData) => {
      console.log(
        `📦 Received bullets event: playerId=${data.playerId}, myId=${this.networkManager?.getPlayerId()}, bulletCount=${data.bullets.length}`
      )

      // Check if bullets are from local player or remote player
      if (data.playerId === this.networkManager?.getPlayerId()) {
        // Local player bullets from server (authoritative)
        console.log('↩️ Local player bullets (skipping client-side creation)')
        // Clear client prediction bullets and use server bullets instead
        for (const bulletData of data.bullets) {
          const bullet = this.player.createBulletFromServer(bulletData)
          this.worldContainer.addChild(bullet.getGraphics())
        }
      } else {
        // Remote player bullets
        console.log(`👤 Remote player ${data.playerId} bullets`)
        const remotePlayer = this.remotePlayers.get(data.playerId)
        if (remotePlayer) {
          console.log(`✅ Remote player found, creating ${data.bullets.length} bullets`)
          for (const bulletData of data.bullets) {
            const bullet = remotePlayer.createBulletFromServer(bulletData)
            console.log(`🔫 Created remote bullet: id=${bulletData.id}, x=${bulletData.x}, y=${bulletData.y}`)
            this.worldContainer.addChild(bullet.getGraphics())
          }
          console.log(`📊 Remote player now has ${remotePlayer.bullets.length} total bullets`)
        } else {
          console.error(`❌ Remote player ${data.playerId} NOT FOUND!`)
          console.log('Available remote players:', Array.from(this.remotePlayers.keys()))
        }
      }
    }

    this.networkManager.onWeaponChanged = (data: { playerId: number; weapon: string }) => {
      const remotePlayer = this.remotePlayers.get(data.playerId)
      if (remotePlayer) {
        remotePlayer.setCurrentWeapon(data.weapon)
      }
    }

    this.networkManager.onDamage = (data: DamageData) => {
      // Apply damage to local or remote player
      if (data.targetId === this.networkManager?.getPlayerId()) {
        // Damage to local player
        this.player.takeDamage(data.damage)

        // Check if local player died
        if (this.player.getHp() <= 0) {
          this.handleLocalPlayerDeath()
        }
      } else {
        // Damage to remote player
        const remotePlayer = this.remotePlayers.get(data.targetId)
        if (remotePlayer) {
          remotePlayer.takeDamage(data.damage)
        }
      }
    }

    this.networkManager.onPlayerDied = (data: { playerId: number; killerId: number }) => {
      // Handle remote player death
      const remotePlayer = this.remotePlayers.get(data.playerId)
      if (remotePlayer) {
        remotePlayer.setDead(true)
        // Fade out animation then hide
        this.fadeOutEntity(remotePlayer.getContainer(), () => {
          remotePlayer.getContainer().visible = false
        })
        console.log(`Player ${data.playerId} was killed by Player ${data.killerId}`)
      }
    }

    this.networkManager.onPlayerRespawned = (data: { playerId: number; x: number; y: number; hp: number }) => {
      if (data.playerId === this.networkManager?.getPlayerId()) {
        // Local player respawned
        this.player.respawn(data.x, data.y)
        this.isGameOver = false
        this.gameOverUI.hide()
        this.player.getContainer().alpha = 1.0
        this.player.getContainer().visible = true
        console.log('You respawned!')
      } else {
        // Remote player respawned
        const remotePlayer = this.remotePlayers.get(data.playerId)
        if (remotePlayer) {
          remotePlayer.respawn(data.x, data.y)
          remotePlayer.setDead(false)
          remotePlayer.getContainer().alpha = 1.0
          remotePlayer.getContainer().visible = true
          console.log(`Player ${data.playerId} respawned`)
        }
      }
    }

    this.networkManager.onPlayerHealed = (data: { playerId: number; hp: number; maxHp: number }) => {
      if (data.playerId === this.networkManager?.getPlayerId()) {
        // Local player healed - update HP bar
        this.player.setHp(data.hp)
      } else {
        // Remote player healed
        const remotePlayer = this.remotePlayers.get(data.playerId)
        if (remotePlayer) {
          remotePlayer.setHp(data.hp)
        }
      }
    }

    this.networkManager.onItemPicked = (data: { itemId: number; playerId: number }) => {
      // Remove item from world
      if (this.serverBoxManager) {
        this.serverBoxManager.removeItem(data.itemId)
      }
    }

    this.networkManager.onInventoryUpdate = (data: { inventory: unknown; currentWeapon: string }) => {
      // Sync inventory from server
      const inventory = data.inventory as {
        primary: { id: string; magazine: number; reserve: number } | null
        pistol: { id: string; magazine: number; reserve: number } | null
        healing: number
      }

      // Update primary weapon
      if (inventory.primary) {
        this.playerInventory.addWeapon(
          inventory.primary.id as WeaponTypeValue,
          inventory.primary.magazine,
          inventory.primary.reserve
        )
      }

      // Update pistol
      if (inventory.pistol) {
        this.playerInventory.addWeapon(
          inventory.pistol.id as WeaponTypeValue,
          inventory.pistol.magazine,
          inventory.pistol.reserve
        )
      }

      // Update healing count
      if (inventory.healing > 0) {
        // Reset and add healing items
        const healingSlot = this.playerInventory['slots'].get(3) // SlotType.HEALING
        if (healingSlot) {
          healingSlot.healingCount = inventory.healing
        }
      }

      // IMPORTANT: Switch to weapon AFTER adding it to inventory
      const weaponData = WEAPONS.find((w) => w.id === data.currentWeapon)
      if (weaponData) {
        // Update player weapon first (pass ID, not entire object)
        this.player.setWeapon(weaponData.id)

        // Then switch to correct slot
        if (weaponData.id === WeaponType.PISTOL) {
          this.playerInventory.switchToSlot(2) // SlotType.SECONDARY
        } else if (weaponData.isMelee) {
          this.playerInventory.switchToSlot(4) // SlotType.FIST
        } else {
          this.playerInventory.switchToSlot(1) // SlotType.PRIMARY
        }

        // Broadcast weapon change to server in multiplayer
        if (this.isMultiplayer && this.networkManager?.isConnected()) {
          this.networkManager.sendWeaponSwitch(weaponData.id)
        }
      }

      // Force immediate UI update
      this.hotbarUI.updateDisplay()
      this.activeItemDisplay.updateDisplay()
    }

    this.networkManager.onBoxDamaged = (data: { boxId: number; hp: number; isDestroyed: boolean }) => {
      if (this.serverBoxManager) {
        this.serverBoxManager.damageBox(data.boxId, data.hp, data.isDestroyed)
      }
    }

    this.networkManager.onItemDropped = async (item: ItemData) => {
      if (this.serverBoxManager) {
        await this.serverBoxManager.spawnItem(item)
      }
    }

    this.networkManager.onReloadComplete = (data: { weapon: string; magazine: number; reserve: number }) => {
      // Update ammo display
      const currentWeapon = this.playerInventory.getCurrentWeapon()
      if (currentWeapon && currentWeapon.id === data.weapon) {
        const ammo = this.playerInventory.getCurrentAmmo()
        if (ammo) {
          ammo.magazine = data.magazine
          ammo.reserve = data.reserve
          this.hotbarUI.updateDisplay()
          this.activeItemDisplay.updateDisplay()
        }
      }
      // Hide reload UI
      this.reloadUI.stopReload()
    }

    this.networkManager.onAmmoUpdate = (data: { weapon: string; magazine: number; reserve: number }) => {
      // Update ammo after shooting
      const currentWeapon = this.playerInventory.getCurrentWeapon()
      if (currentWeapon && currentWeapon.id === data.weapon) {
        const ammo = this.playerInventory.getCurrentAmmo()
        if (ammo) {
          ammo.magazine = data.magazine
          ammo.reserve = data.reserve
          this.hotbarUI.updateDisplay()
          this.activeItemDisplay.updateDisplay()
        }
      }
    }

    this.networkManager.onBulletDestroyed = (data: { bulletId: string; playerId: number }) => {
      console.log(
        `📥 Received bullet_destroyed: bulletId=${data.bulletId}, shooterId=${data.playerId}, myId=${this.networkManager?.getPlayerId()}`
      )

      // Destroy bullet from remote player
      if (data.playerId === this.networkManager?.getPlayerId()) {
        // Don't destroy local bullets (already handled locally)
        console.log('⏭️ Skipping local bullet destruction (already handled)')
        return
      }

      const remotePlayer = this.remotePlayers.get(data.playerId)
      if (remotePlayer) {
        console.log(
          `🔍 Searching for bullet in remote player ${data.playerId}, total bullets: ${remotePlayer.bullets.length}`
        )
        const bullet = remotePlayer.bullets.find((b) => b.id === data.bulletId)
        if (bullet) {
          console.log(`✅ Found and destroying bullet ${data.bulletId}`)
          bullet.onHit()
        } else {
          console.log(`⏳ Bullet ${data.bulletId} not found yet, scheduling retry...`)
          // Bullet might not be created yet due to network timing
          // Retry after a short delay
          setTimeout(() => {
            const retryBullet = remotePlayer.bullets.find((b) => b.id === data.bulletId)
            if (retryBullet) {
              console.log(`✅ Found bullet on retry, destroying ${data.bulletId}`)
              retryBullet.onHit()
            } else {
              console.log(`❌ Bullet ${data.bulletId} not found even after retry`)
              console.log(
                'Available bullet IDs:',
                remotePlayer.bullets.map((b) => b.id)
              )
            }
          }, 50) // Wait 50ms for bullet creation
        }
      } else {
        console.log(`❌ Remote player ${data.playerId} not found`)
      }
    }

    // Connect to server
    await this.networkManager.connect()
  }

  // Handle local player death
  private handleLocalPlayerDeath(): void {
    console.log('You died!')
    this.isGameOver = true

    // Show game over UI
    this.gameOverUI.show()

    // Fade out player
    this.fadeOutEntity(this.player.getContainer())

    // Auto-respawn after 3 seconds in multiplayer
    setTimeout(() => {
      if (this.networkManager?.isConnected()) {
        this.networkManager.sendRespawn()
      }
    }, 3000)
  }

  // Spawn remote player
  private spawnRemotePlayer(playerData: PlayerData): void {
    console.log(`🌟 Spawning remote player ${playerData.id} at (${playerData.x}, ${playerData.y})`)
    const remotePlayer = new RemotePlayer(playerData.id, playerData.x, playerData.y)
    this.remotePlayers.set(playerData.id, remotePlayer)
    this.worldContainer.addChild(remotePlayer.getContainer())
    console.log(`✅ Remote player ${playerData.id} spawned successfully`)
    console.log(`📋 All remote players:`, Array.from(this.remotePlayers.keys()))
  }

  // Remove remote player
  private removeRemotePlayer(playerId: number): void {
    const remotePlayer = this.remotePlayers.get(playerId)
    if (remotePlayer) {
      remotePlayer.destroy()
      this.remotePlayers.delete(playerId)
      console.log('Remote player removed:', playerId)
    }
  }

  // Update remote players from server state
  private updateRemotePlayers(players: PlayerData[]): void {
    for (const playerState of players) {
      // Skip self
      if (playerState.id === this.networkManager?.getPlayerId()) continue

      const remotePlayer = this.remotePlayers.get(playerState.id)
      if (remotePlayer) {
        // Update HP from state (position comes from player:moved events)
        if (playerState.hp !== undefined) {
          remotePlayer.setHp(playerState.hp)
        }
      } else {
        // Player not found, might be a new player that joined
        console.warn(`Remote player ${playerState.id} not found in remotePlayers map`)
      }
    }
  }

  private gameLoop = (): void => {
    // Calculate delta time in seconds
    const currentTime = performance.now()
    let deltaMs = currentTime - this.lastTime
    if (this.lastTime === 0) deltaMs = 0
    this.lastTime = currentTime

    // Clamp delta time to avoid jitter
    deltaMs = Math.min(deltaMs, GAME_CONFIG.TICK.MAX_DT_MS)
    const deltaSeconds = deltaMs / 1000

    this.update(deltaSeconds, currentTime)
  }

  private update(deltaSeconds: number, currentTime: number): void {
    // Don't update game if game over
    if (this.isGameOver) {
      return
    }

    // Handle slot switching (1-4 keys)
    const numberKey = this.inputManager.getPressedNumberKey()
    if (numberKey !== null && numberKey >= 1 && numberKey <= 4) {
      const switched = this.playerInventory.switchToSlot(numberKey as SlotTypeValue)
      if (switched) {
        // Update player weapon
        const weapon = this.playerInventory.getCurrentWeapon()
        if (weapon) {
          this.player.setWeapon(weapon.id)

          // Send weapon switch to server in multiplayer
          if (this.isMultiplayer && this.networkManager?.isConnected()) {
            this.networkManager.sendWeaponSwitch(weapon.id)
          }
        }
        // Update UI
        this.hotbarUI.updateDisplay()
        this.activeItemDisplay.updateDisplay()
      }
    }

    // Handle reload (R key)
    if (this.inputManager.wasRPressed() && !this.reloadUI.isActive()) {
      const weapon = this.playerInventory.getCurrentWeapon()
      if (weapon && weapon.reloadTimeMs) {
        const ammo = this.playerInventory.getCurrentAmmo()
        // Check if can reload
        if (ammo && ammo.magazine < (weapon.magazineSize || 0) && (ammo.reserve > 0 || weapon.infiniteAmmo)) {
          // Start reload animation
          this.reloadUI.startReload(currentTime, weapon.reloadTimeMs)

          // Send reload request to server in multiplayer
          if (this.isMultiplayer && this.networkManager?.isConnected()) {
            this.networkManager.sendReload(weapon.id)
          }
        }
      }
    }

    // Update reload progress
    if (this.reloadUI.isActive()) {
      const reloadComplete = this.reloadUI.updateReload(currentTime, this.player.x, this.player.y)
      if (reloadComplete && !this.isMultiplayer) {
        // Actually reload (single player only, multiplayer handled by server)
        this.playerInventory.reload(this.playerInventory.currentSlot)
        this.hotbarUI.updateDisplay()
        this.activeItemDisplay.updateDisplay()
      }
    }

    // Update player rotation (face mouse)
    const worldMouse = this.inputManager.screenToWorld(
      this.inputManager.mouseX,
      this.inputManager.mouseY,
      this.worldContainer.x,
      this.worldContainer.y
    )
    const angle = Math.atan2(worldMouse.y - this.player.y, worldMouse.x - this.player.x)
    this.player.setRotation(angle)

    // Track player movement
    const movement = this.inputManager.getMovementVector()
    const isMoving = movement.x !== 0 || movement.y !== 0

    // Update player movement (client prediction)
    this.player.move(deltaSeconds, movement.x, movement.y, (x, y, r) => this.gameMap.clampPosition(x, y, r))

    // Check box and pillar collisions BEFORE sending position to server
    // This ensures we send the corrected position after collision resolution
    this.checkBoxEntityCollisions()
    this.checkPillarEntityCollisions()

    // Send position to server in multiplayer mode (every frame like reference)
    if (this.isMultiplayer && this.networkManager?.isConnected()) {
      // Determine direction based on last movement
      let direction: 'up' | 'down' | 'left' | 'right' = 'down'
      if (movement.y < 0) direction = 'up'
      else if (movement.y > 0) direction = 'down'
      else if (movement.x < 0) direction = 'left'
      else if (movement.x > 0) direction = 'right'

      this.networkManager.sendPosition({
        x: this.player.x,
        y: this.player.y,
        rotation: angle,
        direction,
        isMoving,
      })
    }

    // Check if player moved during healing
    if (this.healingChannelUI.isActive() && isMoving) {
      this.healingChannelUI.stopChannel()
    }

    // Handle healing channel
    if (this.healingChannelUI.isActive()) {
      const healComplete = this.healingChannelUI.updateChannel(currentTime, this.player.x, this.player.y)
      if (healComplete) {
        // Apply healing from config
        this.player.heal(HEALING_CONFIG.HEAL_AMOUNT)
        // Consume healing item
        this.playerInventory.useHealing()
        this.hotbarUI.updateDisplay()

        // Send heal event to server in multiplayer
        if (this.isMultiplayer && this.networkManager?.isConnected()) {
          this.networkManager.sendHeal(HEALING_CONFIG.HEAL_AMOUNT)
        }
      }
    }

    // Handle healing activation (slot 3 + mouse click)
    if (
      this.playerInventory.isCurrentSlotHealing() &&
      this.inputManager.isMouseDown &&
      !this.healingChannelUI.isActive()
    ) {
      const healingCount = this.playerInventory.getHealingCount()
      if (healingCount > 0 && !isMoving) {
        // Start healing channel
        this.healingChannelUI.startChannel(currentTime)
      }
    }

    // Update dummy manager with player position (only in single player)
    if (!this.isMultiplayer && this.dummyManager) {
      this.dummyManager.updatePlayerPosition(this.player.x, this.player.y)
    }

    // Update remote players (only in multiplayer)
    if (this.isMultiplayer) {
      for (const remotePlayer of this.remotePlayers.values()) {
        remotePlayer.update(deltaSeconds)
      }
    }

    // Handle attack/shooting
    if (this.inputManager.isMouseDown && !this.healingChannelUI.isActive()) {
      const isOverHotbar = this.hotbarUI.isPointInside(this.inputManager.mouseX, this.inputManager.mouseY)
      if (!isOverHotbar) {
        // Check if melee or ranged
        if (this.playerInventory.isCurrentSlotMelee()) {
          // Melee attack
          if (this.isMultiplayer) {
            // In multiplayer, send to server for hit validation
            const weapon = this.playerInventory.getCurrentWeapon()
            if (weapon) {
              this.networkManager?.sendShoot(weapon.id, angle)
            }

            // Still play animation locally (no damage, just visual)
            const emptyEntities: BaseEntity[] = [] // Don't damage players locally in multiplayer
            this.player.tryMeleeAttack(worldMouse.x, worldMouse.y, currentTime, emptyEntities)
          } else {
            // Single player - hit entities locally
            const allEntities: BaseEntity[] = [this.player, ...this.dummyManager!.getAliveDummies()]
            this.player.tryMeleeAttack(worldMouse.x, worldMouse.y, currentTime, allEntities)
          }

          // Check box melee attack
          if (currentTime - this.lastMeleeAttackTime >= 500) {
            this.checkMeleeBoxAttack()
            this.lastMeleeAttackTime = currentTime
          }
        } else {
          // Ranged attack - check ammo and cooldown
          const weapon = this.playerInventory.getCurrentWeapon()
          const ammo = this.playerInventory.getCurrentAmmo()

          if (weapon && ammo && ammo.magazine > 0) {
            // Check cooldown
            const timeSinceLastShot = currentTime - this.lastShootTime
            if (timeSinceLastShot >= weapon.cooldownMs) {
              // Cooldown finished, can shoot

              // Update last shoot time
              this.lastShootTime = currentTime

              if (this.isMultiplayer) {
                // In multiplayer, send shoot to server
                // Server will broadcast authoritative bullets back
                this.networkManager?.sendShoot(weapon.id, angle)

                // Note: Don't create client-side prediction bullets
                // Wait for server broadcast to avoid desync
              } else {
                // Single player - shoot locally
                const bullets = this.player.tryShoot(worldMouse.x, worldMouse.y, currentTime)
                if (bullets.length > 0) {
                  this.playerInventory.consumeAmmo(this.playerInventory.currentSlot)
                  this.hotbarUI.updateDisplay()
                  this.activeItemDisplay.updateDisplay()

                  for (const bullet of bullets) {
                    this.worldContainer.addChild(bullet.getGraphics())
                  }
                }
              }
            }
            // If still in cooldown, do nothing (don't shoot, but don't return either)
          }
        }
      }
    }

    // Handle item pickup (F key)
    if (this.inputManager.wasFPressed()) {
      this.handlePickup()
    }

    // Update pickup prompt
    this.updatePickupPrompt()

    // Update dummies (shooting disabled) - Single player only
    if (this.dummyManager) {
      this.dummyManager.update(currentTime)
    }

    // Update all bullets
    this.player.updateBullets(deltaSeconds)
    if (this.dummyManager) {
      this.dummyManager.updateBullets(deltaSeconds)
    }

    // Update remote player bullets in multiplayer
    if (this.isMultiplayer) {
      for (const remotePlayer of this.remotePlayers.values()) {
        remotePlayer.updateBullets(deltaSeconds)
      }
    }

    // Check collisions
    this.checkCollisions()

    // Check box collisions with bullets
    this.checkBoxCollisions()

    // Check pillar collisions with bullets
    this.checkPillarCollisions()

    // Check destroyed boxes and spawn items - Single player only
    if (this.itemSpawnManager) {
      this.itemSpawnManager.checkDestroyedBoxes()
    }

    // Check box/pillar collisions with dummies (single player only)
    // Local player collision already checked before sending position to server
    if (this.dummyManager) {
      this.checkDummyObstacleCollisions()
    }

    // Check if player is dead
    if (!this.player.isAlive()) {
      this.onPlayerDeath()
    }

    // Update camera to follow player
    this.camera.setTarget(this.player.x, this.player.y)
    this.camera.update()

    // Update minimap
    this.miniMap.update(this.player.x, this.player.y)
  }

  private handlePickup(): void {
    // Multiplayer mode - use server items
    if (this.isMultiplayer && this.serverBoxManager) {
      const closestItem = this.serverBoxManager.getClosestItemInRange(this.player.x, this.player.y, 100)
      if (closestItem) {
        // Send pickup request to server
        this.networkManager?.sendPickupItem(closestItem.id)
      }
      return
    }

    // Single player mode - local items
    if (!this.itemSpawnManager) return

    const closestItem = this.itemSpawnManager.getClosestItemInRange(this.player.x, this.player.y, 100)
    if (!closestItem) return

    // Try to pickup
    if (closestItem.itemType === ItemType.WEAPON && closestItem instanceof WeaponPickup) {
      const success = this.playerInventory.addWeapon(
        closestItem.weaponType,
        closestItem.ammoInMagazine,
        closestItem.reserveAmmo
      )
      if (success) {
        closestItem.pickup()
        this.itemSpawnManager.removeItem(closestItem)
        this.hotbarUI.updateDisplay()
        this.activeItemDisplay.updateDisplay()
      }
    } else if (closestItem.itemType === ItemType.HEALING && closestItem instanceof HealingPickup) {
      const success = this.playerInventory.addHealing()
      if (success) {
        closestItem.pickup()
        this.itemSpawnManager.removeItem(closestItem)
        this.hotbarUI.updateDisplay()
        this.activeItemDisplay.updateDisplay()
      }
    }
  }

  private updatePickupPrompt(): void {
    // Multiplayer mode - use server items
    if (this.isMultiplayer && this.serverBoxManager) {
      const closestItem = this.serverBoxManager.getClosestItemInRange(this.player.x, this.player.y, 100)
      if (closestItem) {
        let itemName = 'Item'
        const item = closestItem.item
        if (item.itemType === ItemType.WEAPON && item instanceof WeaponPickup) {
          const weaponData = WEAPONS.find((w) => w.id === item.weaponType)
          itemName = weaponData?.name || item.weaponType
        } else if (item.itemType === ItemType.HEALING) {
          itemName = 'Med Kit'
        }
        this.pickupPromptUI.show(itemName, item.x, item.y)
      } else {
        this.pickupPromptUI.hide()
      }
      return
    }

    // Single player mode - local items
    if (!this.itemSpawnManager) return

    const closestItem = this.itemSpawnManager.getClosestItemInRange(this.player.x, this.player.y, 100)

    if (closestItem) {
      let itemName = 'Item'
      if (closestItem.itemType === ItemType.WEAPON && closestItem instanceof WeaponPickup) {
        const weaponData = WEAPONS.find((w) => w.id === closestItem.weaponType)
        itemName = weaponData ? weaponData.name : 'Weapon'
      } else if (closestItem.itemType === ItemType.HEALING) {
        itemName = 'Medkit'
      }

      this.pickupPromptUI.show(itemName, closestItem.x, closestItem.y)
    } else {
      this.pickupPromptUI.hide()
    }
  }

  private checkCollisions(): void {
    // In multiplayer, check bullet collision with players and send to server
    if (this.isMultiplayer) {
      // Only check LOCAL player bullets hitting remote players
      // Each client is responsible for their own bullets only
      for (const bullet of this.player.bullets) {
        if (!bullet.isAlive || bullet.isShrinking) continue

        // Check collision with remote players
        for (const [playerId, remotePlayer] of this.remotePlayers) {
          if (!remotePlayer.isAlive()) continue

          const dx = bullet.x - remotePlayer.x
          const dy = bullet.y - remotePlayer.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          // Check if bullet hit player (use player radius + small buffer)
          if (distance < 25) {
            const hitKey = `${bullet.id}_${playerId}`
            if (!this.sentHits.has(hitKey)) {
              // Send hit validation to server
              console.log(`🎯 Sending hit: bulletId=${bullet.id}, targetId=${playerId}, damage=${bullet.damage}`)
              this.networkManager?.sendHit(bullet.id, playerId, bullet.damage)
              this.sentHits.add(hitKey)
              bullet.onHit()
            }
            break
          }
        }
      }

      // Check REMOTE player bullets hitting LOCAL player (visual only, no damage)
      // Damage is already handled by shooter's client and server validation
      for (const remotePlayer of this.remotePlayers.values()) {
        for (const bullet of remotePlayer.bullets) {
          if (!bullet.isAlive || bullet.isShrinking) continue

          if (!this.player.isAlive()) continue

          const dx = bullet.x - this.player.x
          const dy = bullet.y - this.player.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          // Check if bullet hit local player
          if (distance < 25) {
            // Destroy bullet locally (no damage, already handled by shooter)
            console.log(`💥 Remote bullet ${bullet.id} hit local player (visual destroy only)`)
            bullet.onHit()
            break
          }
        }
      }

      return
    }

    // Single player mode
    // Get all entities (player + dummies if in single player)
    const allEntities: BaseEntity[] = [this.player]
    if (this.dummyManager) {
      allEntities.push(...this.dummyManager.getAliveDummies())
    }

    // Get all bullets (from player + dummies if in single player)
    const allBullets = [...this.player.bullets]
    if (this.dummyManager) {
      allBullets.push(...this.dummyManager.getAllBullets())
    }

    // Check collisions
    const collisions = this.collisionManager.checkCollisions(allBullets, allEntities)

    // Apply damage and get kill results
    const kills = this.collisionManager.applyDamage(collisions)

    // Handle kills - only count score when PLAYER kills a dummy
    for (const kill of kills) {
      if (kill.killer === this.player && kill.victim instanceof DummyPlayer) {
        // Player killed a dummy - add score
        this.scoreUI.addScore(1)
      }
    }
  }

  private checkBoxCollisions(): void {
    // Multiplayer mode - use server boxes (client-side only for visuals, no damage)
    if (this.isMultiplayer && this.serverBoxManager) {
      const boxes = this.serverBoxManager.getAllBoxes()

      // Check LOCAL player bullets (send damage + broadcast destroy)
      for (const bullet of this.player.bullets) {
        if (!bullet.isAlive) continue

        for (const box of boxes) {
          if (box.isDestroyed) continue

          const dx = bullet.x - box.x
          const dy = bullet.y - box.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < box.getRadius()) {
            // Hit box - send to server for validation
            this.networkManager?.sendBoxDamage(box.id, bullet.damage)
            // Broadcast bullet destroyed to other clients (only once per bullet)
            if (!this.destroyedBullets.has(bullet.id)) {
              console.log(`📣 Broadcasting bullet destroyed: ${bullet.id} (hit box)`)
              this.networkManager?.sendBulletDestroyed(bullet.id)
              this.destroyedBullets.add(bullet.id)
            }
            bullet.onHit()
            break
          }
        }
      }

      // Check REMOTE player bullets (local collision only, no damage/broadcast)
      for (const remotePlayer of this.remotePlayers.values()) {
        for (const bullet of remotePlayer.bullets) {
          if (!bullet.isAlive || bullet.isShrinking) continue

          for (const box of boxes) {
            if (box.isDestroyed) continue

            const dx = bullet.x - box.x
            const dy = bullet.y - box.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < box.getRadius()) {
              // Hit box - destroy bullet locally only (no server interaction)
              console.log(`💥 Remote bullet ${bullet.id} hit box locally`)
              bullet.onHit()
              break
            }
          }
        }
      }

      return
    }

    // Single player mode
    if (!this.itemSpawnManager || !this.dummyManager) return

    const boxes = this.itemSpawnManager.getAllBoxes()
    const allBullets = [...this.player.bullets, ...this.dummyManager.getAllBullets()]

    for (const bullet of allBullets) {
      if (!bullet.isAlive) continue

      for (const box of boxes) {
        if (box.isDestroyed) continue

        // Check collision
        const dx = bullet.x - box.x
        const dy = bullet.y - box.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < box.getRadius()) {
          // Hit box
          box.takeDamage(bullet.damage)
          bullet.onHit()
          break
        }
      }
    }
  }

  private checkBoxEntityCollisions(): void {
    // Multiplayer mode - only check local player collision with server boxes
    if (this.isMultiplayer && this.serverBoxManager) {
      const boxes = this.serverBoxManager.getAllBoxes()

      if (!this.player.isAlive()) return

      for (const box of boxes) {
        if (box.isDestroyed) continue

        const dx = this.player.x - box.x
        const dy = this.player.y - box.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const minDistance = this.player.getRadius() + box.getRadius()

        if (distance < minDistance) {
          // Push player away from box
          const overlap = minDistance - distance
          const pushAngle = Math.atan2(dy, dx)
          this.player.setPosition(
            this.player.x + Math.cos(pushAngle) * overlap,
            this.player.y + Math.sin(pushAngle) * overlap
          )
        }
      }
      return
    }

    // Single player mode
    if (!this.itemSpawnManager || !this.dummyManager) return

    const boxes = this.itemSpawnManager.getAllBoxes()
    const allEntities: BaseEntity[] = [this.player, ...this.dummyManager.getAliveDummies()]

    for (const entity of allEntities) {
      if (!entity.isAlive()) continue

      for (const box of boxes) {
        if (box.isDestroyed) continue

        // Check collision
        const dx = entity.x - box.x
        const dy = entity.y - box.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const minDistance = entity.getRadius() + box.getRadius()

        if (distance < minDistance) {
          // Push entity away from box
          const overlap = minDistance - distance
          const pushAngle = Math.atan2(dy, dx)
          entity.setPosition(entity.x + Math.cos(pushAngle) * overlap, entity.y + Math.sin(pushAngle) * overlap)
        }
      }
    }
  }

  private checkPillarCollisions(): void {
    // Multiplayer mode - use server pillars
    if (this.isMultiplayer && this.serverBoxManager) {
      const pillars = this.serverBoxManager.getAllPillars()

      // Check LOCAL player bullets (broadcast destroy)
      for (const bullet of this.player.bullets) {
        if (!bullet.isAlive) continue

        for (const pillar of pillars) {
          const dx = bullet.x - pillar.x
          const dy = bullet.y - pillar.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < pillar.radius) {
            // Hit pillar - bullet stops
            // Broadcast bullet destroyed to other clients (only once per bullet)
            if (!this.destroyedBullets.has(bullet.id)) {
              console.log(`📣 Broadcasting bullet destroyed: ${bullet.id} (hit pillar)`)
              this.networkManager?.sendBulletDestroyed(bullet.id)
              this.destroyedBullets.add(bullet.id)
            }
            bullet.onHit()
            break
          }
        }
      }

      // Check REMOTE player bullets (local collision only)
      for (const remotePlayer of this.remotePlayers.values()) {
        for (const bullet of remotePlayer.bullets) {
          if (!bullet.isAlive || bullet.isShrinking) continue

          for (const pillar of pillars) {
            const dx = bullet.x - pillar.x
            const dy = bullet.y - pillar.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < pillar.radius) {
              // Hit pillar - destroy bullet locally only
              console.log(`💥 Remote bullet ${bullet.id} hit pillar locally`)
              bullet.onHit()
              break
            }
          }
        }
      }

      return
    }

    // Single player mode
    if (!this.itemSpawnManager || !this.dummyManager) return

    const pillars = this.itemSpawnManager.getAllPillars()
    const allBullets = [...this.player.bullets, ...this.dummyManager.getAllBullets()]

    for (const bullet of allBullets) {
      if (!bullet.isAlive) continue

      for (const pillar of pillars) {
        // Check collision
        const dx = bullet.x - pillar.x
        const dy = bullet.y - pillar.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < pillar.getRadius()) {
          // Hit pillar - bullet stops
          bullet.onHit()
          break
        }
      }
    }
  }

  private checkPillarEntityCollisions(): void {
    // Multiplayer mode - only check local player collision with server pillars
    if (this.isMultiplayer && this.serverBoxManager) {
      const pillars = this.serverBoxManager.getAllPillars()

      if (!this.player.isAlive()) return

      for (const pillar of pillars) {
        const dx = this.player.x - pillar.x
        const dy = this.player.y - pillar.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const minDistance = this.player.getRadius() + pillar.radius

        if (distance < minDistance) {
          // Push player away from pillar
          const overlap = minDistance - distance
          const pushAngle = Math.atan2(dy, dx)
          this.player.setPosition(
            this.player.x + Math.cos(pushAngle) * overlap,
            this.player.y + Math.sin(pushAngle) * overlap
          )
        }
      }
      return
    }

    // Single player mode
    if (!this.itemSpawnManager || !this.dummyManager) return

    const pillars = this.itemSpawnManager.getAllPillars()
    const allEntities: BaseEntity[] = [this.player, ...this.dummyManager.getAliveDummies()]

    for (const entity of allEntities) {
      if (!entity.isAlive()) continue

      for (const pillar of pillars) {
        // Check collision
        const dx = entity.x - pillar.x
        const dy = entity.y - pillar.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const minDistance = entity.getRadius() + pillar.getRadius()

        if (distance < minDistance) {
          // Push entity away from pillar
          const overlap = minDistance - distance
          const pushAngle = Math.atan2(dy, dx)
          entity.setPosition(entity.x + Math.cos(pushAngle) * overlap, entity.y + Math.sin(pushAngle) * overlap)
        }
      }
    }
  }

  private checkMeleeBoxAttack(): void {
    const weapon = this.playerInventory.getCurrentWeapon()
    if (!weapon || !weapon.isMelee) return

    // Multiplayer mode - use server boxes
    if (this.isMultiplayer && this.serverBoxManager) {
      const boxes = this.serverBoxManager.getAllBoxes()

      for (const box of boxes) {
        if (box.isDestroyed) continue

        const dx = box.x - this.player.x
        const dy = box.y - this.player.y
        const distanceToCenter = Math.sqrt(dx * dx + dy * dy)

        // Use damage radius for easier hitting
        const damageDistance = this.player.getRadius() + box.getDamageRadius()
        if (distanceToCenter <= damageDistance) {
          // Send box damage to server
          this.networkManager?.sendBoxDamage(box.id, weapon.damage)
          break // Only hit one box per attack
        }
      }
      return
    }

    // Single player mode - use local items
    if (!this.itemSpawnManager) return

    const boxes = this.itemSpawnManager.getAllBoxes()

    for (const box of boxes) {
      if (box.isDestroyed) continue

      const dx = box.x - this.player.x
      const dy = box.y - this.player.y
      const distanceToCenter = Math.sqrt(dx * dx + dy * dy)

      // Use damage radius for easier hitting
      const damageDistance = this.player.getRadius() + box.getDamageRadius()
      if (distanceToCenter <= damageDistance) {
        box.takeDamage(weapon.damage)
        break // Only hit one box per attack
      }
    }
  }

  // Helper method to check dummy obstacle collisions (single player only)
  private checkDummyObstacleCollisions(): void {
    if (!this.itemSpawnManager || !this.dummyManager) return

    const boxes = this.itemSpawnManager.getAllBoxes()
    const pillars = this.itemSpawnManager.getAllPillars()
    const dummies = this.dummyManager.getAliveDummies()

    for (const dummy of dummies) {
      if (!dummy.isAlive()) continue

      // Check box collisions
      for (const box of boxes) {
        if (box.isDestroyed) continue

        const dx = dummy.x - box.x
        const dy = dummy.y - box.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const minDistance = dummy.getRadius() + box.getRadius()

        if (distance < minDistance) {
          const overlap = minDistance - distance
          const pushAngle = Math.atan2(dy, dx)
          dummy.setPosition(dummy.x + Math.cos(pushAngle) * overlap, dummy.y + Math.sin(pushAngle) * overlap)
        }
      }

      // Check pillar collisions
      for (const pillar of pillars) {
        const dx = dummy.x - pillar.x
        const dy = dummy.y - pillar.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const minDistance = dummy.getRadius() + pillar.getRadius()

        if (distance < minDistance) {
          const overlap = minDistance - distance
          const pushAngle = Math.atan2(dy, dx)
          dummy.setPosition(dummy.x + Math.cos(pushAngle) * overlap, dummy.y + Math.sin(pushAngle) * overlap)
        }
      }
    }
  }

  private onPlayerDeath(): void {
    this.isGameOver = true
    this.gameOverUI.show()
  }

  // Fade out animation for entity death
  private fadeOutEntity(container: PIXI.Container, onComplete?: () => void): void {
    const fadeSpeed = 0.05
    const animate = () => {
      container.alpha -= fadeSpeed
      if (container.alpha <= 0) {
        container.alpha = 0
        if (onComplete) onComplete()
      } else {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  private respawnPlayer(): void {
    // Get new spawn position
    const spawnPos = this.gameMap.getRandomValidPosition()

    // Respawn player
    this.player.respawn(spawnPos.x, spawnPos.y)

    // Reset score
    this.scoreUI.reset()

    // Hide game over UI
    this.gameOverUI.hide()

    // Resume game
    this.isGameOver = false
  }

  private onResize = (): void => {
    this.camera.resize(this.app.screen.width, this.app.screen.height)
    this.hotbarUI.updatePosition(this.app.screen.width, this.app.screen.height)
    this.activeItemDisplay.updatePosition(this.app.screen.width, this.app.screen.height)
    this.scoreUI.updatePosition(this.app.screen.width)
    this.gameOverUI.updatePosition(this.app.screen.width, this.app.screen.height)
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize)
    this.app.ticker.remove(this.gameLoop)
    this.inputManager.destroy()
    this.player.destroy()

    // Destroy single-player only managers
    if (this.dummyManager) {
      this.dummyManager.destroy()
    }
    if (this.itemSpawnManager) {
      this.itemSpawnManager.destroy()
    }

    // Disconnect from multiplayer if connected
    if (this.networkManager) {
      this.networkManager.disconnect()
    }

    this.pickupPromptUI.destroy()
    this.healingChannelUI.destroy()
    this.reloadUI.destroy()
    this.activeItemDisplay.destroy()
    this.miniMap.destroy()
    this.app.destroy(true, { children: true })
  }
}
