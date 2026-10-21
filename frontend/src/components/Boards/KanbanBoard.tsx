import {
  type Announcements,
  type CollisionDetection,
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardCode,
  type KeyboardCoordinateGetter,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useState } from "react"
import { type PostItStatus, PostitsService } from "@/client"
import { KanbanCard, KanbanCardSurface } from "@/components/Boards/KanbanCard"
import {
  KanbanPostItDialog,
  type KanbanPostItDraft,
} from "@/components/Boards/KanbanPostItDialog"
import {
  type BoardPostIt,
  normalizePostIt,
  STATUS_LABELS,
} from "@/components/Boards/PostItNode"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"
import {
  getBoardQueryOptions,
  getPostitsQueryOptions,
} from "@/lib/board-queries"
import { handleError } from "@/lib/errors"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const COLUMN_ORDER: PostItStatus[] = ["TODO", "IN_PROGRESS", "DONE"]

function isColumnStatus(id: unknown): id is PostItStatus {
  return typeof id === "string" && COLUMN_ORDER.some((status) => status === id)
}

/**
 * A pointer drag must resolve to the column under the pointer, and to nothing
 * when the card is released outside every column. Keyboard drags have no
 * pointer coordinates, so they fall back to the closest column corners.
 */
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  if (args.pointerCoordinates) return []
  return closestCorners(args)
}

/**
 * Keyboard drags jump straight to the neighbouring column instead of the
 * default 25px steps, so a card can actually reach every column with the
 * arrow keys. The returned coordinates are the new collision rect origin.
 */
const columnCoordinateGetter: KeyboardCoordinateGetter = (event, args) => {
  if (event.code !== KeyboardCode.Left && event.code !== KeyboardCode.Right) {
    return undefined
  }
  const { collisionRect, droppableRects, droppableContainers } = args.context
  if (!collisionRect) return undefined

  const columns = COLUMN_ORDER.flatMap((status) => {
    // Right after the drag starts, the measurements may not be available yet;
    // fall back to the live DOM rect of the column.
    const rect =
      droppableRects.get(status) ??
      droppableContainers.get(status)?.node.current?.getBoundingClientRect()
    return rect ? [{ status, rect }] : []
  })
  if (columns.length === 0) return undefined

  const centerX = collisionRect.left + collisionRect.width / 2
  let current = 0
  let currentDistance = Number.POSITIVE_INFINITY
  columns.forEach(({ rect }, index) => {
    const distance = Math.abs(centerX - (rect.left + rect.width / 2))
    if (distance < currentDistance) {
      current = index
      currentDistance = distance
    }
  })

  const step = event.code === KeyboardCode.Right ? 1 : -1
  const next = Math.min(columns.length - 1, Math.max(0, current + step))
  const target = columns[next].rect
  return {
    x: target.left + (target.width - collisionRect.width) / 2,
    y: target.top + (target.height - collisionRect.height) / 2,
  }
}

interface KanbanColumnProps {
  status: PostItStatus
  cards: BoardPostIt[]
  onEdit: (postit: BoardPostIt) => void
}

