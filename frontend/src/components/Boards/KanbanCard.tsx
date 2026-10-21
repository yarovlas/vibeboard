import { useDraggable } from "@dnd-kit/core"
import { CalendarDays } from "lucide-react"

import {
  type BoardPostIt,
  formatDueDate,
  POSTIT_DEFAULT_COLOR,
  PRIORITY_COLORS,
  STATUS_LABELS,
} from "@/components/Boards/PostItNode"
import { cn } from "@/lib/utils"

interface KanbanCardSurfaceProps {
  postit: BoardPostIt
  className?: string
}

/**
 * Presentational post-it card, shared by the draggable column card and the
 * drag overlay. It renders a `div` (never a list item) so the overlay can be
 * rendered outside the column list without producing invalid markup. Mirrors
 * the whiteboard card: same colour, optional title above the content and the
 * priority/due-date badges. Text is clamped so long notes never stretch a
 * column beyond the viewport.
 */
export function KanbanCardSurface({
  postit,
  className,
}: KanbanCardSurfaceProps) {
  const hasTitle = postit.title.trim() !== ""
  const hasContent = postit.content.trim() !== ""
  const hasText = hasTitle || hasContent

  return (
    <div
      data-testid="kanban-card-surface"
      className={cn(
        "min-w-0 rounded-lg border border-black/5 p-3 text-slate-900 shadow-sm",
        className,
      )}
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
    </div>
  )
}

interface KanbanCardProps {
  postit: BoardPostIt
}

/**
 * One saved post-it in a kanban column. The whole card is the drag handle, so
 * it stays free of buttons and can be picked up with the pointer or, via the
 * keyboard sensor, with space/enter plus the arrow keys. A temporary draft is
 * never draggable: it has no server id to update yet.
 */
export function KanbanCard({ postit }: KanbanCardProps) {
  const isTemporary = postit.id.startsWith("temporary-")
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: postit.id,
    disabled: isTemporary,
    data: { status: postit.status },
  })
  const label = postit.title.trim() || postit.content.trim() || "Empty post-it"

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-testid="kanban-card"
      data-postit-id={postit.id}
      aria-label={`${label} (${STATUS_LABELS[postit.status]}). Press space to move between columns.`}
      className={cn(
        "touch-none rounded-lg outline-none select-none",
        "cursor-grab focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDragging && "cursor-grabbing opacity-40",
      )}
    >
      <KanbanCardSurface postit={postit} />
    </li>
  )
}
