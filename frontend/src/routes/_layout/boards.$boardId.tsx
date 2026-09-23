import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, PenLine } from "lucide-react"
import { Suspense } from "react"

import { BoardsService } from "@/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

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

function BoardContent() {
  const { boardId } = Route.useParams()
  const { data: board } = useSuspenseQuery(getBoardQueryOptions(boardId))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link to="/" aria-label="Back to whiteboards">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
          <p className="text-sm text-muted-foreground">
            Last updated{" "}
            {board.updated_at
              ? new Date(board.updated_at).toLocaleString()
              : ""}
          </p>
        </div>
      </div>

      <div className="flex min-h-[65vh] flex-1 items-center justify-center rounded-xl border-2 border-dashed bg-muted/20">
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
    </div>
  )
}

function BoardPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[65vh] w-full rounded-xl" />}>
      <BoardContent />
    </Suspense>
  )
}
