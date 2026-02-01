/**
 * Socket Handler
 * Manages all socket.io events and player connections
 */
import { GAME_CONFIG } from '../config/gameConfig.js'

export class SocketHandler {
  constructor(gameState, combatSystem) {
    this.gameState = gameState
    this.combatSystem = combatSystem
  }

  // Handle new player connection
  handleConnection(socket, io) {
    console.log(`New connection: ${socket.id}`)

    // Add player to game
    const player = this.gameState.addPlayer(socket.id)
    console.log(`Player ${player.id} joined at (${Math.round(player.x)}, ${Math.round(player.y)})`)

    // Send initial game state to new player
    socket.emit('init', {
      playerId: player.id,
      player: player.getFullState(),
      players: this.gameState
        .getAllPlayers()
        .filter((p) => p.socketId !== socket.id)
        .map((p) => p.getFullState()),
      boxes: Array.from(this.gameState.boxManager.boxes.values()),
      pillars: Array.from(this.gameState.boxManager.pillars.values()),
      items: Array.from(this.gameState.boxManager.droppedItems.values()),
      config: GAME_CONFIG,
    })

    // Notify other players about new player
    socket.broadcast.emit('player_joined', player.getFullState())

    // Setup event handlers
    this.setupEventHandlers(socket, io)
  }

