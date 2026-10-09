import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"

import { AppHeader } from "@/components/Common/AppHeader"
import { Footer } from "@/components/Common/Footer"
import { BoardViewProvider } from "@/hooks/board-view"
import { requireAuth } from "@/lib/validation"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: requireAuth,
})

function Layout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isBoardPage = /^\/boards\/[^/]+$/.test(pathname)

  return (
    <BoardViewProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader showViewToggle={isBoardPage} />
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
        <Footer />
      </div>
    </BoardViewProvider>
  )
}
