# Backend Readiness Assessment

## ✅ Đã Chuẩn Backend

### 1. Weapon System

- ✅ Tất cả weapon stats trong `serverConfig.ts`
- ✅ Damage, speed, range, cooldown từ server
- ✅ Client chỉ render bullets

### 2. Entity System

- ✅ HP, damage calculation ở server
- ✅ Client chỉ render entities và HP bars
- ✅ BaseEntity architecture chuẩn cho networking

### 3. Collision System

- ✅ Server tính collision
- ✅ Client nhận damage events và update HP

### 4. Inventory System

- ✅ Weapon switching logic tách rời
- ✅ Ammo tracking có thể sync từ server

## ⚠️ Cần Chỉnh Sửa

### 1. Box System

**Vấn đề:** Hardcoded HP, radius, scale trong `Box.ts`

**Giải pháp:**

```typescript
// serverConfig.ts - THÊM
export const BOX_CONFIG = {
  MAX_HP: 30,
  RADIUS: 35,
  SPAWN_RADIUS: 50, // Item drop radius
  SCALE_THRESHOLDS: [
    { hp: 20, scale: 1.0 }, // 30-21 HP
    { hp: 10, scale: 0.8 }, // 20-11 HP
    { hp: 0, scale: 0.6 }, // 10-1 HP
  ],
}
```

**Khi online:**

- Server: `socket.emit('box_spawn', {id, x, y, content, hp})`
- Client: Render box tại vị trí server cho
- Server: `socket.emit('box_damage', {id, hp})`
- Client: Update scale dựa trên HP

### 2. ItemSpawnManager

**Vấn đề:** Client tự random spawn positions và counts

**Giải pháp:**

```typescript
// Server quyết định tất cả spawns
socket.emit('initial_boxes', [
  { id: 1, x: 1500, y: 2000, content: { type: 'weapon', weaponType: 'RIFLE' } },
  { id: 2, x: 2500, y: 1500, content: { type: 'healing' } },
  // ...
])

// Khi box vỡ
socket.emit('box_destroyed', {
  boxId: 1,
  item: { id: 101, x: 1520, y: 2030, weaponType: 'RIFLE', magazine: 30, reserve: 60 },
})
```

**Chỉnh trong code:**

- `spawnInitialItems()` → Xóa logic spawn
- Thêm `receiveBoxSpawns(boxes[])` → Render boxes từ server data
- `checkDestroyedBoxes()` → Gửi event lên server thay vì tự spawn item

### 3. Healing System

**Vấn đề:** Hardcoded values trong code

**Giải pháp:**

```typescript
// serverConfig.ts - THÊM
export const HEALING_CONFIG = {
  CHANNEL_TIME_MS: 5000,
  HEAL_AMOUNT: 50,
  MAX_STACK: 3,
  INTERRUPT_ON_MOVE: true,
  INTERRUPT_ON_DAMAGE: true,
}
```

**Update trong:**

- `HealingChannelUI.ts` → Dùng `HEALING_CONFIG.CHANNEL_TIME_MS`
- `PlayerInventory.ts` → Dùng `HEALING_CONFIG.MAX_STACK`
- `GameManager.ts` → Dùng `HEALING_CONFIG.HEAL_AMOUNT`

### 4. Melee Attack Range

**Vấn đề:** Check collision logic ở client

**Khi online:**

- Client: `socket.emit('melee_attack', {targetX, targetY})`
- Server: Tính entities/boxes trong range → apply damage
- Client: Nhận `damage_applied` events → update visuals

## 📝 Action Items Để Chuẩn Backend

### Priority 1: Config Centralization

- [ ] Add `BOX_CONFIG` to serverConfig.ts
- [ ] Add `HEALING_CONFIG` to serverConfig.ts
- [ ] Add `PICKUP_CONFIG` to serverConfig.ts (range, prompt text)

### Priority 2: Networking Preparation

- [ ] Refactor ItemSpawnManager → `receiveBoxSpawns()`
- [ ] Refactor Box damage → Event-driven
- [ ] Refactor melee attack → Server validation ready

### Priority 3: Testing

- [ ] Test với mock server data
- [ ] Verify tất cả game logic có thể override từ server
- [ ] Test lag simulation

## 🔄 Online Flow (Khi Ready)

### Game Init

```typescript
socket.on('game_init', (data) => {
  // Override configs
  Object.assign(WEAPONS, data.weapons)
  Object.assign(BOX_CONFIG, data.boxConfig)
  Object.assign(HEALING_CONFIG, data.healingConfig)

  // Spawn entities
  receiveBoxSpawns(data.boxes)
  receivePlayers(data.players)
})
```

### Real-time Sync

```typescript
socket.on('box_damaged', ({ id, hp }) => box.updateHP(hp))
socket.on('box_destroyed', ({ boxId, item }) => spawnItem(item))
socket.on('item_picked', ({ itemId, playerId }) => removeItem(itemId))
socket.on('entity_damaged', ({ id, hp }) => entity.updateHP(hp))
```

## ✅ Kết Luận

**Đã tốt (80%):**

- Weapon system
- Damage calculation
- Entity architecture

**Cần chỉnh (20%):**

- Box config → serverConfig
- Healing config → serverConfig
- ItemSpawnManager → Event-driven
- Melee range check → Server validation

**Thời gian ước tính:** 2-3 giờ để chỉnh hoàn chỉnh
