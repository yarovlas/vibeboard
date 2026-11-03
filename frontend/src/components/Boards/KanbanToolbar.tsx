import { ArrowDown, ArrowUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { KanbanSortKey, KanbanSortOrder } from "@/lib/kanban-controls"

const SORT_LABELS: Record<KanbanSortKey, string> = {
  manual: "Manual order",
  priority: "Priority",
  "due-date": "Due date",
}

interface KanbanToolbarProps {
  sortKey: KanbanSortKey
  sortOrder: KanbanSortOrder
  onSortKeyChange: (key: KanbanSortKey) => void
  onSortOrderChange: (order: KanbanSortOrder) => void
}

/**
 * Controls above the kanban columns. Every control only rearranges the
 * already fetched cards client-side; the shared query stays untouched.
 */
export function KanbanToolbar({
  sortKey,
  sortOrder,
  onSortKeyChange,
  onSortOrderChange,
}: KanbanToolbarProps) {
  const canSort = sortKey !== "manual"

  return (
    <div
      role="toolbar"
      aria-label="Kanban controls"
      data-testid="kanban-toolbar"
      className="mb-3 flex flex-wrap items-center gap-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort</span>
        <Select
          value={sortKey}
          onValueChange={(value) => onSortKeyChange(value as KanbanSortKey)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Sort post-its by"
            data-testid="kanban-sort-key"
            className="h-8"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as KanbanSortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={!canSort}
          aria-label={
            sortOrder === "asc" ? "Sort ascending" : "Sort descending"
          }
          data-testid="kanban-sort-order"
          onClick={() =>
            onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")
          }
        >
          {sortOrder === "asc" ? (
            <ArrowUp aria-hidden="true" />
          ) : (
            <ArrowDown aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  )
}
