import { Button } from "@/components/ui/button"
import { useBoardView } from "@/hooks/board-view"
import {
  segmentedControlClass,
  segmentedItemClass,
} from "@/lib/segmented-control"

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
      data-testid="view-toggle"
      className={segmentedControlClass}
    >
      <Button
        size="sm"
        variant="ghost"
        aria-pressed={view === "whiteboard"}
        onClick={() => setView("whiteboard")}
        className={segmentedItemClass(view === "whiteboard")}
      >
        Whiteboard view
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-pressed={view === "kanban"}
        onClick={() => setView("kanban")}
        className={segmentedItemClass(view === "kanban")}
      >
        Kanban view
      </Button>
    </fieldset>
  )
}
