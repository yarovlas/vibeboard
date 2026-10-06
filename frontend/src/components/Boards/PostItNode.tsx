import type { KonvaEventObject } from "konva/lib/Node"
import { Group, Rect, Text } from "react-konva"

import type { PostItPublic } from "@/client"

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

export type BoardPostIt = {
  id: string
  board_id: string
  title: string
  content: string
  x: number
  y: number
  color: string
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
  }
}

interface PostItNodeProps {
  postit: BoardPostIt
  isEditing: boolean
  isDrawing?: boolean
  isSelected?: boolean
  onEdit: (postit: BoardPostIt) => void
  onDelete: (postit: BoardPostIt) => void
  onSelect?: (postit: BoardPostIt, additive: boolean) => void
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
  onEdit,
  onDelete,
  onSelect,
  onDragEnd,
  dragBoundFunc,
}: PostItNodeProps) {
  const text = postit.title
    ? `${postit.title}${postit.content ? `\n${postit.content}` : ""}`
    : postit.content

  const handleDoubleClick = (event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true
    onEdit(postit)
  }

  const handleClick = (event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true
    onSelect?.(postit, Boolean(event.evt.shiftKey))
  }

  const handleTap = (event: KonvaEventObject<TouchEvent>) => {
    event.cancelBubble = true
    onSelect?.(postit, false)
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
        <Text
          x={16}
          y={16}
          width={POSTIT_WIDTH - 32}
          height={POSTIT_HEIGHT - 32}
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
        <Group
          x={POSTIT_WIDTH - 36}
          y={8}
          onClick={(event) => {
            event.cancelBubble = true
            onDelete(postit)
          }}
          onTap={(event) => {
            event.cancelBubble = true
            onDelete(postit)
          }}
        >
          <Rect width={28} height={28} fill="transparent" cornerRadius={6} />
          <Text
            x={6}
            y={4}
            text="×"
            fontSize={20}
            fill={POSTIT_MUTED_TEXT}
            listening={false}
          />
        </Group>
      )}
    </Group>
  )
}
