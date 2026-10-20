import type { KonvaEventObject } from "konva/lib/Node"
import { Group, Rect, Text } from "react-konva"

import type { PostItPriority, PostItPublic, PostItStatus } from "@/client"
import { CanvasDeleteButton } from "@/components/Boards/CanvasDeleteButton"
import { useFadeIn } from "@/hooks/useMountAnimation"

export const POSTIT_WIDTH = 220
export const POSTIT_HEIGHT = 180
export const POSTIT_DEFAULT_COLOR = "#FEF3C7"
export const POSTIT_COLORS = [
  { name: "yellow", value: "#FEF3C7" },
  { name: "orange", value: "#FED7AA" },
  { name: "pink", value: "#FBCFE8" },
  { name: "blue", value: "#BFDBFE" },
  { name: "green", value: "#BBF7D0" },
  { name: "purple", value: "#DDD6FE" },
] as const
const POSTIT_TEXT = "#1F2937"
const POSTIT_MUTED_TEXT = "#92400E"

export const STATUS_LABELS: Record<PostItStatus, string> = {
  TODO: "TODO",
  IN_PROGRESS: "IN PROGRESS",
  DONE: "DONE",
}

const STATUS_STYLES: Record<PostItStatus, { fill: string; text: string }> = {
  TODO: { fill: "#64748B", text: "#FFFFFF" },
  IN_PROGRESS: { fill: "#2563EB", text: "#FFFFFF" },
  DONE: { fill: "#16A34A", text: "#FFFFFF" },
}

// Left-edge urgency strip; a post-it without priority shows no strip.
const PRIORITY_STRIP_COLORS: Record<PostItPriority, string> = {
  LOW: "#94A3B8",
  MEDIUM: "#FBBF24",
  HIGH: "#F87171",
}
const PRIORITY_STRIP_WIDTH = 6

// Due-date badge in the bottom-left corner, styled like the folder badge.
const DUE_BADGE = {
  height: 20,
  radius: 10,
  fontSize: 11,
  paddingX: 8,
} as const

/**
 * Render an ISO date (YYYY-MM-DD) as a compact badge, e.g. "3 nov".
 * Parsed as a UTC date so timezones never shift the calendar day.
 */
function formatDueDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

export type BoardPostIt = {
  id: string
  board_id: string
  title: string
  content: string
  x: number
  y: number
  color: string
  status: PostItStatus
  priority: PostItPriority | null
  due_date: string | null
}

export function normalizePostIt(postit: PostItPublic): BoardPostIt {
  return {
    id: postit.id,
    board_id: postit.board_id,
    title: postit.title ?? "",
    content: postit.content ?? "",
    x: postit.x ?? 0,
    y: postit.y ?? 0,
    color: postit.color ?? POSTIT_DEFAULT_COLOR,
    status: postit.status ?? "TODO",
    priority: postit.priority ?? null,
    due_date: postit.due_date ?? null,
  }
}

interface PostItNodeProps {
  postit: BoardPostIt
  isEditing: boolean
  isDrawing?: boolean
  isSelected?: boolean
  /** Seconds to wait before playing, for staggered entrances. */
  enterDelay?: number
  onEdit: (postit: BoardPostIt) => void
  onDelete: (postit: BoardPostIt) => void
  onSelect?: (postit: BoardPostIt) => void
  onDragEnd?: (postit: BoardPostIt, position: { x: number; y: number }) => void
  dragBoundFunc?: (position: { x: number; y: number }) => {
    x: number
    y: number
  }
}

export function PostItNode({
  postit,
  isEditing,
  isDrawing = false,
  isSelected = false,
  enterDelay = 0,
  onEdit,
  onDelete,
  onSelect,
  onDragEnd,
  dragBoundFunc,
}: PostItNodeProps) {
  // Fade-in so expanding a folder (ungrouping) feels smooth. Opacity-only:
  // scaling would move hit areas and misdirect fast clicks.
  const popRef = useFadeIn({ delay: enterDelay, duration: 0.24 })

  const text = postit.title
    ? `${postit.title}${postit.content ? `\n${postit.content}` : ""}`
    : postit.content

  const statusLabel = STATUS_LABELS[postit.status] ?? "TODO"
  const statusStyle = STATUS_STYLES[postit.status] ?? STATUS_STYLES.TODO
  const statusPillWidth = Math.ceil(statusLabel.length * 6.6) + 16

  const handleDoubleClick = (event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true
    onEdit(postit)
  }

  const handleClick = (event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true
    onSelect?.(postit)
  }

  const handleTap = (event: KonvaEventObject<TouchEvent>) => {
    event.cancelBubble = true
    onSelect?.(postit)
  }

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    event.cancelBubble = true
    onDragEnd?.(postit, { x: event.target.x(), y: event.target.y() })
  }

  return (
    <Group
      x={postit.x}
      y={postit.y}
      name={`postit-${postit.id}`}
      draggable={!isEditing && !isDrawing}
      dragBoundFunc={dragBoundFunc}
      onClick={handleClick}
      onTap={handleTap}
      onDblClick={handleDoubleClick}
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
          fill={postit.color || POSTIT_DEFAULT_COLOR}
          cornerRadius={10}
          shadowColor="#92400E"
          shadowBlur={12}
          shadowOpacity={0.18}
          shadowOffsetY={4}
          perfectDrawEnabled={false}
        />
        {!isEditing && postit.priority && (
          <Rect
            width={PRIORITY_STRIP_WIDTH}
            height={POSTIT_HEIGHT}
            fill={PRIORITY_STRIP_COLORS[postit.priority]}
            cornerRadius={[10, 0, 0, 10]}
            listening={false}
          />
        )}
        {isSelected && (
          <Rect
            width={POSTIT_WIDTH}
            height={POSTIT_HEIGHT}
            cornerRadius={10}
            fillEnabled={false}
            stroke="#2563EB"
            strokeWidth={3}
            listening={false}
          />
        )}
        {!isEditing && (
          <Group x={12} y={10} listening={false}>
            <Rect
              width={statusPillWidth}
              height={18}
              cornerRadius={9}
              fill={statusStyle.fill}
            />
            <Text
              x={8}
              y={3}
              width={statusPillWidth - 16}
              text={statusLabel}
              fontSize={11}
              fill={statusStyle.text}
              wrap="none"
            />
          </Group>
        )}
        {!isEditing && (
          <Text
            x={16}
            y={38}
            width={POSTIT_WIDTH - 32}
            height={POSTIT_HEIGHT - 38 - 16}
            text={text || "Write a thought..."}
            fontSize={16}
            lineHeight={1.35}
            fill={text ? POSTIT_TEXT : POSTIT_MUTED_TEXT}
            wrap="word"
            ellipsis
            listening={false}
          />
        )}
        {!isEditing && (
          <CanvasDeleteButton
            x={POSTIT_WIDTH - 36}
            y={8}
            onDelete={() => onDelete(postit)}
          />
        )}
        {!isEditing && postit.due_date && (
          <Text
            x={12}
            y={POSTIT_HEIGHT - DUE_BADGE.height - 10}
            width={
              formatDueDate(postit.due_date).length * 6.4 +
              DUE_BADGE.paddingX * 2
            }
            height={DUE_BADGE.height}
            align="center"
            verticalAlign="middle"
            text={formatDueDate(postit.due_date)}
            fontSize={DUE_BADGE.fontSize}
            fill="#7C2D12"
            background="rgba(255, 255, 255, 0.65)"
            cornerRadius={DUE_BADGE.radius}
            listening={false}
          />
        )}
      </Group>
    </Group>
  )
}
