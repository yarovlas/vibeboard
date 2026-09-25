import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router"
import { LayoutGrid } from "lucide-react"

import { Appearance } from "@/components/Common/Appearance"
import { Footer } from "@/components/Common/Footer"
import { Logo } from "@/components/Common/Logo"
import { UserMenu } from "@/components/Common/UserMenu"
import { ViewToggle } from "@/components/Common/ViewToggle"
import { Button } from "@/components/ui/button"
import { BoardViewProvider } from "@/hooks/board-view"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isBoardPage = /^\/boards\/[^/]+$/.test(pathname)

  return (
    <BoardViewProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label="Whiteboards"
            title="Whiteboards"
          >
            <Link to="/boards">
              <LayoutGrid className="h-5 w-5" />
            </Link>
          </Button>
          <Appearance />
          <div className="flex flex-1 justify-center">
            {isBoardPage && <ViewToggle />}
          </div>
          <UserMenu />
        </header>
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
        <Footer />
      </div>
    </BoardViewProvider>
  )
}
