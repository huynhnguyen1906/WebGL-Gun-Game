import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'
import { WEAPONS } from '../config/serverConfig'
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
import { PickupPromptUI } from './PickupPromptUI'
import { Player } from './Player'
import { PlayerInventory, type SlotTypeValue } from './PlayerInventory'
import { ReloadUI } from './ReloadUI'
import { ScoreUI } from './ScoreUI'

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
  private dummyManager: DummyManager
  private collisionManager: CollisionManager
  private itemSpawnManager: ItemSpawnManager
  private playerInventory: PlayerInventory
  private pickupPromptUI: PickupPromptUI
  private healingChannelUI: HealingChannelUI
  private reloadUI: ReloadUI
  private worldContainer: PIXI.Container
  private uiContainer: PIXI.Container
  private lastTime: number = 0
  private isGameOver: boolean = false

  constructor(app: PIXI.Application) {
    this.app = app
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

    // Create dummy manager and spawn dummies
    this.dummyManager = new DummyManager(this.gameMap, this.worldContainer)
    this.dummyManager.spawnInitialDummies(this.player.x, this.player.y)

    // Create player inventory and set to hotbar
    this.playerInventory = new PlayerInventory()

    // Create item spawn manager and spawn items
    this.itemSpawnManager = new ItemSpawnManager(this.gameMap, this.worldContainer)
    this.itemSpawnManager.spawnInitialItems(this.player.x, this.player.y, 500)

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

    // Connect respawn callback
    this.gameOverUI.setRespawnCallback(() => {
      this.respawnPlayer()
    })

    // Setup game loop
    this.app.ticker.add(this.gameLoop)

    // Handle resize
    window.addEventListener('resize', this.onResize)
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
        if (ammo && ammo.magazine < (weapon.magazineSize || 0) && ammo.reserve > 0) {
          // Start reload animation
          this.reloadUI.startReload(currentTime, weapon.reloadTimeMs)
        }
      }
    }

    // Update reload progress
    if (this.reloadUI.isActive()) {
      const reloadComplete = this.reloadUI.updateReload(currentTime, this.player.x, this.player.y)
      if (reloadComplete) {
        // Actually reload
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

    // Update player movement
    this.player.move(deltaSeconds, movement.x, movement.y, (x, y, r) => this.gameMap.clampPosition(x, y, r))

    // Check if player moved during healing
    if (this.healingChannelUI.isActive() && isMoving) {
      this.healingChannelUI.stopChannel()
    }

    // Handle healing channel
    if (this.healingChannelUI.isActive()) {
      const healComplete = this.healingChannelUI.updateChannel(currentTime, this.player.x, this.player.y)
      if (healComplete) {
        // Apply healing
        this.player.heal(50)
        // Consume healing item
        this.playerInventory.useHealing()
        this.hotbarUI.updateDisplay()
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

    // Update dummy manager with player position
    this.dummyManager.updatePlayerPosition(this.player.x, this.player.y)

    // Handle attack/shooting
    if (this.inputManager.isMouseDown && !this.healingChannelUI.isActive()) {
      const isOverHotbar = this.hotbarUI.isPointInside(this.inputManager.mouseX, this.inputManager.mouseY)
      if (!isOverHotbar) {
        // Check if melee or ranged
        if (this.playerInventory.isCurrentSlotMelee()) {
          // Melee attack
          const allEntities: BaseEntity[] = [this.player, ...this.dummyManager.getAliveDummies()]
          this.player.tryMeleeAttack(worldMouse.x, worldMouse.y, currentTime, allEntities)
        } else {
          // Ranged attack - check ammo
          const ammo = this.playerInventory.getCurrentAmmo()
          if (ammo && ammo.magazine > 0) {
            const bullets = this.player.tryShoot(worldMouse.x, worldMouse.y, currentTime)
            if (bullets.length > 0) {
              // Consume ammo
              this.playerInventory.consumeAmmo(this.playerInventory.currentSlot)
              this.hotbarUI.updateDisplay()
              this.activeItemDisplay.updateDisplay()

              // Add bullets to world
              for (const bullet of bullets) {
                this.worldContainer.addChild(bullet.getGraphics())
              }
            }
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

    // Update dummies (shooting disabled)
    this.dummyManager.update(currentTime)

    // Update all bullets
    this.player.updateBullets(deltaSeconds)
    this.dummyManager.updateBullets(deltaSeconds)

    // Check collisions
    this.checkCollisions()

    // Check if player is dead
    if (!this.player.isAlive()) {
      this.onPlayerDeath()
    }

    // Update camera to follow player
    this.camera.setTarget(this.player.x, this.player.y)
    this.camera.update()
  }

  private handlePickup(): void {
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
    // Get all entities (player + dummies)
    const allEntities: BaseEntity[] = [this.player, ...this.dummyManager.getAliveDummies()]

    // Get all bullets (from player + dummies)
    const allBullets = [...this.player.bullets, ...this.dummyManager.getAllBullets()]

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

  private onPlayerDeath(): void {
    this.isGameOver = true
    this.gameOverUI.show()
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
    this.dummyManager.destroy()
    this.itemSpawnManager.destroy()
    this.pickupPromptUI.destroy()
    this.healingChannelUI.destroy()
    this.reloadUI.destroy()
    this.activeItemDisplay.destroy()
    this.app.destroy(true, { children: true })
  }
}
