/**
 * Game Configuration (Client-only, visual)
 *
 * Chứa các config về visual, rendering, UI.
 * Không chứa game logic như damage, HP, cooldown.
 * Các config về game logic nằm trong serverConfig.ts
 */

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
    ARM: {
      RADIUS: 5, // px
      OFFSET_DISTANCE: 18, // distance from arm center to body center (offset)
      SPREAD_RAD: 1.2, // V spread angle (radians), ~57° - wider
      COLOR: 0x222222,
    },
    SPAWN_MARGIN: 64, // avoid spawning too close to edge (>= PADDING)
  },
  DUMMY: {
    RADIUS: 12, // px (same as player)
    COLOR: 0xcc4444, // Red-ish color to distinguish from player
    SHADOW: { ENABLED: true, BLUR: 4, ALPHA: 0.25 },
    ARM: {
      RADIUS: 5,
      OFFSET_DISTANCE: 18,
      SPREAD_RAD: 1.2,
      COLOR: 0xcc4444,
    },
  },
  BULLET: {
    HEAD_WIDTH: 2.5, // px - width at head (thicker)
    TAIL_WIDTH: 1.5, // px - width at tail (thinner)
    MAX_LENGTH: 200, // px - maximum trail length
    GROW_DISTANCE: 500, // px - distance to reach max length
    COLOR: 0x323332, // trail color (light gray)
    HEAD_ALPHA: 0.9, // opacity at head
    TAIL_ALPHA: 0, // opacity at tail (faded)
    SEGMENTS: 10, // number of segments for gradient effect
  },
  TICK: {
    MAX_DT_MS: 50, // clamp dt to avoid jitter
  },
  UI: {
    HP_BAR: {
      WIDTH: 40,
      HEIGHT: 4,
      OFFSET_Y: -20, // Above entity
      BG_COLOR: 0x333333,
      FILL_COLOR: 0x44cc44,
      LOW_HP_COLOR: 0xcc4444, // When HP < 30%
    },
    SCORE: {
      FONT_SIZE: 18,
      COLOR: 0xffffff,
      PADDING: 20,
    },
  },
} as const
