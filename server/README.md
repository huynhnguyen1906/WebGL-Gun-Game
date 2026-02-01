# WebGL Gun Game Server

Multiplayer game server for WebGL Gun Game.

## Project Structure

```
server/
├── src/
│   ├── game/              # Game logic layer
│   │   ├── Player.js      # Player entity
│   │   ├── GameState.js   # Central game state
│   │   ├── BulletManager.js # Bullet lifecycle
│   │   └── CombatSystem.js  # Combat & damage logic
│   ├── network/           # Network layer
│   │   ├── SocketHandler.js # Socket.IO events
│   │   └── GameLoop.js      # Server tick loop
│   ├── config/            # Configuration
│   │   └── gameConfig.js    # Game rules & constants
│   ├── utils/             # Utilities
│   │   └── MathUtils.js     # Math helpers
│   └── server.js          # Entry point
├── package.json
└── README.md
```

## Architecture

### Server Authority

- Player HP and damage
- Hit validation
- Spawn positions
- Game rules enforcement

### Client Prediction

- Movement (smooth, no lag)
- Shooting visualization
- Bullet rendering

### Network Optimization

- 20 tick/s server state updates
- Immediate bullet broadcast (low latency)
- Delta compression for player states
- Client-side interpolation

## Installation

```bash
cd server
npm install
```

## Running

### Development (auto-restart on changes)

```bash
npm run dev
```

### Production

```bash
npm start
```

Server runs on port **3001** by default.

## API

### Socket.IO Events

#### Client → Server

- `input` - Player movement input
- `shoot` - Weapon fired
- `hit` - Bullet hit report (validated by server)

#### Server → Client

- `init` - Initial game state on connect
- `state` - Game state update (20Hz)
- `bullets` - New bullets spawned
- `damage` - Player took damage
- `player_joined` - New player connected
- `player_left` - Player disconnected

## Configuration

Edit `src/config/gameConfig.js` to adjust:

- Tick rate
- Weapon stats
- Map size
- Player properties

## Scaling

For production scaling:

- Add Redis for state sync across servers
- Implement room/lobby system
- Add database for player data
- Use PM2 for process management
- Add rate limiting and DDoS protection
