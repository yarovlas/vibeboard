import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PenLine, Table2 } from "lucide-react"
import { Suspense } from "react"

import { BoardsService } from "@/client"
import { Skeleton } from "@/components/ui/skeleton"
import { useBoardView } from "@/hooks/board-view"

function getBoardQueryOptions(boardId: string) {
  return {
    queryFn: async () =>
      (await BoardsService.readBoard({ path: { id: boardId } })).data,
    queryKey: ["boards", "detail", boardId],
  }
}

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

function WhiteboardView() {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center rounded-xl border-2 border-dashed bg-muted/20">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
          <PenLine className="size-5 text-muted-foreground" />
        </div>
        <p className="font-medium">Empty workspace</p>
        <p className="text-sm text-muted-foreground">
          Post-its and drawings will appear here in the next sprints.
        </p>
      </div>
    </div>
  )
}

function TableView() {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center rounded-xl border-2 border-dashed bg-muted/20">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
          <Table2 className="size-5 text-muted-foreground" />
        </div>
        <p className="font-medium">Rows with your whiteboard items</p>
        <p className="text-sm text-muted-foreground">
          A table with your post-its and drawings will appear here in the next
          sprints.
        </p>
      </div>
    </div>
  )
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
      {view === "table" ? <TableView /> : <WhiteboardView />}
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
