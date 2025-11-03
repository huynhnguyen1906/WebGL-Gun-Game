export const GAME_CONFIG = {
  MAP: {
    SIZE: 3000, // px
    TILE: 32, // px
    PADDING: 32, // px
    COLOR_BG: 0xf3e5ab, // map background (wheat)
    GRID_COLOR: 0xe8d899, // grid line color (light)
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
    RADIUS: 10, // px
    COLOR: 0x000000,
    SPEED: 1000, // px/s (500px trong 0.5s)
    RANGE: 1000, // px
    COOLDOWN_MS: 300, // delay between shots
  },
  TICK: {
    MAX_DT_MS: 50, // clamp dt to avoid jitter
  },
} as const
