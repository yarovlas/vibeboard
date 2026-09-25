import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"

import { BoardsService } from "@/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { handleInvalidAccessToken } from "@/lib/auth"

export const Route = createFileRoute("/_layout/")({
  component: Home,
  head: () => ({
    meta: [
      {
        title: "Vibeboard",
      },
    ],
  }),
})

/**
 * Home: open the last saved whiteboard, or create a new one when the user
 * has none. The boards overview is only reachable explicitly via /boards.
 */
function Home() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [hasFailed, setHasFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setHasFailed(false)

    const run = async () => {
      try {
        const { data: boards } = (
          await BoardsService.readBoards({ query: { skip: 0, limit: 1 } })
        ).data
        if (cancelled) return

        const lastSaved = boards[0]
        if (lastSaved) {
          if (!cancelled) {
            navigate({
              to: "/boards/$boardId",
              params: { boardId: lastSaved.id },
            })
          }
          return
        }

        const created = await BoardsService.createBoard({
          body: { name: "My whiteboard" },
        })
        if (cancelled) return

        queryClient.invalidateQueries({ queryKey: ["boards"] })
        navigate({
          to: "/boards/$boardId",
          params: { boardId: created.data.id },
        })
      } catch (error) {
        if (handleInvalidAccessToken(error)) return
        if (!cancelled) {
          setHasFailed(true)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [navigate, queryClient])

  if (hasFailed) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-4 p-6 py-24 text-center md:p-8">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">
            We couldn't open your whiteboard
          </h1>
          <p className="text-muted-foreground">
            Something went wrong while loading your whiteboards.
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-8">
      <Skeleton className="h-[65vh] w-full rounded-xl" />
    </div>
  )
}
