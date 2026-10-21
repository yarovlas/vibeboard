import { useState } from "react"

import type { PostItPriority, PostItStatus } from "@/client"
import { PostItMetaFields } from "@/components/Boards/PostItMetaEditor"
import { type BoardPostIt, POSTIT_COLORS } from "@/components/Boards/PostItNode"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** The editable fields of a post-it, as shown in the kanban dialog. */
export interface KanbanPostItDraft {
  content: string
  status: PostItStatus
  priority: PostItPriority | null
  due_date: string | null
  color: string
}

interface KanbanPostItDialogProps {
  postit: BoardPostIt
  onClose: () => void
  onSave: (draft: KanbanPostItDraft) => void
  onRequestDelete: () => void
}

/**
 * Edit dialog for a post-it opened from the kanban board. Every change is
 * kept in local draft state: the query cache is only touched when the user
 * saves. Closing via Cancel, Escape or the overlay throws the draft away.
 *
 * Mounted per post-it (the board keys it by id), so the initial state is
 * always the post-it that was opened.
 */
export function KanbanPostItDialog({
  postit,
  onClose,
  onSave,
  onRequestDelete,
}: KanbanPostItDialogProps) {
  const [draft, setDraft] = useState<KanbanPostItDraft>(() => ({
    content: postit.content,
    status: postit.status,
    priority: postit.priority,
    due_date: postit.due_date,
    color: postit.color,
  }))

  const update = (patch: Partial<KanbanPostItDraft>) =>
    setDraft((current) => ({ ...current, ...patch }))

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        data-testid="kanban-postit-dialog"
        className="max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Edit post-it</DialogTitle>
          <DialogDescription>
            Change the details of this post-it and save your changes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <label
            className="text-sm font-medium"
            htmlFor="kanban-postit-content"
          >
            Content
          </label>
          <textarea
            id="kanban-postit-content"
            data-testid="kanban-postit-content"
            maxLength={10000}
            rows={4}
            className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={draft.content}
            onChange={(event) => update({ content: event.target.value })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <PostItMetaFields
            idPrefix="kanban-postit"
            status={draft.status}
            priority={draft.priority}
            dueDate={draft.due_date}
            onStatusChange={(status) => update({ status })}
            onPriorityChange={(priority) => update({ priority })}
            onDueDateChange={(due_date) => update({ due_date })}
          />
        </div>

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Color</legend>
          <div className="flex flex-wrap gap-2">
            {POSTIT_COLORS.map((swatch) => {
              const selected = draft.color === swatch.value
              return (
                <button
                  key={swatch.name}
                  type="button"
                  aria-label={`Post-it color ${swatch.name}`}
                  aria-pressed={selected}
                  data-testid={`kanban-postit-color-${swatch.name}`}
                  onClick={() => update({ color: swatch.value })}
                  className={cn(
                    "size-7 rounded-full border border-black/10",
                    selected && "ring-2 ring-ring ring-offset-2",
                  )}
                  style={{ backgroundColor: swatch.value }}
                />
              )
            })}
          </div>
        </fieldset>

        <DialogFooter className="sm:items-center">
          <Button
            type="button"
            variant="destructive"
            data-testid="kanban-postit-delete"
            className="sm:mr-auto"
            onClick={onRequestDelete}
          >
            Delete
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            data-testid="kanban-postit-save"
            onClick={() => onSave(draft)}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
