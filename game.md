# Demo game bắn súng 2D bằng PixiJS

_(nguyên mẫu từ survev.io – chỉ lấy cảm hứng về “feel”, không clone nội dung hay asset)_

## 1) Phạm vi & mục tiêu

- Làm **prototype** chạy được trên trình duyệt: 1 nhân vật, di chuyển WASD (có chéo), quay theo chuột, bắn đạn bằng click chuột.
- Bản demo tập trung **đúng 2 thứ**: cảm giác di chuyển + cảm giác bắn. Không làm UI, network, hay tối ưu phức tạp ở giai đoạn này.

---

## 2) Tính năng bắt buộc

### 2.1 Map (demo)

- Kích thước: **3000×3000 px**.
- Lưới gạch: **ô 32×32 px** để quan sát chuyển động.
- Màu nền: vàng nhạt (gợi ý: wheat系).
- **Padding 32 px** ở bốn cạnh (khoảng trống không thể đi vào).
- Camera: **follow player**, clamp để không lộ viền ngoài map.

### 2.2 Nhân vật (char)

- Hình dạng: **thân là 1 hình tròn** có bóng (shadow nhẹ).
- **2 tay**: mỗi tay là một hình tròn nhỏ, **gắn lệch kiểu chữ “V”** mở về phía trước (đáy “V” ở thân).
- **Hướng mặt** = hướng “V” mở ra. Con trỏ chuột quay đâu, “V” + thân quay **mượt** theo đó (interpolate nhẹ nếu cần).
- **Spawn**: mỗi lần vào map, random vị trí **bên trong map trừ padding** (không spawn sát mép).

### 2.3 Điều khiển

- **W/A/S/D** để di chuyển, **cho phép di chuyển chéo** (normalize vector).
- Tốc độ di chuyển cấu hình được trong `config`.
- Chuột quyết định hướng quay (thân + tay đồng bộ).

### 2.4 Bắn đạn (core mechanic)

- **Click chuột** → bắn 1 viên.
- **Cooldown**: 100 ms/lần bắn (auto-fire khi giữ chuột **không** bắt buộc ở bản này; click liên tục là đủ).
- **Tầm bay**: 500 px.
- **Tốc độ**: hoàn thành 500 px trong **0.5 s** ⇒ **1000 px/s**.
- Hết tầm thì **hủy đạn** (không cần va chạm ở bản demo).

---

## 3) Cấu hình – **không hard-code**

Tách **1 file config** (TypeScript hoặc JSON). Toàn bộ con số dưới đây lấy từ config, không viết chết trong code.

**Gợi ý `src/config/gameConfig.ts`:**

```ts
export const GAME_CONFIG = {
  MAP: {
    SIZE: 3000, // px
    TILE: 32, // px
    PADDING: 32, // px
    COLOR_BG: 0xf3e5ab, // map background
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
      OFFSET_DISTANCE: 14, // distance from arm center to body center
      SPREAD_RAD: 0.6, // V spread angle (radian), ~34°
      COLOR: 0x222222,
    },
    SPAWN_MARGIN: 64, // avoid spawning too close to edge (>= PADDING)
  },
  BULLET: {
    RADIUS: 3, // px
    COLOR: 0xffa500,
    SPEED: 1000, // px/s (500px trong 0.5s)
    RANGE: 500, // px
    COOLDOWN_MS: 100, // delay between shots
  },
  TICK: {
    MAX_DT_MS: 50, // clamp dt to avoid jitter
  },
}
```

> Lưu ý: **TTL đạn** = `RANGE / SPEED` (tự tính trong code từ config). Không nhập TTL trực tiếp để tránh lệch.

---

## 4) Tiêu chí hoàn thành (Acceptance Criteria)

- Mở app → thấy **map 3000×3000** có **lưới 32×32** và nền vàng nhạt; có padding 32 px không đi vào được.
- Nhân vật **tròn có bóng** + **2 tay tròn** tạo thành chữ V, **quay theo chuột** tức thời, không lag gợi ý hướng.
- **W/A/S/D**: di chuyển **trơn tru**, có chéo (giữ W+D…), không bị rung/blur ô lưới.
- **Click**: bắn đạn theo hướng con trỏ, cooldown **100 ms**. Mỗi viên bay **~0.5 s** rồi biến mất, quãng đường **~500 px**.
- **Spawn**: reload trang nhiều lần → vị trí xuất hiện khác nhau nhưng luôn **trong vùng hợp lệ** (không đè padding).
- **Mọi tham số** (kích thước, màu, speed, cooldown…) **đổi bằng config** là có hiệu lực ngay (không sửa logic).
