import { cn } from "@/lib/utils"

/**
 * Shared track for segmented controls: the view switch in the header and the
 * status/priority chips above the Kanban columns. Keeping them on one muted
 * track makes both places read as the same control.
 */
export const segmentedControlClass =
  "m-0 flex flex-wrap items-center gap-1 rounded-lg border-0 bg-muted p-1"

/** One segment; the active option is a neutral pill on the muted track. */
export function segmentedItemClass(active: boolean) {
  return cn(
    "h-8 px-3 text-sm",
    active
      ? "bg-background font-medium shadow-sm hover:bg-background hover:text-foreground"
      : "text-muted-foreground hover:bg-transparent hover:text-foreground",
  )
}
