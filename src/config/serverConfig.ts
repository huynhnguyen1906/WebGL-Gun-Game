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
  FIST: 'FIST',
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

  // Ammo system
  magazineSize?: number // Số đạn trong băng (undefined = melee/infinite)
  maxReserveAmmo?: number // Đạn dự trữ tối đa
  reloadTimeMs?: number // Thời gian reload
  infiniteAmmo?: boolean // Pistol = true
  isMelee?: boolean // Fist = true
}

export const WEAPONS: WeaponData[] = [
  {
    id: WeaponType.FIST,
    name: 'Fist',
    damage: 10,
    speed: 0,
    range: 35, // Melee range
    cooldownMs: 500,
    isMelee: true,
  },
  {
    id: WeaponType.PISTOL,
    name: 'Pistol',
    damage: 20,
    speed: 1000,
    range: 500,
    cooldownMs: 1000,
    magazineSize: 7,
    maxReserveAmmo: 999,
    reloadTimeMs: 1500,
    infiniteAmmo: true,
  },
  {
    id: WeaponType.RIFLE,
    name: 'Rifle',
    damage: 20,
    speed: 1000,
    range: 1000,
    cooldownMs: 150,
    magazineSize: 30,
    maxReserveAmmo: 60,
    reloadTimeMs: 2000,
  },
  {
    id: WeaponType.SNIPER,
    name: 'Sniper',
    damage: 100,
    speed: 1500,
    range: 1300,
    cooldownMs: 1200,
    magazineSize: 5,
    maxReserveAmmo: 20,
    reloadTimeMs: 2500,
  },
  {
    id: WeaponType.SHOTGUN,
    name: 'Shotgun',
    damage: 11, // Per pellet
    speed: 1000,
    range: 700,
    cooldownMs: 1200,
    pelletCount: 12,
    spreadAngle: 8,
    magazineSize: 6,
    maxReserveAmmo: 24,
    reloadTimeMs: 2000,
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

// ===== BOX CONFIG =====
export const BOX_CONFIG = {
  MAX_HP: 30,
  RADIUS: 35, // Collision radius
  SPAWN_RADIUS: 50, // Item drop radius when box destroyed
  SCALE_THRESHOLDS: [
    { minHp: 21, scale: 1.0 }, // 30-21 HP: Full size
    { minHp: 11, scale: 0.8 }, // 20-11 HP: 80% size
    { minHp: 1, scale: 0.6 }, // 10-1 HP: 60% size
  ],
}

// ===== PILLAR CONFIG =====
export const PILLAR_CONFIG = {
  RADIUS: 50, // Larger than box
  COUNT: 25, // Number of pillars on map
  COLOR: 0x8b7355, // Brown color
}

// ===== HEALING CONFIG =====
export const HEALING_CONFIG = {
  CHANNEL_TIME_MS: 5000, // 5 seconds to heal
  HEAL_AMOUNT: 50, // HP restored
  MAX_STACK: 3, // Max healing items in inventory
  INTERRUPT_ON_MOVE: true,
  INTERRUPT_ON_DAMAGE: true,
}

// ===== SPAWN CONFIG =====
export const SPAWN_CONFIG = {
  BOXES: {
    RIFLE: 6, // Increased from 3
    SNIPER: 5, // Increased from 2
    SHOTGUN: 5, // Increased from 2
    PISTOL: 10, // Increased from 3
    HEALING: 11, // Increased from 5
  },
  MIN_DISTANCE_BETWEEN_OBSTACLES: 150, // Min distance between boxes/pillars
  AVOID_PLAYER_RADIUS: 500, // Avoid spawning near player
}

// ===== GAME RULES (Reserved for future) =====
export const GAME_RULES = {
  // Placeholder for future game rules
  // FRIENDLY_FIRE: false,
  // MAX_PLAYERS: 10,
  // ROUND_TIME_MS: 300000,
}
