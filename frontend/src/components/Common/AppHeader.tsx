import { Link } from "@tanstack/react-router"
import { LayoutGrid } from "lucide-react"

import { Appearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { UserMenu } from "@/components/Common/UserMenu"
import { ViewToggle } from "@/components/Common/ViewToggle"
import { Button } from "@/components/ui/button"

export function AppHeader({ showViewToggle }: { showViewToggle: boolean }) {
  return (
    <header className="sticky top-0 z-20 relative flex h-16 shrink-0 items-center gap-2 bg-background px-4">
      <div className="flex items-center gap-1">
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
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
          <ViewToggle />
        </div>
      )}
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  )
}
