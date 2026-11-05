import type { KonvaEventObject } from "konva/lib/Node"
import { useState } from "react"
import { Group, Rect, Text } from "react-konva"
import { CanvasDeleteButton } from "@/components/Boards/CanvasDeleteButton"
import { POSTIT_HEIGHT, POSTIT_WIDTH } from "@/components/Boards/PostItNode"
import { useFadeIn } from "@/hooks/useMountAnimation"
import { useSuppressClickAfterDrag } from "@/hooks/useSuppressClickAfterDrag"
import { setCanvasCursor } from "@/lib/konva-cursor"

export const FOLDER_CORNER_RADIUS = 18
export const FOLDER_OUTLINE = "#1F2937"
// Single source of truth for the count badge appearance.
// Change size / colors / font here — Rect + Text below both derive from this.
// The badge is centered exactly on the folder's top-right corner.
export const FOLDER_COUNT_BADGE = {
  size: 54,
  radius: 8,
  strokeWidth: 2.5,
  fontSize: 17,
  fontStyle: "bold" as const,
  shadowColor: "#1F2937",
  shadowBlur: 4,
  shadowOpacity: 0.18,
} as const
// Kept for backwards-compat with existing imports; prefer FOLDER_COUNT_BADGE.
const FOLDER_BADGE_X = POSTIT_WIDTH - FOLDER_COUNT_BADGE.size / 2
const FOLDER_BADGE_Y = -FOLDER_COUNT_BADGE.size / 2
const FOLDER_TEXT = "#1F2937"
const FOLDER_MUTED_TEXT = "#92400E"

interface FolderNodeProps {
  x: number
  y: number
  color: string
  count: number
  /** Representative text (first member), shown centered like a post-it. */
  label?: string
  /** Custom group name; shown instead of the label when set. */
  name?: string
  /** Hide the count badge, e.g. while the name editor covers the folder. */
  hideBadge?: boolean
  /** Seconds to wait before playing, for staggered entrances. */
  enterDelay?: number
  draggable?: boolean
  dragBoundFunc?: (position: { x: number; y: number }) => {
    x: number
    y: number
  }
  onExpand: () => void
  onDelete: () => void
  onRename?: () => void
  onDragEnd?: (color: string, position: { x: number; y: number }) => void
}

export function FolderNode({
  x,
  y,
  color,
  count,
  label = "",
  name = "",
  hideBadge = false,
  enterDelay = 0,
  draggable = true,
  dragBoundFunc,
  onExpand,
  onDelete,
  onRename,
  onDragEnd,
}: FolderNodeProps) {
  // Fade-in for collapsing. Opacity-only: scaling would move hit areas
  // and misdirect fast clicks.
  const popRef = useFadeIn({ delay: enterDelay, duration: 0.26 })
  // Hover and drag only lift the shadow and swap the cursor; nothing scales,
  // so the hit area stays exactly where it is.
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  // Clicking expands, dragging moves — suppress the click that fires after a drag.
  const { markDragEnd, wasJustDragging } = useSuppressClickAfterDrag()
  const handleClick = (event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true
    if (wasJustDragging()) return
    onExpand()
  }

  const handleTap = (event: KonvaEventObject<TouchEvent>) => {
    event.cancelBubble = true
    if (wasJustDragging()) return
    onExpand()
  }

  const handleDragStart = (event: KonvaEventObject<DragEvent>) => {
    setIsDragging(true)
    setCanvasCursor(event, "grabbing")
  }

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    event.cancelBubble = true
    setIsDragging(false)
    setCanvasCursor(event, "grab")
    markDragEnd()
    onDragEnd?.(color, { x: event.target.x(), y: event.target.y() })
  }

  const handleMouseEnter = (event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true
    setIsHovered(true)
    setCanvasCursor(event, "grab")
  }

  const handleMouseLeave = (event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true
    setIsHovered(false)
    if (!event.target.isDragging()) setCanvasCursor(event, "")
  }

  const displayLabel = name.trim() ? name : label
  return (
    <Group
      x={x}
      y={y}
      name={`folder-${color}`}
      draggable={draggable}
      dragBoundFunc={dragBoundFunc}
      onClick={handleClick}
      onTap={handleTap}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Group
        ref={popRef}
        x={POSTIT_WIDTH / 2}
        y={POSTIT_HEIGHT / 2}
        offsetX={POSTIT_WIDTH / 2}
        offsetY={POSTIT_HEIGHT / 2}
      >
        <Rect
          width={POSTIT_WIDTH}
          height={POSTIT_HEIGHT}
          fill={color}
          stroke={FOLDER_OUTLINE}
          strokeWidth={3}
          cornerRadius={FOLDER_CORNER_RADIUS}
          shadowColor="#92400E"
          shadowBlur={isDragging ? 22 : isHovered ? 16 : 10}
          shadowOpacity={isDragging ? 0.3 : isHovered ? 0.24 : 0.16}
          shadowOffsetY={isDragging ? 6 : isHovered ? 5 : 3}
          perfectDrawEnabled={false}
        />
        {displayLabel && (
          <Text
            x={16}
            y={16}
            width={POSTIT_WIDTH - 32}
            height={POSTIT_HEIGHT - 32}
            align="center"
            verticalAlign="middle"
            text={displayLabel}
            fontSize={20}
            lineHeight={1.3}
            fill={FOLDER_TEXT}
            wrap="word"
            ellipsis
            listening={false}
          />
        )}
        {!hideBadge && (
          <>
            <Rect
              x={FOLDER_BADGE_X}
              y={FOLDER_BADGE_Y}
              width={FOLDER_COUNT_BADGE.size}
              height={FOLDER_COUNT_BADGE.size}
              fill={color}
              stroke={FOLDER_OUTLINE}
              strokeWidth={FOLDER_COUNT_BADGE.strokeWidth}
              cornerRadius={FOLDER_COUNT_BADGE.radius}
              shadowColor={FOLDER_COUNT_BADGE.shadowColor}
              shadowBlur={FOLDER_COUNT_BADGE.shadowBlur}
              shadowOpacity={FOLDER_COUNT_BADGE.shadowOpacity}
              listening={false}
            />
            <Text
              x={FOLDER_BADGE_X}
              y={FOLDER_BADGE_Y}
              width={FOLDER_COUNT_BADGE.size}
              height={FOLDER_COUNT_BADGE.size}
              align="center"
              verticalAlign="middle"
              text={String(count)}
              fontSize={FOLDER_COUNT_BADGE.fontSize}
              fontStyle={FOLDER_COUNT_BADGE.fontStyle}
              fill={FOLDER_TEXT}
              listening={false}
            />
          </>
        )}
        <CanvasDeleteButton
          x={POSTIT_WIDTH - 36}
          y={POSTIT_HEIGHT - 36}
          onDelete={onDelete}
        />
        {onRename && (
          <Group
            x={8}
            y={POSTIT_HEIGHT - 36}
            onClick={(event) => {
              event.cancelBubble = true
              onRename()
            }}
            onTap={(event) => {
              event.cancelBubble = true
              onRename()
            }}
          >
            <Rect width={28} height={28} fill="transparent" cornerRadius={6} />
            <Text
              x={6}
              y={5}
              text="✎"
              fontSize={17}
              fill={FOLDER_MUTED_TEXT}
              listening={false}
            />
          </Group>
        )}
      </Group>
    </Group>
  )
}
