import type { PostItPriority } from "@/client"
import type { BoardPostIt } from "@/components/Boards/PostItNode"

export const KANBAN_SORT_KEYS = ["manual", "priority", "due-date"] as const
export type KanbanSortKey = (typeof KANBAN_SORT_KEYS)[number]
export type KanbanSortOrder = "asc" | "desc"

const PRIORITY_ORDINAL: Record<PostItPriority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
}

/**
 * The value a card is sorted on. A missing priority or due date is `null` so
 * the comparator can keep those cards at the bottom in both directions.
 */
function sortableValue(postit: BoardPostIt, key: KanbanSortKey): number | null {
  if (key === "priority") {
    return postit.priority ? PRIORITY_ORDINAL[postit.priority] : null
  }
  if (key === "due-date") {
    if (!postit.due_date) return null
    // Parsed as a UTC date so timezones never shift the calendar day.
    const time = new Date(`${postit.due_date}T00:00:00Z`).getTime()
    return Number.isNaN(time) ? null : time
  }
  return null
}

/**
 * Compare two cards on the selected key. Cards without a value always end up
 * last, whichever direction is selected, so missing metadata never pushes
 * urgent cards to the bottom.
 */
function comparePostIts(
  a: BoardPostIt,
  b: BoardPostIt,
  key: KanbanSortKey,
  order: KanbanSortOrder,
): number {
  const aValue = sortableValue(a, key)
  const bValue = sortableValue(b, key)
  if (aValue === null && bValue === null) return 0
  if (aValue === null) return 1
  if (bValue === null) return -1
  return order === "asc" ? aValue - bValue : bValue - aValue
}

/**
 * Sort a copy of the cards; the shared query cache order is never mutated.
 * "Manual order" returns the cards exactly as the API delivered them.
 */
export function sortPostIts(
  postits: BoardPostIt[],
  key: KanbanSortKey,
  order: KanbanSortOrder,
): BoardPostIt[] {
  if (key === "manual") return postits
  // Array.prototype.sort is stable, so cards with equal values keep their
  // manual order.
  return [...postits].sort((a, b) => comparePostIts(a, b, key, order))
}
