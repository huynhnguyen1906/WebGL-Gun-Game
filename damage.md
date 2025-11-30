# Damage System & Entity Architecture

## 📋 Tổng quan yêu cầu

### Mục tiêu chính

- Implement hệ thống HP/Damage cho tất cả entities (Player + Dummy)
- Tạo Dummy Player để test damage system
- Chuẩn bị kiến trúc code cho tính năng online sau này
- Tách config để dễ dàng chuyển sang backend control

---

## 🎯 Damage System (Hybrid Approach)

### Nguyên tắc tính damage

- **Damage cố định theo từng loại súng** (không theo tốc độ đạn)
- Balance dựa trên **DPS** (Damage Per Second)
- Fire rate nhanh → damage/hit thấp, Fire rate chậm → damage/hit cao

### Weapon Stats

- ví dụ:

| Weapon  | Damage | Cooldown | DPS | Notes                      |
| ------- | ------ | -------- | --- | -------------------------- |
| Pistol  | 20     | 1000ms   | 20  | Starter, reliable          |
| Rifle   | 30     | 150ms    | 200 | Spray, high DPS            |
| Sniper  | 100    | 1200ms   | 100 | Burst, punish misses       |
| Shotgun | 8×12   | 1200ms   | 80  | 96 max damage, close range |

### HP System

| Entity | HP  | Notes                          |
| ------ | --- | ------------------------------ |
| Player | 100 | Game over khi HP = 0           |
| Dummy  | 100 | +1 điểm khi kill, auto respawn |

---

## 🤖 Dummy Player

### Behavior

- **Spawn**: Random vị trí trong map (tránh padding, tránh gần player)
- **Movement**: Không di chuyển (đứng yên)
- **Shooting**:
  - Bắn 1 phát mỗi **1 giây**
  - Góc bắn **ngẫu nhiên** (0-360°)
  - Súng **ngẫu nhiên** (1 trong 4 loại)
- **Death**: Respawn sau X giây tại vị trí mới

### Config (từ serverConfig)

```ts
DUMMY: {
  COUNT: 10,                    // Số lượng dummy
  MAX_HP: 100,
  RESPAWN_TIME_MS: 3000,       // 3s respawn
  SHOOT_INTERVAL_MS: 1000,     // Bắn mỗi 1s
  SPAWN_MARGIN: 100,           // Tránh edge
  MIN_DISTANCE_FROM_PLAYER: 200,
}
```

---

## 🎮 Game Flow

### Player Death

1. HP = 0 → Hiện **"GAME OVER"** overlay
2. Hiện **nút "RESPAWN"**
3. Click respawn → Reset HP, random vị trí mới, reset điểm (?)

### Scoring

- Kill 1 dummy = **+1 điểm**
- Leaderboard hiển thị ở **góc trên bên phải**
- Format: `Score: 5` hoặc dạng table cho online sau này

---

## 📁 Cấu trúc Config

### `gameConfig.ts` (Client-only, visual)

```ts
- MAP: size, tile, colors, padding
- CAMERA: follow lerp
- PLAYER: radius, color, shadow, arm visual
- BULLET: radius, color (visual only)
- TICK: max delta time
```

### `serverConfig.ts` (Backend-controlled, sẽ từ socket sau này)

```ts
- WEAPONS[]: id, name, damage, speed, range, cooldown, pellets, spread
- ENTITY_CONFIG:
  - PLAYER: maxHp, speed
  - DUMMY: count, maxHp, respawnTime, shootInterval, spawnMargin
- GAME_RULES: {} // Reserved for future
```

---

## 🏗️ Entity Architecture

```
                    ┌─────────────────────┐
                    │     BaseEntity      │
                    │  - hp, maxHp        │
                    │  - x, y, rotation   │
                    │  - takeDamage()     │
                    │  - isAlive          │
                    │  - render()         │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼─────────┐ ┌────────▼────────┐ ┌─────────▼─────────┐
│      Player       │ │   DummyPlayer   │ │   RemotePlayer    │
│  - input (WASD)   │ │  - no input     │ │   (Future)        │
│  - weapon switch  │ │  - auto shoot   │ │  - from socket    │
│  - local control  │ │  - random aim   │ │  - interpolation  │
└───────────────────┘ └─────────────────┘ └───────────────────┘
                             ↓
                    [XÓA khi có online]
                    [Thay bằng RemotePlayer]
```

---

## 🔌 Online-Ready Design

### Nguyên tắc thiết kế

1. **Tách logic damage** → function riêng, dễ replace bằng server validation
2. **Tách scoring** → function riêng, sau này server sẽ track
3. **Config từ serverConfig.ts** → Sau này replace bằng socket data
4. **DummyPlayer tách riêng** → Xóa sạch khi có online, không ảnh hưởng core

### Các hàm cần tách riêng (dễ replace)

```ts
// damage.ts - Sau này server validate
function applyDamage(target: BaseEntity, amount: number): void

// scoring.ts - Sau này server track
function addScore(playerId: string, points: number): void
function getLeaderboard(): ScoreEntry[]

// spawning.ts - Sau này server quyết định
function getSpawnPosition(): { x: number; y: number }
```

### Khi chuyển sang Online

1. Xóa `DummyPlayer.ts`
2. Thêm `RemotePlayer.ts` (nhận position từ socket)
3. Replace `serverConfig.ts` bằng socket data
4. Server validate damage, client chỉ render

---

## 📝 Implementation Checklist

### Config

- [ ] Tạo `serverConfig.ts` với WEAPONS, ENTITY_CONFIG, GAME_RULES
- [ ] Refactor `gameConfig.ts` chỉ giữ visual config
- [ ] Update imports trong các file

### Entity System

- [ ] Tạo `BaseEntity.ts` với HP system
- [ ] Refactor `Player.ts` extends BaseEntity
- [ ] Tạo `DummyPlayer.ts` extends BaseEntity
- [ ] Implement auto-shoot cho Dummy

### Damage & Collision

- [ ] Bullet mang damage value
- [ ] Collision detection (bullet vs entity)
- [ ] Apply damage khi hit
- [ ] Death handling (player + dummy)

### UI

- [ ] HP bar cho Player (và Dummy?)
- [ ] Game Over overlay
- [ ] Respawn button
- [ ] Score counter (top-right leaderboard style)

### Scoring

- [ ] Track kills
- [ ] Display score
- [ ] Reset on respawn (?)

---

## 🔮 Future Considerations

- **Headshot multiplier?** - Có thể thêm sau
- **Damage falloff theo distance?** - Phức tạp, skip cho demo
- **Armor system?** - Reserved cho future
- **Different HP cho different entity types?** - Đã support qua config
