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
  onExpand: () => void
  onDelete: () => void
}

export function FolderNode({
  x,
  y,
  color,
  count,
  onExpand,
  onDelete,
}: FolderNodeProps) {
  const handleClick = (event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true
    onExpand()
  }

  const handleTap = (event: KonvaEventObject<TouchEvent>) => {
    event.cancelBubble = true
    onExpand()
  }

  return (
    <Group
      x={x}
      y={y}
      name={`folder-${color}`}
      draggable={false}
      onClick={handleClick}
      onTap={handleTap}
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
