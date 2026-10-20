import type { PostItStatus } from "@/client"
import type { BoardPostIt } from "@/components/Boards/PostItNode"
import {
  POSTIT_HEIGHT,
  POSTIT_WIDTH,
  STATUS_LABELS,
} from "@/components/Boards/PostItNode"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
}

interface PostItTooltipProps {
  postit: BoardPostIt
  open: boolean
}

/**
 * Hover summary for a post-it. The canvas is Konva, so there is no DOM node
 * to hang a tooltip on: a transparent, pointer-events-free proxy div marks
 * the card's position and the tooltip opens purely on hover state reported
 * by the Konva shape.
 */
export function PostItTooltip({ postit, open }: PostItTooltipProps) {
  const rows: string[] = [
    `Status: ${STATUS_LABELS[postit.status as PostItStatus] ?? postit.status}`,
  ]
  if (postit.priority) {
    rows.push(
      `Priority: ${PRIORITY_LABELS[postit.priority] ?? postit.priority}`,
    )
  }
  if (postit.due_date) {
    rows.push(`Due: ${postit.due_date}`)
  }

  return (
    <Tooltip open={open}>
      <TooltipTrigger asChild>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          data-testid="post-it-tooltip-proxy"
          style={{
            left: postit.x,
            top: postit.y,
            width: POSTIT_WIDTH,
            height: POSTIT_HEIGHT,
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" data-testid="post-it-tooltip">
        <div className="flex flex-col gap-0.5">
          {rows.map((row) => (
            <span key={row}>{row}</span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
