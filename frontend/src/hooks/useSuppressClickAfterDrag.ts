import type { KonvaEventObject } from "konva/lib/Node"
import { useRef } from "react"

/**
 * Clicking a Konva node expands/selects, dragging moves it — suppress the
 * click that fires right after a drag.
 */
export function useSuppressClickAfterDrag(windowMs = 250) {
  const lastDragEnd = useRef(0)

  const markDragEnd = () => {
    lastDragEnd.current = Date.now()
  }

  const wasJustDragging = () => Date.now() - lastDragEnd.current < windowMs

  const cancelBubble = (
    event:
      | KonvaEventObject<MouseEvent>
      | KonvaEventObject<TouchEvent>
      | KonvaEventObject<DragEvent>,
  ) => {
    event.cancelBubble = true
  }

  return { markDragEnd, wasJustDragging, cancelBubble }
}
