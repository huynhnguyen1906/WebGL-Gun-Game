/**
 * Game Configuration (shared between server and client)
 * Server is the authority for all game rules
 */

export const GAME_CONFIG = {
  MAP: {
    SIZE: 3000,
    PADDING: 32,
  },

  PLAYER: {
    RADIUS: 12,
    MAX_HP: 100,
    SPEED: 180, // px/s
    SPAWN_MARGIN: 64,
  },

  WEAPONS: {
    FIST: {
      id: 'FIST',
      damage: 10,
      range: 35,
      cooldownMs: 500,
      isMelee: true,
    },
    PISTOL: {
      id: 'PISTOL',
      damage: 20,
      speed: 1000,
      range: 500,
      cooldownMs: 1000,
      magazineSize: 7,
      infiniteAmmo: true,
      maxReserveAmmo: 999, // Display value for infinite ammo
      reloadTimeMs: 1500,
    },
    RIFLE: {
      id: 'RIFLE',
      damage: 20,
      speed: 1000,
      range: 1000,
      cooldownMs: 150,
      magazineSize: 30,
      maxReserveAmmo: 60,
      reloadTimeMs: 2000,
    },
    SNIPER: {
      id: 'SNIPER',
      damage: 100,
      speed: 1500,
      range: 1300,
      cooldownMs: 1200,
      magazineSize: 5,
      maxReserveAmmo: 20,
      reloadTimeMs: 2500,
    },
    SHOTGUN: {
      id: 'SHOTGUN',
      damage: 15,
      speed: 1000,
      range: 700,
      cooldownMs: 1200,
      pelletCount: 12,
      spreadAngle: 8,
      magazineSize: 6,
      maxReserveAmmo: 24,
      reloadTimeMs: 2000,
    },
  },

  NETWORK: {
    TICK_RATE: 60, // Server updates per second - match client framerate
    CLIENT_UPDATE_RATE: 60, // Client sends inputs per second (throttled)
    INTERPOLATION_DELAY: 50, // ms - reduced for lower latency
  },
}
