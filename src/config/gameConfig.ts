export const WeaponType = {
  PISTOL: 'PISTOL',
  RIFLE: 'RIFLE',
  SNIPER: 'SNIPER',
  SHOTGUN: 'SHOTGUN',
} as const

export type WeaponType = (typeof WeaponType)[keyof typeof WeaponType]

export const GAME_CONFIG = {
  MAP: {
    SIZE: 3000, // px
    TILE: 32, // px
    PADDING: 32, // px
    COLOR_BG: 0xf3e5ab, // map background (wheat)
    GRID_COLOR: 0xcccccc, // grid line color (light)
  },
  CAMERA: {
    FOLLOW_LERP: 1.0, // 1.0 = snap immediately; <1.0 = smooth
  },
  PLAYER: {
    RADIUS: 12, // px
    COLOR: 0x222222,
    SHADOW: { ENABLED: true, BLUR: 4, ALPHA: 0.25 },
    SPEED: 180, // px/s
    ARM: {
      RADIUS: 5, // px
      OFFSET_DISTANCE: 18, // distance from arm center to body center (offset)
      SPREAD_RAD: 1.2, // V spread angle (radians), ~57° - wider
      COLOR: 0x222222,
    },
    SPAWN_MARGIN: 64, // avoid spawning too close to edge (>= PADDING)
  },
  BULLET: {
    RADIUS: 5, // px - shared across all weapons
    COLOR: 0x000000, // shared across all weapons
  },
  WEAPONS: {
    [WeaponType.PISTOL]: {
      NAME: 'Pistol',
      SPEED: 700, // px/s
      RANGE: 500, // px
      COOLDOWN_MS: 1000, // 1 second
    },
    [WeaponType.RIFLE]: {
      NAME: 'Rifle',
      SPEED: 700, // px/s
      RANGE: 1000, // px
      COOLDOWN_MS: 150, // 150ms
    },
    [WeaponType.SNIPER]: {
      NAME: 'Sniper',
      SPEED: 1300, // px/s
      RANGE: 1300, // px
      COOLDOWN_MS: 1200, // 1.2 seconds
    },
    [WeaponType.SHOTGUN]: {
      NAME: 'Shotgun',
      SPEED: 700, // px/s
      RANGE: 700, // px
      COOLDOWN_MS: 1200, // 1.2 seconds
      PELLET_COUNT: 12, // number of pellets per shot
      SPREAD_ANGLE: 8, // degrees
    },
  },
  TICK: {
    MAX_DT_MS: 50, // clamp dt to avoid jitter
  },
} as const
