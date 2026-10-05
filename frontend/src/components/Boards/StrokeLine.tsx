import { Line } from "react-konva"

import type { StrokePublic } from "@/client"

export type BoardStroke = {
  id: string
  board_id: string
  points: number[]
  color: string
  width: number
  tool: string
}

export function normalizeStroke(stroke: StrokePublic): BoardStroke {
  return {
    id: stroke.id,
    board_id: stroke.board_id,
    points: stroke.points ?? [],
    color: stroke.color ?? "#111827",
    width: stroke.width ?? 4,
    tool: stroke.tool ?? "pen",
  }
}

interface StrokeLineProps {
  stroke: BoardStroke
}

export function StrokeLine({ stroke }: StrokeLineProps) {
  return (
    <Line
      points={stroke.points}
      stroke={stroke.color}
      strokeWidth={stroke.width}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}
