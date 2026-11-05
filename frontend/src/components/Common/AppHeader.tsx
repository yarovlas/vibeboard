import { Link } from "@tanstack/react-router"
import { LayoutGrid } from "lucide-react"

import { Appearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { UserMenu } from "@/components/Common/UserMenu"
import { ViewToggle } from "@/components/Common/ViewToggle"
import { Button } from "@/components/ui/button"

export function AppHeader({ showViewToggle }: { showViewToggle: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 bg-background px-4 py-2">
      <div className="flex min-w-0 items-center gap-1">
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
      </div>
      {showViewToggle && (
        // On phones the toggle drops to its own full-width row instead of
        // being clipped; from `sm` up it stays centred over the header.
        <div className="order-last flex w-full justify-center sm:absolute sm:top-1/2 sm:left-1/2 sm:order-none sm:w-auto sm:-translate-x-1/2 sm:-translate-y-1/2">
          <ViewToggle />
        </div>
      )}
      <div className="ml-auto shrink-0">
        <UserMenu />
      </div>
    </header>
  )
}
