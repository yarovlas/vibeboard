import { POSTIT_HEIGHT, POSTIT_WIDTH } from "@/components/Boards/PostItNode"

export const FOLDER_ROW_X = 40
export const FOLDER_ROW_Y = 40
export const FOLDER_GAP = 48
export const FOLDER_AUTO_COLLAPSE_MS = 10_000

export function createTemporaryId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `temporary-${globalThis.crypto.randomUUID()}`
  }
  return `temporary-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function clampPosition(
  position: { x: number; y: number },
  canvasSize: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: Math.min(
      Math.max(0, position.x),
      Math.max(0, canvasSize.width - POSTIT_WIDTH),
    ),
    y: Math.min(
      Math.max(0, position.y),
      Math.max(0, canvasSize.height - POSTIT_HEIGHT),
    ),
  }
}

export function dockPerRow(canvasWidth: number): number {
  return Math.max(
    1,
    Math.floor((canvasWidth - FOLDER_ROW_X) / (POSTIT_WIDTH + FOLDER_GAP)),
  )
}

export function dockSlotAt(
  slot: number,
  perRow: number,
): { x: number; y: number } {
  return {
    x: FOLDER_ROW_X + (slot % perRow) * (POSTIT_WIDTH + FOLDER_GAP),
    y: FOLDER_ROW_Y + Math.floor(slot / perRow) * (POSTIT_HEIGHT + FOLDER_GAP),
  }
}

// First dock slot whose box keeps a full gap from every taken box.
export function findFreeDockSlot(
  taken: { x: number; y: number }[],
  perRow: number,
): { x: number; y: number } {
  for (let slot = 0; slot < 500; slot++) {
    const position = dockSlotAt(slot, perRow)
    const blocked = taken.some(
      (box) =>
        Math.abs(box.x - position.x) < POSTIT_WIDTH + FOLDER_GAP &&
        Math.abs(box.y - position.y) < POSTIT_HEIGHT + FOLDER_GAP,
    )
    if (!blocked) return position
  }
  return dockSlotAt(500, perRow)
}
