import { CalendarDays } from "lucide-react"

import {
  type BoardPostIt,
  formatDueDate,
  POSTIT_DEFAULT_COLOR,
  PRIORITY_COLORS,
} from "@/components/Boards/PostItNode"
import { cn } from "@/lib/utils"

interface KanbanCardProps {
  postit: BoardPostIt
}

/**
 * One saved post-it in a kanban column. Mirrors the whiteboard card: same
 * colour, optional title above the content and the priority/due-date badges.
 * Text is clamped so long notes never stretch a column beyond the viewport.
 */
export function KanbanCard({ postit }: KanbanCardProps) {
  const hasTitle = postit.title.trim() !== ""
  const hasContent = postit.content.trim() !== ""
  const hasText = hasTitle || hasContent

  return (
    <li
      data-testid="kanban-card"
      data-postit-id={postit.id}
      className="min-w-0 rounded-lg border border-black/5 p-3 text-slate-900 shadow-sm"
      style={{ backgroundColor: postit.color || POSTIT_DEFAULT_COLOR }}
    >
      {hasTitle && (
        <p
          className={cn(
            "text-sm font-semibold break-words",
            hasContent ? "line-clamp-2" : "line-clamp-5",
          )}
        >
          {postit.title}
        </p>
      )}
      {hasContent && (
        <p
          className={cn(
            "text-sm break-words whitespace-pre-wrap",
            hasTitle ? "mt-1 line-clamp-4" : "line-clamp-5",
          )}
        >
          {postit.content}
        </p>
      )}
      {!hasText && (
        <p className="text-sm text-slate-500 italic">Empty post-it</p>
      )}
      {(postit.priority || postit.due_date) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700">
          {postit.priority && (
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: PRIORITY_COLORS[postit.priority] }}
              />
              {postit.priority}
            </span>
          )}
          {postit.due_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              <time dateTime={postit.due_date}>
                {formatDueDate(postit.due_date)}
              </time>
            </span>
          )}
        </div>
      )}
    </li>
  )
}
