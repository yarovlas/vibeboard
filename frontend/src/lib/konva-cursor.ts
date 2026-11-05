import type { KonvaEventObject } from "konva/lib/Node"

type CursorEvent = KonvaEventObject<MouseEvent> | KonvaEventObject<DragEvent>

/**
 * Konva draws to a canvas, so the cursor has to be set on the stage container
 * explicitly. An empty string restores the stylesheet cursor.
 */
export function setCanvasCursor(event: CursorEvent, cursor: string) {
  const container = event.target.getStage()?.container()
  if (container) container.style.cursor = cursor
}
