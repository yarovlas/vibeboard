import { Button } from "@/components/ui/button"
import { useBoardView } from "@/hooks/board-view"
import { cn } from "@/lib/utils"

/**
 * Segmented control shown in the header on whiteboard pages to switch
 * between the whiteboard and kanban views. Centered over the whole
 * header; the active option is a neutral pill without brand colours.
 */
export function ViewToggle() {
  const { view, setView } = useBoardView()

  return (
    <fieldset
      aria-label="View"
      className="m-0 flex items-center gap-1 rounded-lg border-0 bg-muted p-1"
    >
      <Button
        size="sm"
        variant="ghost"
        aria-pressed={view === "whiteboard"}
        onClick={() => setView("whiteboard")}
        className={cn(
          "h-8 px-3 text-sm",
          view === "whiteboard"
            ? "bg-background font-medium shadow-sm hover:bg-background hover:text-foreground"
            : "text-muted-foreground hover:bg-transparent hover:text-foreground",
        )}
      >
        Whiteboard view
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-pressed={view === "kanban"}
        onClick={() => setView("kanban")}
        className={cn(
          "h-8 px-3 text-sm",
          view === "kanban"
            ? "bg-background font-medium shadow-sm hover:bg-background hover:text-foreground"
            : "text-muted-foreground hover:bg-transparent hover:text-foreground",
        )}
      >
        Kanban view
      </Button>
    </fieldset>
  )
}
