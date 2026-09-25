import { Button } from "@/components/ui/button"
import { useBoardView } from "@/hooks/board-view"

/**
 * Segmented control shown in the header on whiteboard pages to switch
 * between the whiteboard view and the table view.
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
        variant={view === "whiteboard" ? "default" : "ghost"}
        aria-pressed={view === "whiteboard"}
        onClick={() => setView("whiteboard")}
      >
        Whiteboard view
      </Button>
      <Button
        size="sm"
        variant={view === "table" ? "default" : "ghost"}
        aria-pressed={view === "table"}
        onClick={() => setView("table")}
      >
        Table view
      </Button>
    </fieldset>
  )
}
