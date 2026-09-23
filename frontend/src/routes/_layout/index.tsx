import { createFileRoute } from "@tanstack/react-router"

import { BoardsOverview } from "@/components/Boards/BoardsOverview"

export const Route = createFileRoute("/_layout/")({
  component: BoardsOverview,
  head: () => ({
    meta: [
      {
        title: "Dashboard - Vibeboard",
      },
    ],
  }),
})
