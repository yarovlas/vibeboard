import type { KonvaEventObject } from "konva/lib/Node"
import { Group, Rect, Text } from "react-konva"

import { POSTIT_HEIGHT, POSTIT_WIDTH } from "@/components/Boards/PostItNode"

export const FOLDER_CORNER_RADIUS = 20
// Counter badge: the same figure as a post-it, at 1/6 of the main size,
// straddling the top-right corner of the folder.
export const FOLDER_BADGE_WIDTH = Math.round(POSTIT_WIDTH / 6)
export const FOLDER_BADGE_HEIGHT = Math.round(POSTIT_HEIGHT / 6)
export const FOLDER_BADGE_RADIUS = 5
export const FOLDER_BADGE_X = POSTIT_WIDTH - 10 - FOLDER_BADGE_WIDTH / 2
export const FOLDER_BADGE_Y = 10 - FOLDER_BADGE_HEIGHT / 2
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
      <Rect
        x={FOLDER_BADGE_X}
        y={FOLDER_BADGE_Y}
        width={FOLDER_BADGE_WIDTH}
        height={FOLDER_BADGE_HEIGHT}
        fill="#FFFFFF"
        stroke="#E5E7EB"
        strokeWidth={1}
        cornerRadius={FOLDER_BADGE_RADIUS}
        shadowColor="#1F2937"
        shadowBlur={4}
        shadowOpacity={0.15}
        listening={false}
      />
      <Text
        x={FOLDER_BADGE_X}
        y={FOLDER_BADGE_Y + (FOLDER_BADGE_HEIGHT - 18) / 2}
        width={FOLDER_BADGE_WIDTH}
        height={18}
        align="center"
        text={String(count)}
        fontSize={14}
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
