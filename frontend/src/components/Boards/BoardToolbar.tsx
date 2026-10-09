import { Group, Pencil, Plus, Redo2, Undo2, Ungroup } from "lucide-react"

import { POSTIT_COLORS } from "@/components/Boards/PostItNode"
import { Button } from "@/components/ui/button"

interface BoardToolbarProps {
  isDrawing: boolean
  penColor: string
  penWidth: number
  canGroup: boolean
  canUngroup: boolean
  canUndo: boolean
  canRedo: boolean
  canRecolor: boolean
  onToggleDrawing: () => void
  onPenColorChange: (color: string) => void
  onPenWidthChange: (width: number) => void
  onGroup: () => void
  onUngroup: () => void
  onUndo: () => void
  onRedo: () => void
  onRecolor: (color: string) => void
  onAddPostIt: () => void
}

export function BoardToolbar({
  isDrawing,
  penColor,
  penWidth,
  canGroup,
  canUngroup,
  canUndo,
  canRedo,
  canRecolor,
  onToggleDrawing,
  onPenColorChange,
  onPenWidthChange,
  onGroup,
  onUngroup,
  onUndo,
  onRedo,
  onRecolor,
  onAddPostIt,
}: BoardToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      role="toolbar"
      aria-label="Whiteboard tools"
    >
      <p className="text-sm text-muted-foreground">
        {isDrawing
          ? "Draw on the canvas. Switch drawing off to move post-its again."
          : "Double-click the canvas to add a post-it. Click a post-it to select it. Group bundles colors into folders. Rename a folder with its ✎ button."}
      </p>
      <div className="flex items-center gap-2">
        <fieldset
          className="flex items-center gap-1"
          aria-label="Post-it color"
        >
          <legend className="sr-only">Post-it color</legend>
          {POSTIT_COLORS.map((swatch) => (
            <button
              key={swatch.name}
              type="button"
              data-testid={`postit-color-${swatch.name}`}
              aria-label={`Post-it color ${swatch.name}`}
              title={`Post-it color ${swatch.name}`}
              disabled={!canRecolor}
              onMouseDown={(event) => {
                // Keep the focus (and the open editor) while recoloring.
                event.preventDefault()
              }}
              onClick={() => onRecolor(swatch.value)}
              className="h-7 w-7 rounded-full border border-black/10 disabled:cursor-not-allowed disabled:opacity-30"
              style={{ backgroundColor: swatch.value }}
            />
          ))}
        </fieldset>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onGroup}
          disabled={!canGroup}
          data-testid="group-postits"
          aria-label="Group post-its by color"
          title="Group post-its by color"
        >
          <Group />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onUngroup}
          disabled={!canUngroup}
          data-testid="ungroup-postits"
          aria-label="Ungroup post-its"
          title="Ungroup post-its"
        >
          <Ungroup />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          data-testid="undo-stroke"
          aria-label="Undo stroke"
          title="Undo stroke (Ctrl+Z)"
        >
          <Undo2 />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          data-testid="redo-stroke"
          aria-label="Redo stroke"
          title="Redo stroke (Ctrl+Y)"
        >
          <Redo2 />
        </Button>
        {isDrawing && (
          <>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Pen color
              <input
                type="color"
                aria-label="Pen color"
                value={penColor}
                onChange={(event) => onPenColorChange(event.target.value)}
                className="h-8 w-10 cursor-pointer rounded border bg-background p-0.5"
                data-testid="pen-color"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Pen width
              <select
                aria-label="Pen width"
                value={penWidth}
                onChange={(event) =>
                  onPenWidthChange(Number(event.target.value))
                }
                className="h-8 cursor-pointer rounded-md border bg-background px-1.5 text-sm"
                data-testid="pen-width"
              >
                {[2, 4, 8, 12].map((width) => (
                  <option key={width} value={width}>
                    {width}px
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <Button
          type="button"
          variant={isDrawing ? "secondary" : "outline"}
          onClick={onToggleDrawing}
          data-testid="drawing-toggle"
          aria-pressed={isDrawing}
        >
          <Pencil />
          {isDrawing ? "Drawing..." : "Draw"}
        </Button>
        <Button type="button" onClick={onAddPostIt} disabled={isDrawing}>
          <Plus />
          Add post-it
        </Button>
      </div>
    </div>
  )
}
