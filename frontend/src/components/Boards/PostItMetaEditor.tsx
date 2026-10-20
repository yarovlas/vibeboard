import type { PostItStatus } from "@/client"
import { POSTIT_HEIGHT, STATUS_LABELS } from "@/components/Boards/PostItNode"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PostItMetaEditorProps {
  status: PostItStatus
  x: number
  y: number
  onStatusChange: (status: PostItStatus) => void
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
  x,
  y,
  onStatusChange,
  onEditorLeave,
  onRestoreFocus,
}: PostItMetaEditorProps) {
  return (
    <fieldset
      className="absolute z-10 m-0 flex items-center gap-2 rounded-[10px] border border-slate-200 bg-background px-3 py-2 shadow-lg"
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
      <label
        className="text-xs font-medium text-muted-foreground"
        htmlFor="postit-status-select"
      >
        Status
      </label>
      <Select
        value={status}
        onValueChange={(value) => onStatusChange(value as PostItStatus)}
      >
        <SelectTrigger
          id="postit-status-select"
          size="sm"
          className="h-8"
          data-testid="postit-status-select"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            onRestoreFocus()
          }}
        >
          {(Object.keys(STATUS_LABELS) as PostItStatus[]).map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </fieldset>
  )
}
