import { ArrowDown, ArrowUp, Search } from "lucide-react"
import { useEffect, useState } from "react"

import type { PostItStatus } from "@/client"
import { STATUS_LABELS } from "@/components/Boards/PostItNode"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  KANBAN_STATUSES,
  type KanbanSortKey,
  type KanbanSortOrder,
  PRIORITY_FILTER_OPTIONS,
  type PriorityFilter,
} from "@/lib/kanban-controls"
import { cn } from "@/lib/utils"

const SORT_LABELS: Record<KanbanSortKey, string> = {
  manual: "Manual order",
  priority: "Priority",
  "due-date": "Due date",
}

const PRIORITY_LABELS: Record<PriorityFilter, string> = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  NONE: "No priority",
}

/** Active option: a neutral pill on the muted control background. */
function chipClass(active: boolean) {
  return cn(
    "h-8 px-3 text-sm",
    active
      ? "bg-background font-medium shadow-sm hover:bg-background hover:text-foreground"
      : "text-muted-foreground hover:bg-transparent hover:text-foreground",
  )
}

interface KanbanToolbarProps {
  sortKey: KanbanSortKey
  sortOrder: KanbanSortOrder
  onSortKeyChange: (key: KanbanSortKey) => void
  onSortOrderChange: (order: KanbanSortOrder) => void
  statuses: PostItStatus[]
  priorities: PriorityFilter[]
  onToggleStatus: (status: PostItStatus) => void
  onTogglePriority: (priority: PriorityFilter) => void
  query: string
  onQueryChange: (query: string) => void
}

/**
 * Controls above the kanban columns. Every control only rearranges, hides or
 * searches the already fetched cards client-side; the shared query stays
 * untouched.
 */
export function KanbanToolbar({
  sortKey,
  sortOrder,
  onSortKeyChange,
  onSortOrderChange,
  statuses,
  priorities,
  onToggleStatus,
  onTogglePriority,
  query,
  onQueryChange,
}: KanbanToolbarProps) {
  const canSort = sortKey !== "manual"
  const [searchInput, setSearchInput] = useState(query)

  // Keep the field in sync when the query changes outside the input, for
  // example after a reload or with the browser history buttons.
  useEffect(() => {
    setSearchInput(query)
  }, [query])

  // Only write to the URL once the user pauses, so typing does not trigger a
  // navigation per keystroke.
  useEffect(() => {
    if (searchInput === query) return
    const timeout = setTimeout(() => onQueryChange(searchInput), 200)
    return () => clearTimeout(timeout)
  }, [searchInput, query, onQueryChange])

  return (
    <div
      role="toolbar"
      aria-label="Kanban controls"
      data-testid="kanban-toolbar"
      className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3"
    >
      <label className="relative flex w-full items-center sm:w-auto">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2 size-4 text-muted-foreground"
        />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search post-its"
          aria-label="Search post-its"
          data-testid="kanban-search"
          className="h-8 w-full rounded-md border border-input bg-transparent pr-3 pl-8 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
        />
      </label>

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

      <fieldset
        aria-label="Filter columns by status"
        className="m-0 flex flex-wrap items-center gap-1 rounded-lg border-0 bg-muted p-1"
      >
        {KANBAN_STATUSES.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={statuses.includes(status)}
            data-testid={`kanban-filter-status-${status}`}
            onClick={() => onToggleStatus(status)}
            className={chipClass(statuses.includes(status))}
          >
            {STATUS_LABELS[status]}
          </Button>
        ))}
      </fieldset>

      <fieldset
        aria-label="Filter post-its by priority"
        className="m-0 flex flex-wrap items-center gap-1 rounded-lg border-0 bg-muted p-1"
      >
        {PRIORITY_FILTER_OPTIONS.map((priority) => (
          <Button
            key={priority}
            type="button"
            size="sm"
            variant="ghost"
            aria-pressed={priorities.includes(priority)}
            data-testid={`kanban-filter-priority-${priority}`}
            onClick={() => onTogglePriority(priority)}
            className={chipClass(priorities.includes(priority))}
          >
            {PRIORITY_LABELS[priority]}
          </Button>
        ))}
      </fieldset>
    </div>
  )
}
