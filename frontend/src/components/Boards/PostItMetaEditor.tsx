import type { PostItPriority, PostItStatus } from "@/client"
import { POSTIT_HEIGHT, STATUS_LABELS } from "@/components/Boards/PostItNode"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PRIORITY_LABELS: Record<PostItPriority, string> = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
}

/** Radix Select cannot hold an empty value: "none" stands in for null. */
const NO_PRIORITY = "none"

interface PostItMetaFieldsProps {
  status: PostItStatus
  priority: PostItPriority | null
  dueDate: string | null
  onStatusChange: (status: PostItStatus) => void
  onPriorityChange: (priority: PostItPriority | null) => void
  onDueDateChange: (dueDate: string | null) => void
  /**
   * Prefix for the control ids and test ids. The whiteboard keeps the
   * historical "postit" ids; other editors use their own prefix so both can
   * be on the page at the same time without clashing.
   */
  idPrefix?: string
  /** Return focus elsewhere after a select menu closes (whiteboard editor). */
  onRestoreFocus?: () => void
}

/**
 * Status, priority and due date controls, shared by the whiteboard metadata
 * panel and the kanban edit dialog. Purely controlled: the caller owns the
 * values and decides when they are saved.
 */
export function PostItMetaFields({
  status,
  priority,
  dueDate,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  idPrefix = "postit",
  onRestoreFocus,
}: PostItMetaFieldsProps) {
  const statusId = `${idPrefix}-status-select`
  const priorityId = `${idPrefix}-priority-select`
  const dueDateId = `${idPrefix}-due-date`
  // Only override the close behaviour when there is a focus target to
  // restore; otherwise Radix returns focus to the trigger as usual.
  const restoreFocus = onRestoreFocus
    ? (event: Event) => {
        event.preventDefault()
        onRestoreFocus()
      }
    : undefined

  return (
    <>
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium text-muted-foreground"
          htmlFor={statusId}
        >
          Status
        </label>
        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as PostItStatus)}
        >
          <SelectTrigger
            id={statusId}
            size="sm"
            className="h-8 w-full"
            data-testid={statusId}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent onCloseAutoFocus={restoreFocus}>
            {(Object.keys(STATUS_LABELS) as PostItStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium text-muted-foreground"
          htmlFor={priorityId}
        >
          Priority
        </label>
        <Select
          value={priority ?? NO_PRIORITY}
          onValueChange={(value) =>
            onPriorityChange(
              value === NO_PRIORITY ? null : (value as PostItPriority),
            )
          }
        >
          <SelectTrigger
            id={priorityId}
            size="sm"
            className="h-8 w-full"
            data-testid={priorityId}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent onCloseAutoFocus={restoreFocus}>
            <SelectItem value={NO_PRIORITY}>None</SelectItem>
            {(Object.keys(PRIORITY_LABELS) as PostItPriority[]).map((value) => (
              <SelectItem key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium text-muted-foreground"
          htmlFor={dueDateId}
        >
          Due date
        </label>
        <input
          id={dueDateId}
          type="date"
          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid={dueDateId}
          value={dueDate ?? ""}
          onChange={(event) =>
            onDueDateChange(
              event.target.value === "" ? null : event.target.value,
            )
          }
        />
      </div>
    </>
  )
}

interface PostItMetaEditorProps {
  status: PostItStatus
  priority: PostItPriority | null
  dueDate: string | null
  x: number
  y: number
  onStatusChange: (status: PostItStatus) => void
  onPriorityChange: (priority: PostItPriority | null) => void
  onDueDateChange: (dueDate: string | null) => void
  /** Focus left the editor UI entirely (canvas, toolbar): save. */
  onEditorLeave: () => void
  /** Return to the text editor after the select menu closes. */
  onRestoreFocus: () => void
}

/**
 * Panel anchored below the open post-it editor (same coordinate space as
 * the textarea overlay). It holds the metadata controls that the plain
 * textarea cannot: status first, priority and due date follow.
 */
export function PostItMetaEditor({
  status,
  priority,
  dueDate,
  x,
  y,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  onEditorLeave,
  onRestoreFocus,
}: PostItMetaEditorProps) {
  return (
    <fieldset
      className="absolute z-10 m-0 flex w-[204px] flex-col gap-2 rounded-[10px] border border-slate-200 bg-background px-3 py-2 shadow-lg"
      aria-label="Post-it metadata"
      data-testid="post-it-meta-editor"
      data-postit-editor-ui
      style={{ left: x, top: y + POSTIT_HEIGHT - 16 + 6 }}
      // Keep the text editor focused while the panel is used: a blur would
      // commit the draft and unmount this panel mid-interaction.
      onMouseDown={(event) => {
        if (event.target instanceof HTMLInputElement) return
        event.preventDefault()
      }}
      onBlur={(event) => {
        const target = event.relatedTarget
        const staysInEditor =
          target instanceof Element &&
          (target.closest("[data-postit-editor-ui]") !== null ||
            target.closest("[data-slot='select-content']") !== null)
        if (!staysInEditor) onEditorLeave()
      }}
    >
      <PostItMetaFields
        status={status}
        priority={priority}
        dueDate={dueDate}
        onStatusChange={onStatusChange}
        onPriorityChange={onPriorityChange}
        onDueDateChange={onDueDateChange}
        onRestoreFocus={onRestoreFocus}
      />
    </fieldset>
  )
}
