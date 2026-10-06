import type { KonvaEventObject } from "konva/lib/Node"
import { Circle, Group, Rect, Text } from "react-konva"

import { POSTIT_HEIGHT, POSTIT_WIDTH } from "@/components/Boards/PostItNode"

export const FOLDER_CORNER_RADIUS = 28
const FOLDER_BADGE_TEXT = "#1F2937"
const FOLDER_MUTED_TEXT = "#92400E"

interface FolderNodeProps {
  x: number
  y: number
  color: string
  count: number
  isDrawing?: boolean
  onExpand: () => void
  onDelete: () => void
  onDragEnd?: (position: { x: number; y: number }) => void
  dragBoundFunc?: (position: { x: number; y: number }) => {
    x: number
    y: number
  }
}

export function FolderNode({
  x,
  y,
  color,
  count,
  isDrawing = false,
  onExpand,
  onDelete,
  onDragEnd,
  dragBoundFunc,
}: FolderNodeProps) {
  const handleClick = (event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true
    onExpand()
  }

  const handleTap = (event: KonvaEventObject<TouchEvent>) => {
    event.cancelBubble = true
    onExpand()
  }

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    event.cancelBubble = true
    onDragEnd?.({ x: event.target.x(), y: event.target.y() })
  }

  return (
    <Group
      x={x}
      y={y}
      name={`folder-${color}`}
      draggable={!isDrawing}
      dragBoundFunc={dragBoundFunc}
      onClick={handleClick}
      onTap={handleTap}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={7}
        y={7}
        width={POSTIT_WIDTH}
        height={POSTIT_HEIGHT}
        fill={color}
        opacity={0.55}
        cornerRadius={FOLDER_CORNER_RADIUS}
        listening={false}
      />
      <Rect
        width={POSTIT_WIDTH}
        height={POSTIT_HEIGHT}
        fill={color}
        cornerRadius={FOLDER_CORNER_RADIUS}
        shadowColor="#92400E"
        shadowBlur={12}
        shadowOpacity={0.18}
        shadowOffsetY={4}
        perfectDrawEnabled={false}
      />
      <Circle
        x={POSTIT_WIDTH - 24}
        y={24}
        radius={15}
        fill="#FFFFFF"
        stroke="#E5E7EB"
        strokeWidth={1}
        listening={false}
      />
      <Text
        x={POSTIT_WIDTH - 24 - 15}
        y={24 - 10}
        width={30}
        height={20}
        align="center"
        text={String(count)}
        fontSize={15}
        fontStyle="bold"
        fill={FOLDER_BADGE_TEXT}
        listening={false}
      />
      <Group
        x={POSTIT_WIDTH - 36}
        y={POSTIT_HEIGHT - 36}
        onClick={(event) => {
          event.cancelBubble = true
          onDelete()
        }}
        onTap={(event) => {
          event.cancelBubble = true
          onDelete()
        }}
      >
        <Rect width={28} height={28} fill="transparent" cornerRadius={6} />
        <Text
          x={6}
          y={4}
          text="×"
          fontSize={20}
          fill={FOLDER_MUTED_TEXT}
          listening={false}
        />
      </Group>
    </Group>
  )
}
