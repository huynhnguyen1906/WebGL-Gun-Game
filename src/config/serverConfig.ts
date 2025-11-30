/**
 * Server Configuration (Backend-controlled)
 *
 * Đây là file mock data cho backend.
 * Sau này khi implement online, data này sẽ được gửi từ server qua socket.
 * Client sẽ nhận và override các giá trị này.
 *
 * Khi chuyển sang online:
 * 1. Xóa các giá trị mặc định
 * 2. Nhận data từ socket.on('game_init', ...)
 * 3. Populate vào các biến export
 */

// ===== WEAPON TYPES =====
export const WeaponType = {
  PISTOL: 'PISTOL',
  RIFLE: 'RIFLE',
  SNIPER: 'SNIPER',
  SHOTGUN: 'SHOTGUN',
} as const

export type WeaponTypeValue = (typeof WeaponType)[keyof typeof WeaponType]

// ===== WEAPON DATA =====
export interface WeaponData {
  id: WeaponTypeValue
  name: string
  damage: number
  speed: number // px/s
  range: number // px
  cooldownMs: number
  pelletCount?: number // Shotgun only
  spreadAngle?: number // Shotgun only (degrees)
}

export const WEAPONS: WeaponData[] = [
  {
    id: WeaponType.PISTOL,
    name: 'Pistol',
    damage: 20,
    speed: 700,
    range: 500,
    cooldownMs: 1000,
  },
  {
    id: WeaponType.RIFLE,
    name: 'Rifle',
    damage: 30,
    speed: 700,
    range: 1000,
    cooldownMs: 150,
  },
  {
    id: WeaponType.SNIPER,
    name: 'Sniper',
    damage: 100,
    speed: 1300,
    range: 1300,
    cooldownMs: 1200,
  },
  {
    id: WeaponType.SHOTGUN,
    name: 'Shotgun',
    damage: 8, // Per pellet
    speed: 700,
    range: 700,
    cooldownMs: 1200,
    pelletCount: 12,
    spreadAngle: 8,
  },
]

// Helper function to get weapon by id
export function getWeaponById(id: WeaponTypeValue): WeaponData | undefined {
  return WEAPONS.find((w) => w.id === id)
}

// Helper function to get weapon by index (for hotbar)
export function getWeaponByIndex(index: number): WeaponData | undefined {
  return WEAPONS[index]
}

// ===== ENTITY CONFIG =====
export const ENTITY_CONFIG = {
  PLAYER: {
    MAX_HP: 100,
    SPEED: 180, // px/s
  },
  DUMMY: {
    COUNT: 20,
    MAX_HP: 100,
    RESPAWN_TIME_MS: 1000,
    SHOOT_INTERVAL_MS: 10,
    SPAWN_MARGIN: 100,
    MIN_DISTANCE_FROM_PLAYER: 200,
  },
}

// ===== GAME RULES (Reserved for future) =====
export const GAME_RULES = {
  // Placeholder for future game rules
  // FRIENDLY_FIRE: false,
  // MAX_PLAYERS: 10,
  // ROUND_TIME_MS: 300000,
}
