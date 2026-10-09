import { useRef, useState } from "react"

import { POSTIT_HEIGHT, POSTIT_WIDTH } from "@/components/Boards/PostItNode"

interface FolderNameEditorProps {
  initialName: string
  x: number
  y: number
  color: string
  onCommit: (name: string) => void
  onCancel: () => void
}

export function FolderNameEditor({
  initialName,
  x,
  y,
  color,
  onCommit,
  onCancel,
}: FolderNameEditorProps) {
  const [name, setName] = useState(initialName)
  // Escape unmounts the editor, which can fire blur afterwards: finish
  // exactly once so a cancelled rename never commits.
  const done = useRef(false)
  const finish = (commit: boolean, value: string) => {
    if (done.current) return
    done.current = true
    if (commit) onCommit(value)
    else onCancel()
  }

  return (
    <textarea
      ref={(node) => {
        node?.focus()
        node?.select()
      }}
      aria-label="Folder name"
      className="absolute z-10 resize-none rounded-[10px] border border-amber-300 p-4 text-center text-lg font-medium text-slate-900 shadow-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-amber-500"
      data-testid="folder-name-editor"
      placeholder="Name this group..."
      spellCheck
      style={{
        left: x,
        top: y,
        width: POSTIT_WIDTH - 16,
        height: POSTIT_HEIGHT - 16,
        backgroundColor: color,
      }}
      value={name}
      onBlur={() => finish(true, name)}
      onChange={(event) => setName(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          finish(false, name)
          return
        }
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault()
          finish(true, name)
        }
      }}
    />
  )
}
