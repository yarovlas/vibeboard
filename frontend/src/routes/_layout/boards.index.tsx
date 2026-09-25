import { createFileRoute } from "@tanstack/react-router"

import { BoardsOverview } from "@/components/Boards/BoardsOverview"

export const Route = createFileRoute("/_layout/boards/")({
  component: BoardsOverview,
  head: () => ({
    meta: [
      {
        title: "Whiteboards - Vibeboard",
      },
    ],
  }),
})
