/** Matches main game facing directions (app/types/enum/Game.ts). */
export enum Orientation {
  DOWN = "0",
  DOWNRIGHT = "1",
  RIGHT = "2",
  UPRIGHT = "3",
  UP = "4",
  UPLEFT = "5",
  LEFT = "6",
  DOWNLEFT = "7"
}

/**
 * Same logic as app/utils/orientation.ts getOrientation.
 * Uses Phaser screen velocity: W = vy < 0, S = vy > 0.
 */
export function getOrientation(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Orientation {
  let angle = Math.atan2(y2 - y1, x2 - x1)
  if (angle < 0) {
    angle += 2 * Math.PI
  }
  const quarterPi = Math.PI / 4
  if (angle < quarterPi) {
    return Orientation.RIGHT
  }
  if (angle < 2 * quarterPi) {
    return Orientation.DOWNRIGHT
  }
  if (angle < 3 * quarterPi) {
    return Orientation.DOWN
  }
  if (angle < 4 * quarterPi) {
    return Orientation.DOWNLEFT
  }
  if (angle < 5 * quarterPi) {
    return Orientation.LEFT
  }
  if (angle < 6 * quarterPi) {
    return Orientation.UPLEFT
  }
  if (angle < 7 * quarterPi) {
    return Orientation.UP
  }
  if (angle < 8 * quarterPi) {
    return Orientation.UPRIGHT
  }
  return Orientation.RIGHT
}

/** Map WASD velocity (screen space) to sprite facing. */
export function orientationFromVelocity(vx: number, vy: number): Orientation {
  if (vx === 0 && vy === 0) return Orientation.DOWN
  return getOrientation(0, 0, vx, vy)
}