function KanbanColumn({ status, cards, onEdit }: KanbanColumnProps) {
  const label = STATUS_LABELS[status]
  const headingId = `kanban-column-heading-${status}`
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      data-testid={`kanban-column-${status}`}
      className={cn(
        "flex min-w-[16rem] flex-1 flex-col rounded-xl border bg-muted/30 transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 id={headingId} className="text-sm font-semibold tracking-wide">
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
        <ul aria-label={`${label} post-its`} className="flex flex-col gap-2">
          {cards.map((postit) => (
            <KanbanCard key={postit.id} postit={postit} onEdit={onEdit} />
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
}

interface KanbanBoardProps {
  boardId: string
}

/**
 * Kanban view of the post-its. It deliberately uses the exact same query
 * options as the whiteboard, so switching views is instant and both views
 * always show the same data. Cards can be dragged between the status columns;
 * the move is applied optimistically and persisted as a status-only PATCH.
 */
export function KanbanBoard({ boardId }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()
  const { data: postits } = useSuspenseQuery(getPostitsQueryOptions(boardId))
  const [activeDrag, setActiveDrag] = useState<{
    id: string
    width: number
  } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<BoardPostIt | null>(
    null,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinateGetter }),
  )

  const statusMutation = useMutation({
    mutationFn: (move: { id: string; status: PostItStatus }) =>
      // Only the status is sent: the rest of the post-it is left untouched.
      PostitsService.updatePostit({
        body: { status: move.status },
        path: { board_id: boardId, id: move.id },
      }),
    onError: (error) => {
      // Drop the optimistic move and fall back to the server state.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.boards.postits(boardId),
      })
      handleError(error, showErrorToast)
    },
    onSuccess: (response, move) => {
      const savedPostIt = normalizePostIt(response.data)
      queryClient.setQueryData<BoardPostIt[]>(
        queryKeys.boards.postits(boardId),
        (current) =>
          current?.map((postit) =>
            postit.id === move.id ? savedPostIt : postit,
          ),
      )
      void queryClient.invalidateQueries({
        queryKey: getBoardQueryOptions(boardId).queryKey,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: KanbanPostItDraft }) =>
      // Only the fields edited in the dialog are sent; the position of the
      // post-it on the whiteboard is left untouched.
      PostitsService.updatePostit({
        body: {
          title: draft.title,
          content: draft.content,
          color: draft.color,
          status: draft.status,
          priority: draft.priority,
          due_date: draft.due_date,
        },
        path: { board_id: boardId, id },
      }),
    onError: (error) => {
      // Drop the optimistic edit and fall back to the server state.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.boards.postits(boardId),
      })
      handleError(error, showErrorToast)
    },
    onSuccess: (response, { id }) => {
      const savedPostIt = normalizePostIt(response.data)
      queryClient.setQueryData<BoardPostIt[]>(
        queryKeys.boards.postits(boardId),
        (current) =>
          current?.map((postit) => (postit.id === id ? savedPostIt : postit)),
      )
      void queryClient.invalidateQueries({
        queryKey: getBoardQueryOptions(boardId).queryKey,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      PostitsService.deletePostit({ path: { board_id: boardId, id } }),
    onError: (error) => {
      // Bring back the post-it if the server refused the delete.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.boards.postits(boardId),
      })
      handleError(error, showErrorToast)
    },
    onSuccess: (_response, id) => {
      queryClient.setQueryData<BoardPostIt[]>(
        queryKeys.boards.postits(boardId),
        (current) => current?.filter((postit) => postit.id !== id),
      )
      setDeleteCandidate(null)
      setEditingId((current) => (current === id ? null : current))
      void queryClient.invalidateQueries({
        queryKey: getBoardQueryOptions(boardId).queryKey,
      })
    },
  })

  const savePostIt = (id: string, draft: KanbanPostItDraft) => {
    // Apply the edit straight away so the card shows the new text and a
    // status change moves it to the right column without a round-trip.
    queryClient.setQueryData<BoardPostIt[]>(
      queryKeys.boards.postits(boardId),
      (current) =>
        current?.map((postit) =>
          postit.id === id ? { ...postit, ...draft } : postit,
        ),
    )
    setEditingId(null)
    updateMutation.mutate({ id, draft })
  }

  const movePostIt = (id: string, status: PostItStatus) => {
    // A draft still being created has no server id, so it can never be
    // updated; it is not rendered in the kanban either.
    if (id.startsWith("temporary-")) return
    const cached = queryClient.getQueryData<BoardPostIt[]>(
      queryKeys.boards.postits(boardId),
    )
    const postit = cached?.find((item) => item.id === id)
    if (!postit || postit.status === status) return
    queryClient.setQueryData<BoardPostIt[]>(
      queryKeys.boards.postits(boardId),
      (current) =>
        current?.map((item) => (item.id === id ? { ...item, status } : item)),
    )
    statusMutation.mutate({ id, status })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag({
      id: String(event.active.id),
      width: event.active.rect.current.initial?.width ?? 0,
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null)
    const { active, over } = event
    // Released between the columns or on the column it came from: no-op.
    if (!over || !isColumnStatus(over.id)) return
    movePostIt(String(active.id), over.id)
  }

  const handleDragCancel = () => setActiveDrag(null)

  const activePostit = activeDrag
    ? postits.find((postit) => postit.id === activeDrag.id)
    : undefined

  const editingPostit = editingId
    ? postits.find((postit) => postit.id === editingId)
    : undefined

  const describe = (id: unknown) => {
    const postit = postits.find((item) => item.id === id)
    const text = postit?.title.trim() || postit?.content.trim() || "post-it"
    return text.length > 60 ? `${text.slice(0, 60)}…` : text
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${describe(active.id)}.`,
    onDragOver: ({ over }) =>
      over && isColumnStatus(over.id)
        ? `Over the ${STATUS_LABELS[over.id]} column.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over && isColumnStatus(over.id)
        ? `Dropped ${describe(active.id)} in ${STATUS_LABELS[over.id]}.`
        : "Drop cancelled.",
    onDragCancel: () => "Dragging cancelled.",
  }

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
      <p className="sr-only">
        Drag a post-it to another column. With a keyboard, focus a card and
        press space to pick it up, use the left and right arrow keys to choose a
        column, then press space to drop it or escape to cancel.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To move a post-it, press space or enter to pick it up, use the left and right arrow keys to choose a column, press space or enter to drop it, or press escape to cancel.",
          },
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          data-testid="kanban-columns"
          className="flex min-h-[24rem] flex-1 items-stretch gap-4 overflow-x-auto pb-2"
        >
          {COLUMN_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              cards={cardsByStatus.get(status) ?? []}
              onEdit={(postit) => setEditingId(postit.id)}
            />
          ))}
        </div>
        <DragOverlay>
          {activePostit ? (
            <div
              data-testid="kanban-drag-overlay"
              style={
                activeDrag?.width ? { width: activeDrag.width } : undefined
              }
            >
              <KanbanCardSurface
                postit={activePostit}
                className="cursor-grabbing shadow-lg"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingPostit && (
        // Keyed by id: opening another card starts from that card's values.
        <KanbanPostItDialog
          key={editingPostit.id}
          postit={editingPostit}
          onClose={() => setEditingId(null)}
          onSave={(draft) => savePostIt(editingPostit.id, draft)}
          onRequestDelete={() => {
            // Close the edit dialog first: the confirmation is its own
            // dialog instead of a nested one.
            setEditingId(null)
            setDeleteCandidate(editingPostit)
          }}
        />
      )}

      <Dialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null)
        }}
      >
        <DialogContent data-testid="kanban-delete-dialog">
          <DialogHeader>
            <DialogTitle>Delete post-it</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post-it? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid="kanban-delete-confirm"
              onClick={() => {
                if (!deleteCandidate) return
                deleteMutation.mutate(deleteCandidate.id)
                setDeleteCandidate(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
