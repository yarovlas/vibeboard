import { useSuspenseQuery } from "@tanstack/react-query"
import type { PostItStatus } from "@/client"
import { KanbanCard } from "@/components/Boards/KanbanCard"
import { type BoardPostIt, STATUS_LABELS } from "@/components/Boards/PostItNode"
import { getPostitsQueryOptions } from "@/lib/board-queries"

const COLUMN_ORDER: PostItStatus[] = ["TODO", "IN_PROGRESS", "DONE"]

interface KanbanBoardProps {
  boardId: string
}

/**
 * Read-only kanban view of the post-its. It deliberately uses the exact same
 * query options as the whiteboard, so switching views is instant and both
 * views always show the same data.
 */
export function KanbanBoard({ boardId }: KanbanBoardProps) {
  const { data: postits } = useSuspenseQuery(getPostitsQueryOptions(boardId))

  const cardsByStatus = new Map<PostItStatus, BoardPostIt[]>()
  for (const status of COLUMN_ORDER) cardsByStatus.set(status, [])
  for (const postit of postits) {
    // A draft that is still being created only lives in the query cache;
    // it has no saved status yet and must not appear on the board.
    if (postit.id.startsWith("temporary-")) continue
    cardsByStatus.get(postit.status)?.push(postit)
  }

  return (
    <section
      aria-label="Kanban board"
      data-testid="kanban-board"
      className="flex min-w-0 flex-1 flex-col"
    >
      <div
        data-testid="kanban-columns"
        className="flex min-h-[24rem] flex-1 items-stretch gap-4 overflow-x-auto pb-2"
      >
        {COLUMN_ORDER.map((status) => {
          const label = STATUS_LABELS[status]
          const cards = cardsByStatus.get(status) ?? []
          const headingId = `kanban-column-heading-${status}`
          return (
            <section
              key={status}
              aria-labelledby={headingId}
              data-testid={`kanban-column-${status}`}
              className="flex min-w-[16rem] flex-1 flex-col rounded-xl border bg-muted/30"
            >
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                <h2
                  id={headingId}
                  className="text-sm font-semibold tracking-wide"
                >
                  {label}
                </h2>
                <span
                  data-testid={`kanban-count-${status}`}
                  className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums"
                >
                  {cards.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <ul
                  aria-label={`${label} post-its`}
                  className="flex flex-col gap-2"
                >
                  {cards.map((postit) => (
                    <KanbanCard key={postit.id} postit={postit} />
                  ))}
                </ul>
                {cards.length === 0 && (
                  <p
                    data-testid={`kanban-empty-${status}`}
                    className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    No post-its in this column yet.
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}
