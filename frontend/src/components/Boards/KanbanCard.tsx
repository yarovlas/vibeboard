import { useDraggable } from "@dnd-kit/core"
import { CalendarDays, Pencil } from "lucide-react"

import {
  type BoardPostIt,
  formatDueDate,
  POSTIT_DEFAULT_COLOR,
  PRIORITY_COLORS,
  STATUS_LABELS,
} from "@/components/Boards/PostItNode"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface KanbanCardSurfaceProps {
  postit: BoardPostIt
  className?: string
}

/**
 * Presentational post-it card, shared by the draggable column card and the
 * drag overlay. It renders a `div` (never a list item) so the overlay can be
 * rendered outside the column list without producing invalid markup. Mirrors
 * the whiteboard card exactly: same colour and one combined text block (the
 * legacy `title`, when present, is shown above the content but is not edited
 * anywhere in the UI). Priority and due-date badges follow. Text is clamped so
 * long notes never stretch a column beyond the viewport.
 */
export function KanbanCardSurface({
  postit,
  className,
}: KanbanCardSurfaceProps) {
  const text = postit.title.trim()
    ? `${postit.title}${postit.content ? `\n${postit.content}` : ""}`
    : postit.content

  return (
    <div
      data-testid="kanban-card-surface"
      className={cn(
        "min-w-0 rounded-lg border border-black/5 p-3 text-slate-900 shadow-sm",
        className,
      )}
      style={{ backgroundColor: postit.color || POSTIT_DEFAULT_COLOR }}
    >
      {text ? (
        <p className="text-sm break-words whitespace-pre-wrap line-clamp-6">
          {text}
        </p>
      ) : (
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
  /** Open the edit dialog for this card. */
  onEdit?: (postit: BoardPostIt) => void
}

/**
 * One saved post-it in a kanban column. The card surface is the drag handle,
 * so it can be picked up with the pointer or, via the keyboard sensor, with
 * space/enter plus the arrow keys. The edit button is a sibling of that
 * surface: it never starts a drag and double-clicking the card opens the
 * same editor. A temporary draft is never draggable: it has no server id to
 * update yet.
 */
export function KanbanCard({ postit, onEdit }: KanbanCardProps) {
  const isTemporary = postit.id.startsWith("temporary-")
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: postit.id,
    disabled: isTemporary,
    data: { status: postit.status },
  })
  const label = postit.title.trim() || postit.content.trim() || "Empty post-it"

  return (
    <li
      data-testid="kanban-card"
      data-postit-id={postit.id}
      className="relative"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: dnd-kit makes this surface focusable and keyboard-operable, and sets role="button" via its attributes. */}
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: dnd-kit spreads role="button" onto this surface at runtime. */}
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onDoubleClick={() => onEdit?.(postit)}
        aria-label={`${label} (${STATUS_LABELS[postit.status]}). Press space to move between columns.`}
        className={cn(
          "touch-none rounded-lg outline-none select-none",
          "cursor-grab focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging && "cursor-grabbing opacity-40",
        )}
      >
        {/* Right padding keeps the text clear of the edit button. */}
        <KanbanCardSurface postit={postit} className="pr-9" />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Edit post-it"
        data-testid="kanban-card-edit"
        onClick={() => onEdit?.(postit)}
        className="absolute top-2 right-2 text-slate-600 hover:bg-black/5 hover:text-slate-900"
      >
        <Pencil aria-hidden="true" />
      </Button>
    </li>
  )
}
