import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { KanbanBoard } from "@/components/Boards/KanbanBoard"
import { WhiteboardCanvas } from "@/components/Boards/WhiteboardCanvas"
import { Skeleton } from "@/components/ui/skeleton"
import { useBoardView } from "@/hooks/board-view"
import { getBoardQueryOptions } from "@/lib/board-queries"
import { parseKanbanSearch } from "@/lib/kanban-controls"

export const Route = createFileRoute("/_layout/boards/$boardId")({
  component: BoardPage,
  validateSearch: parseKanbanSearch,
  head: () => ({
    meta: [
      {
        title: "Whiteboard - Vibeboard",
      },
    ],
  }),
})

function WhiteboardView({ boardId }: { boardId: string }) {
  return <WhiteboardCanvas boardId={boardId} />
}

function BoardContent() {
  const { boardId } = Route.useParams()
  const { data: board } = useSuspenseQuery(getBoardQueryOptions(boardId))
  const { view } = useBoardView()

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6 md:p-8">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="min-w-0 text-xl font-bold tracking-tight break-words sm:text-2xl">
          {board.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated{" "}
          {board.updated_at ? new Date(board.updated_at).toLocaleString() : ""}
        </p>
      </div>
      {view === "whiteboard" && <WhiteboardView boardId={boardId} />}
      {view === "kanban" && <KanbanBoard boardId={boardId} />}
    </div>
  )
}

function BoardPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[65vh] w-full" />}>
      <BoardContent />
    </Suspense>
  )
}
