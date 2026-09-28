import { Group, Rect, Text } from "react-konva"

import type { PostItPublic } from "@/client"

export const POSTIT_WIDTH = 220
export const POSTIT_HEIGHT = 180
const POSTIT_FILL = "#FEF3C7"
const POSTIT_TEXT = "#1F2937"
const POSTIT_MUTED_TEXT = "#92400E"

export type BoardPostIt = {
  id: string
  board_id: string
  title: string
  content: string
  x: number
  y: number
}

export function normalizePostIt(postit: PostItPublic): BoardPostIt {
  return {
    id: postit.id,
    board_id: postit.board_id,
    title: postit.title ?? "",
    content: postit.content ?? "",
    x: postit.x ?? 0,
    y: postit.y ?? 0,
  }
}

interface PostItNodeProps {
  postit: BoardPostIt
  isEditing: boolean
}

export function PostItNode({ postit, isEditing }: PostItNodeProps) {
  const text = postit.title
    ? `${postit.title}${postit.content ? `\n${postit.content}` : ""}`
    : postit.content

  return (
    <Group
      x={postit.x}
      y={postit.y}
      name={`postit-${postit.id}`}
      onDblClick={(event) => {
        // PBI-02 does not edit existing notes. Keep the event from bubbling
        // to the stage, which uses double-clicks to create a new note.
        event.cancelBubble = true
      }}
    >
      <Rect
        width={POSTIT_WIDTH}
        height={POSTIT_HEIGHT}
        fill={POSTIT_FILL}
        cornerRadius={10}
        shadowColor="#92400E"
        shadowBlur={12}
        shadowOpacity={0.18}
        shadowOffsetY={4}
        perfectDrawEnabled={false}
      />
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
    </Group>
  )
}
