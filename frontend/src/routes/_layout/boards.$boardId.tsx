import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { KanbanBoard } from "@/components/Boards/KanbanBoard"
import { WhiteboardCanvas } from "@/components/Boards/WhiteboardCanvas"
import { Skeleton } from "@/components/ui/skeleton"
import { useBoardView } from "@/hooks/board-view"
import { getBoardQueryOptions } from "@/lib/board-queries"

export const Route = createFileRoute("/_layout/boards/$boardId")({
  component: BoardPage,
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
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
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
