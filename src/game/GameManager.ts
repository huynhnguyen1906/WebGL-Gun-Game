import * as PIXI from 'pixi.js'

import { GAME_CONFIG } from '../config/gameConfig'
import { BaseEntity } from './BaseEntity'
import { Camera } from './Camera'
import { CollisionManager } from './CollisionManager'
import { DummyManager } from './DummyManager'
import { DummyPlayer } from './DummyPlayer'
import { GameOverUI } from './GameOverUI'
import { HotbarUI } from './HotbarUI'
import { InputManager } from './InputManager'
import { GameMap } from './Map'
import { Player } from './Player'
import { ScoreUI } from './ScoreUI'

export class GameManager {
  private app: PIXI.Application
  private gameMap: GameMap
  private player: Player
  private camera: Camera
  private inputManager: InputManager
  private hotbarUI: HotbarUI
  private scoreUI: ScoreUI
  private gameOverUI: GameOverUI
  private dummyManager: DummyManager
  private collisionManager: CollisionManager
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

    // Create UI elements
    this.hotbarUI = new HotbarUI(this.app.screen.width, this.app.screen.height)
    this.uiContainer.addChild(this.hotbarUI.getContainer())

    this.scoreUI = new ScoreUI(this.app.screen.width)
    this.uiContainer.addChild(this.scoreUI.getContainer())

    this.gameOverUI = new GameOverUI(this.app.screen.width, this.app.screen.height)
    this.uiContainer.addChild(this.gameOverUI.getContainer())

    // Connect hotbar weapon change to player
    this.hotbarUI.setWeaponChangeCallback((weapon) => {
      this.player.setWeapon(weapon)
    })

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

    // Check for number key weapon switching (1-4)
    const numberKey = this.inputManager.getPressedNumberKey()
    if (numberKey !== null) {
      this.hotbarUI.selectWeaponByIndex(numberKey - 1) // Convert 1-4 to 0-3
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

    // Update player movement
    const movement = this.inputManager.getMovementVector()
    this.player.move(deltaSeconds, movement.x, movement.y, (x, y, r) => this.gameMap.clampPosition(x, y, r))

    // Update dummy manager with player position
    this.dummyManager.updatePlayerPosition(this.player.x, this.player.y)

    // Handle shooting - only if mouse is not over hotbar UI
    if (this.inputManager.isMouseDown) {
      const isOverHotbar = this.hotbarUI.isPointInside(this.inputManager.mouseX, this.inputManager.mouseY)
      if (!isOverHotbar) {
        const bullets = this.player.tryShoot(worldMouse.x, worldMouse.y, currentTime)
        for (const bullet of bullets) {
          this.worldContainer.addChild(bullet.getGraphics())
        }
      }
    }

    // Update dummies (auto-shoot)
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
    this.scoreUI.updatePosition(this.app.screen.width)
    this.gameOverUI.updatePosition(this.app.screen.width, this.app.screen.height)
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize)
    this.app.ticker.remove(this.gameLoop)
    this.inputManager.destroy()
    this.player.destroy()
    this.dummyManager.destroy()
    this.hotbarUI.destroy()
    this.scoreUI.destroy()
    this.gameOverUI.destroy()
    this.app.destroy(true, { children: true })
  }
}
