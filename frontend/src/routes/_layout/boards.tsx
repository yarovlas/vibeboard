import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/boards")({
  component: BoardsLayout,
})

function BoardsLayout() {
  return <Outlet />
}
