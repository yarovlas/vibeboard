import type { CSSProperties } from "react"

import { clampPosition } from "@/lib/board-geometry"

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4
/** Multiplier for the toolbar zoom buttons. */
export const ZOOM_BUTTON_STEP = 1.2
/** Multiplier per mouse-wheel notch. */
export const ZOOM_WHEEL_STEP = 1.08

export interface Point {
  x: number
  y: number
}

/**
 * The whiteboard camera: `scale` is the zoom factor, `x`/`y` the screen-space
 * translation of the board origin (and therefore also the pan offset).
 */
export interface BoardViewport {
  scale: number
  x: number
  y: number
}

export const DEFAULT_VIEWPORT: BoardViewport = { scale: 1, x: 0, y: 0 }

export function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))
}

/** Zoom while keeping the board point under `anchor` (screen pixels) still. */
export function zoomAtPoint(
  viewport: BoardViewport,
  nextScale: number,
  anchor: Point,
): BoardViewport {
  const scale = clampZoom(nextScale)
  if (scale === viewport.scale) return viewport
  // The board point currently under the anchor must stay under it.
  const boardX = (anchor.x - viewport.x) / viewport.scale
  const boardY = (anchor.y - viewport.y) / viewport.scale
  return {
    scale,
    x: anchor.x - boardX * scale,
    y: anchor.y - boardY * scale,
  }
}

export function toScreenPoint(viewport: BoardViewport, point: Point): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y,
  }
}

export function toBoardPoint(viewport: BoardViewport, point: Point): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  }
}

/**
 * Konva passes dragBoundFunc positions in screen coordinates, while the board
 * stores unscaled coordinates. Convert before clamping and back afterwards so
 * dragging keeps working at every zoom level.
 */
export function clampDragPosition(
  position: Point,
  canvasSize: { width: number; height: number },
  viewport: BoardViewport,
): Point {
  const clamped = clampPosition(toBoardPoint(viewport, position), canvasSize)
  return toScreenPoint(viewport, clamped)
}

/**
 * CSS for an HTML overlay that mirrors a board rectangle at the current zoom:
 * the anchor is converted to screen space and the element itself is scaled.
 */
export function scaledOverlayStyle(
  viewport: BoardViewport,
  x: number,
  y: number,
): CSSProperties {
  return {
    left: x * viewport.scale + viewport.x,
    top: y * viewport.scale + viewport.y,
    transform: `scale(${viewport.scale})`,
    transformOrigin: "top left",
  }
}
