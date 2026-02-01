/**
 * Math Utilities
 * Helper functions for game calculations
 */

export class MathUtils {
  // Calculate distance between two points
  static distance(x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Calculate angle between two points
  static angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1)
  }

  // Normalize vector
  static normalize(x, y) {
    const length = Math.sqrt(x * x + y * y)
    if (length === 0) return { x: 0, y: 0 }
    return { x: x / length, y: y / length }
  }

  // Clamp value between min and max
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max)
  }

  // Linear interpolation
  static lerp(start, end, t) {
    return start + (end - start) * t
  }

  // Round to decimal places
  static roundTo(value, decimals) {
    const multiplier = Math.pow(10, decimals)
    return Math.round(value * multiplier) / multiplier
  }
}
