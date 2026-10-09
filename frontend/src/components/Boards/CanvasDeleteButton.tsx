import { Group, Rect, Text } from "react-konva"

interface CanvasDeleteButtonProps {
  /** Top-left corner of the 28x28 hit area. */
  x: number
  y: number
  onDelete: () => void
  fill?: string
}

export function CanvasDeleteButton({
  x,
  y,
  onDelete,
  fill = "#92400E",
}: CanvasDeleteButtonProps) {
  return (
    <Group
      x={x}
      y={y}
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
      <Text x={6} y={4} text="×" fontSize={20} fill={fill} listening={false} />
    </Group>
  )
}