  // Setup all socket event handlers
  setupEventHandlers(socket, io) {
    // Player movement (position updates from client)
    socket.on('player:move', (data) => {
      const player = this.gameState.getPlayer(socket.id)
      if (!player) return

      // Update player position (client calculates, server validates)
      // Pass boxManager to validate collisions with obstacles
      player.updatePosition(data, this.gameState.boxManager)

      // Broadcast updated position to all other players
      socket.broadcast.emit('player:moved', {
        id: player.id,
        x: player.x,
        y: player.y,
        rotation: player.rotation,
        direction: player.direction,
        isMoving: player.isMoving,
      })
    })

    // Player weapon switch
    socket.on('weapon_switch', (data) => {
      const player = this.gameState.getPlayer(socket.id)
      if (!player) return

      player.currentWeapon = data.weapon

      // Broadcast weapon change to all other players
      socket.broadcast.emit('weapon_changed', {
        playerId: player.id,
        weapon: data.weapon,
      })
    })

    // Player shooting
    socket.on('shoot', (data) => {
      const player = this.gameState.getPlayer(socket.id)
      if (!player || player.isDead) return

      const weapon = GAME_CONFIG.WEAPONS[data.weapon]
      if (!weapon) return

      // Validate ammo (for ranged weapons)
      if (!weapon.isMelee && weapon.magazineSize) {
        let inventorySlot = null
        if (data.weapon === 'PISTOL') {
          inventorySlot = player.inventory?.pistol
        } else {
          inventorySlot = player.inventory?.primary
        }

        if (!inventorySlot || inventorySlot.magazine <= 0) {
          return // No ammo
        }

        // Consume ammo
        inventorySlot.magazine--

        // Send ammo update to player
        socket.emit('ammo_update', {
          weapon: data.weapon,
          magazine: inventorySlot.magazine,
          reserve: inventorySlot.reserve,
        })
      }

      const result = this.combatSystem.handleShoot(player, weapon, data)

      if (!result) return

      // Melee attack
      if (result.type === 'melee') {
        for (const hit of result.hits) {
          io.emit('damage', hit)
        }
        return
      }

      // Bullets - broadcast to all clients
      io.emit('bullets', {
        playerId: player.id,
        bullets: result,
      })
    })

    // Bullet hit validation
    socket.on('hit', (data) => {
      const shooter = this.gameState.getPlayer(socket.id)
      if (!shooter) return

      const result = this.combatSystem.validateHit(shooter, data.bulletId, data.targetId, data.damage)

      if (result) {
        io.emit('damage', result)
        console.log(`Player ${shooter.id} hit Player ${result.targetId} for ${result.damage} damage (HP: ${result.hp})`)

        // Check if target died
        if (result.hp <= 0) {
          const target = this.gameState.getPlayer(result.targetId)
          if (target && target.isDead) {
            io.emit('player_died', {
              playerId: result.targetId,
              killerId: shooter.id,
            })
            console.log(`Player ${result.targetId} died. Killed by Player ${shooter.id}`)
          }
        }
      }
    })

    // Player heal
    socket.on('heal', (data) => {
      const player = this.gameState.getPlayer(socket.id)
      if (!player || player.isDead) return

      // Validate healing count
      if (player.inventory.healing <= 0) return

      // Apply heal
      const healed = player.heal(data.amount)
      if (healed) {
        // Consume healing item
        player.inventory.healing--

        // Broadcast HP update to all players
        io.emit('player_healed', {
          playerId: player.id,
          hp: player.hp,
          maxHp: player.maxHp,
        })

        console.log(`Player ${player.id} healed for ${data.amount} HP (Current: ${player.hp}/${player.maxHp})`)
      }
    })

    // Player respawn request
    socket.on('respawn', () => {
      const player = this.gameState.getPlayer(socket.id)
      if (!player || !player.isDead) return

      // Respawn player at random position
      const spawnRadius = 200
      const spawnX = GAME_CONFIG.MAP.SIZE / 2 + (Math.random() - 0.5) * spawnRadius * 2
      const spawnY = GAME_CONFIG.MAP.SIZE / 2 + (Math.random() - 0.5) * spawnRadius * 2
      player.respawn(spawnX, spawnY)

      // Broadcast respawn to all players
      io.emit('player_respawned', {
        playerId: player.id,
        x: player.x,
        y: player.y,
        hp: player.hp,
      })
      console.log(`Player ${player.id} respawned at (${Math.round(player.x)}, ${Math.round(player.y)})`)
    })

    // Item pickup (from dropped items)
    socket.on('pickup_item', (data) => {
      const player = this.gameState.getPlayer(socket.id)
      if (!player || player.isDead) return

      const item = this.gameState.boxManager.pickupItem(data.itemId, player)
      if (!item) return

      // Broadcast item removal to all players
      io.emit('item_picked', {
        itemId: data.itemId,
        playerId: player.id,
      })

      // Send updated inventory to player
      socket.emit('inventory_update', {
        inventory: player.inventory,
        currentWeapon: player.currentWeapon,
      })

      console.log(`Player ${player.id} picked up ${item.type} (${item.weaponType || 'healing'})`)
    })

    // Box damage (from bullets or melee)
    socket.on('box_damage', (data) => {
      const player = this.gameState.getPlayer(socket.id)
      if (!player || player.isDead) return

      const result = this.gameState.boxManager.damageBox(data.boxId, data.damage)
      if (!result) return

      // Broadcast box damage
      io.emit('box_damaged', {
        boxId: data.boxId,
        hp: result.box.hp,
        isDestroyed: result.box.isDestroyed,
      })

      // If box destroyed, broadcast dropped item
      if (result.item) {
        io.emit('item_dropped', result.item)
      }
    })

    // Reload weapon
    socket.on('reload', (data) => {
      const player = this.gameState.getPlayer(socket.id)
      if (!player || player.isDead) return

      const weapon = GAME_CONFIG.WEAPONS[data.weapon]
      if (!weapon || !weapon.magazineSize) return

      // Get current inventory slot
      let inventorySlot = null
      if (data.weapon === 'PISTOL') {
        inventorySlot = player.inventory?.pistol
      } else {
        inventorySlot = player.inventory?.primary
      }

      if (!inventorySlot) return

      // Check if can reload
      if (inventorySlot.magazine >= weapon.magazineSize) return
      if (!weapon.infiniteAmmo && inventorySlot.reserve === 0) return

      // Get reload time from weapon config (default 2000ms if not specified)
      const reloadTimeMs = weapon.reloadTimeMs || 2000

      // Wait for reload duration before completing
      setTimeout(() => {
        // Double check player still exists and weapon matches
        const currentPlayer = this.gameState.getPlayer(socket.id)
        if (!currentPlayer) return

        // Perform reload
        const needed = weapon.magazineSize - inventorySlot.magazine
        if (weapon.infiniteAmmo) {
          inventorySlot.magazine = weapon.magazineSize
        } else {
          const toReload = Math.min(needed, inventorySlot.reserve)
          inventorySlot.magazine += toReload
          inventorySlot.reserve -= toReload
        }

        // Send updated ammo to player
        socket.emit('reload_complete', {
          weapon: data.weapon,
          magazine: inventorySlot.magazine,
          reserve: inventorySlot.reserve,
        })

        console.log(`Player ${currentPlayer.id} reloaded ${data.weapon}`)
      }, reloadTimeMs)
    })

    // Bullet destroyed (hit pillar/box)
    socket.on('bullet_destroyed', (data) => {
      const player = this.gameState.getPlayer(socket.id)
      if (!player) return

      console.log(`📢 Broadcasting bullet_destroyed: bulletId=${data.bulletId}, shooterId=${player.id}`)

      // Broadcast bullet destruction to all other clients
      socket.broadcast.emit('bullet_destroyed', {
        bulletId: data.bulletId,
        playerId: player.id,
      })
    })

    // Player disconnect
    socket.on('disconnect', () => {
      const player = this.gameState.removePlayer(socket.id)
      if (!player) return

      console.log(`Player ${player.id} (${socket.id}) disconnected`)
      io.emit('player_left', { playerId: player.id })
    })
  }
}
