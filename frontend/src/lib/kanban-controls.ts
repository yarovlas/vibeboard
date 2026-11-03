import type { PostItPriority, PostItStatus } from "@/client"
import type { BoardPostIt } from "@/components/Boards/PostItNode"

export const KANBAN_STATUSES: PostItStatus[] = ["TODO", "IN_PROGRESS", "DONE"]

export const KANBAN_SORT_KEYS = ["manual", "priority", "due-date"] as const
export type KanbanSortKey = (typeof KANBAN_SORT_KEYS)[number]
export type KanbanSortOrder = "asc" | "desc"

export const PRIORITY_FILTER_OPTIONS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "NONE",
] as const
/** The priority filter also accepts "NONE" for cards without a priority. */
export type PriorityFilter = (typeof PRIORITY_FILTER_OPTIONS)[number]

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

const isPostItStatus = (value: string): value is PostItStatus =>
  (KANBAN_STATUSES as string[]).includes(value)

const isPriorityFilter = (value: string): value is PriorityFilter =>
  (PRIORITY_FILTER_OPTIONS as readonly string[]).includes(value)

/**
 * Parse a comma-separated (or JSON array, as written by the router) search
 * param into a deduplicated list of known values. An absent param yields
 * `undefined`; a present but empty param yields an explicit empty list.
 */
function parseEnumList<T extends string>(
  raw: unknown,
  guard: (value: string) => value is T,
): T[] | undefined {
  const rawValues = Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === "string")
    : typeof raw === "string"
      ? raw.split(",")
      : null
  if (rawValues === null) return undefined
  return [...new Set(rawValues.map((value) => value.trim()).filter(guard))]
}

/**
 * Filter state stored in the URL search params. An absent list means every
 * option is visible; an explicit empty list means the user hid them all.
 */
export interface KanbanSearchState {
  status?: PostItStatus[]
  priority?: PriorityFilter[]
}

/** `validateSearch` for the board route. */
export function parseKanbanSearch(
  raw: Record<string, unknown>,
): KanbanSearchState {
  return {
    status: parseEnumList(raw.status, isPostItStatus),
    priority: parseEnumList(raw.priority, isPriorityFilter),
  }
}

export interface KanbanFilters {
  statuses: PostItStatus[]
  priorities: PriorityFilter[]
}

/** Fill in the defaults: no parameters means every status and priority. */
export function normalizeKanbanFilters(
  state: KanbanSearchState,
): KanbanFilters {
  return {
    statuses: state.status ?? [...KANBAN_STATUSES],
    priorities: state.priority ?? [...PRIORITY_FILTER_OPTIONS],
  }
}

export function matchesKanbanFilters(
  postit: BoardPostIt,
  filters: KanbanFilters,
): boolean {
  return (
    filters.statuses.includes(postit.status) &&
    filters.priorities.includes(postit.priority ?? "NONE")
  )
}

/** Add or remove a value; the result keeps the canonical option order. */
export function toggleFilterValue<T extends string>(
  values: T[],
  value: T,
  all: readonly T[],
): T[] {
  const next = new Set(values)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return all.filter((option) => next.has(option))
}

/**
 * Serialize the filters to the route search state. The defaults are omitted
 * so a pristine board keeps a clean URL.
 */
export function toKanbanSearchState(filters: KanbanFilters): KanbanSearchState {
  return {
    status:
      filters.statuses.length === KANBAN_STATUSES.length
        ? undefined
        : filters.statuses,
    priority:
      filters.priorities.length === PRIORITY_FILTER_OPTIONS.length
        ? undefined
        : filters.priorities,
  }
}
