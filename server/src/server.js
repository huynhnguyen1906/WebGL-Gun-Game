/**
 * WebGL Gun Game - Multiplayer Server
 *
 * Architecture:
 * - Server authoritative for damage, HP, player spawning
 * - Client prediction for movement (smooth gameplay)
 * - Server broadcasts bullets immediately (all clients render)
 * - Hit detection on client, validation on server
 * - 20 tick/s server updates for state sync
 */
import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

import { CombatSystem } from './game/CombatSystem.js'
// Import game systems
import { GameState } from './game/GameState.js'
import { GameLoop } from './network/GameLoop.js'
import { SocketHandler } from './network/SocketHandler.js'

// Initialize Express
const app = express()
const httpServer = createServer(app)

// Configure CORS
app.use(cors())

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins (adjust for production)
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})

// Initialize game systems
const gameState = new GameState()
const combatSystem = new CombatSystem(gameState)
const socketHandler = new SocketHandler(gameState, combatSystem)
const gameLoop = new GameLoop(io, gameState)

// Start game loop
gameLoop.start()

// Handle socket connections
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket, io)
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    players: gameState.players.size,
    uptime: process.uptime(),
  })
})

// Start server
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`
🎮 WebGL Gun Game Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server running on: http://localhost:${PORT}
Tick rate: ${gameLoop.tickRate}ms (${1000 / gameLoop.tickRate} ticks/s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  gameLoop.stop()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
