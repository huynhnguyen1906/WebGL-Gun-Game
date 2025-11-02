export const GAME_CONFIG = {
  MAP: {
    SIZE: 3000, // px
    TILE: 32, // px
    PADDING: 32, // px
    COLOR_BG: 0xf3e5ab, // nền map (wheat)
    GRID_COLOR: 0xe8d899, // màu đường kẻ (nhạt)
  },
  CAMERA: {
    FOLLOW_LERP: 1.0, // 1.0 = bám ngay; <1.0 = mượt
  },
  PLAYER: {
    RADIUS: 12, // px
    COLOR: 0x222222,
    SHADOW: { ENABLED: true, BLUR: 4, ALPHA: 0.25 },
    SPEED: 180, // px/s
    ARM: {
      RADIUS: 5, // px
      OFFSET_DISTANCE: 18, // khoảng cách tâm tay tới tâm thân (tách ra khỏi thân)
      SPREAD_RAD: 1.2, // độ mở chữ V (radian), ~57° - mở rộng hơn
      COLOR: 0x222222,
    },
    SPAWN_MARGIN: 64, // tránh spawn sát mép (>= PADDING)
  },
  BULLET: {
    RADIUS: 3, // px
    COLOR: 0xffa500,
    SPEED: 1000, // px/s (500px trong 0.5s)
    RANGE: 500, // px
    COOLDOWN_MS: 100, // delay giữa hai phát
  },
  TICK: {
    MAX_DT_MS: 50, // clamp dt để tránh giật
  },
} as const
