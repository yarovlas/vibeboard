import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import type { KonvaEventObject } from "konva/lib/Node"
import { Group, Pencil, Plus, Redo2, Undo2, Ungroup } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Layer, Stage } from "react-konva"

import { PostitsService, StrokesService } from "@/client"
import {
  type BoardPostIt,
  normalizePostIt,
  POSTIT_COLORS,
  POSTIT_DEFAULT_COLOR,
  POSTIT_HEIGHT,
  POSTIT_WIDTH,
  PostItNode,
} from "@/components/Boards/PostItNode"
import {
  type BoardStroke,
  normalizeStroke,
  StrokeLine,
} from "@/components/Boards/StrokeLine"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

function getPostitsQueryKey(boardId: string) {
  return ["boards", boardId, "postits"] as const
}

function getPostitsQueryOptions(boardId: string) {
  return {
    queryFn: async () => {
      const response = await PostitsService.readPostits({
        path: { board_id: boardId },
      })
      return response.data.map(normalizePostIt)
    },
    queryKey: getPostitsQueryKey(boardId),
  }
}

function getStrokesQueryKey(boardId: string) {
  return ["boards", boardId, "strokes"] as const
}

function getStrokesQueryOptions(boardId: string) {
  return {
    queryFn: async () => {
      const response = await StrokesService.readStrokes({
        path: { board_id: boardId },
      })
      return response.data.map(normalizeStroke)
    },
    queryKey: getStrokesQueryKey(boardId),
  }
}

function createTemporaryId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `temporary-${globalThis.crypto.randomUUID()}`
  }
  return `temporary-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function clampPosition(
  position: { x: number; y: number },
  canvasSize: { width: number; height: number },
) {
  return {
    x: Math.min(
      Math.max(0, position.x),
      Math.max(0, canvasSize.width - POSTIT_WIDTH),
    ),
    y: Math.min(
      Math.max(0, position.y),
      Math.max(0, canvasSize.height - POSTIT_HEIGHT),
    ),
  }
}

interface WhiteboardCanvasProps {
  boardId: string
}

export function WhiteboardCanvas({ boardId }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const handledIds = useRef(new Set<string>())
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()
  const { data: postits } = useSuspenseQuery(getPostitsQueryOptions(boardId))
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [penColor, setPenColor] = useState("#111827")
  const [penWidth, setPenWidth] = useState(4)
  const [currentPoints, setCurrentPoints] = useState<number[] | null>(null)
  const [redoStack, setRedoStack] = useState<BoardStroke[]>([])
  const isPointerDown = useRef(false)
  const doomedStrokeIds = useRef(new Set<string>())
  const { data: strokes } = useSuspenseQuery(getStrokesQueryOptions(boardId))
  const [deleteCandidate, setDeleteCandidate] = useState<BoardPostIt | null>(
    null,
  )
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const width = Math.floor(canvas.clientWidth)
      const height = Math.floor(canvas.clientHeight)
      setCanvasSize((current) => {
        if (current.width === width && current.height === height) return current
        return { width, height }
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (editingId) editorRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    setRedoStack([])
  }, [])

  const mutation = useMutation({
    mutationFn: (draft: BoardPostIt) =>
      PostitsService.createPostit({
        body: {
          title: draft.title,
          content: draft.content,
          x: draft.x,
          y: draft.y,
          color: draft.color,
          group_id: draft.group_id,
        },
        path: { board_id: boardId },
      }),
    onError: (error, draft) => {
      handledIds.current.delete(draft.id)
      queryClient.setQueryData<BoardPostIt[]>(
        getPostitsQueryKey(boardId),
        (current) => current?.filter((postit) => postit.id !== draft.id),
      )
      setEditingId((current) => (current === draft.id ? null : current))
      handleError.call(showErrorToast, error)
    },
    onSuccess: (response, draft) => {
      const savedPostIt = normalizePostIt(response.data)
      queryClient.setQueryData<BoardPostIt[]>(
        getPostitsQueryKey(boardId),
        (current) =>
          current?.map((postit) =>
            postit.id === draft.id ? savedPostIt : postit,
          ),
      )
      void queryClient.invalidateQueries({
        queryKey: ["boards", "detail", boardId],
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (draft: BoardPostIt) =>
      PostitsService.updatePostit({
        body: {
          title: draft.title,
          content: draft.content,
          x: draft.x,
          y: draft.y,
          color: draft.color,
          group_id: draft.group_id,
        },
        path: { board_id: boardId, id: draft.id },
      }),
    onError: (error, draft) => {
      handledIds.current.delete(draft.id)
      setEditingId((current) => (current === draft.id ? null : current))
      void queryClient.invalidateQueries({
        queryKey: getPostitsQueryKey(boardId),
      })
      handleError.call(showErrorToast, error)
    },
    onSuccess: (response, draft) => {
      const savedPostIt = normalizePostIt(response.data)
      queryClient.setQueryData<BoardPostIt[]>(
        getPostitsQueryKey(boardId),
        (current) =>
          current?.map((postit) =>
            postit.id === draft.id ? savedPostIt : postit,
          ),
      )
      void queryClient.invalidateQueries({
        queryKey: ["boards", "detail", boardId],
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (postitId: string) =>
      PostitsService.deletePostit({
        path: { board_id: boardId, id: postitId },
      }),
    onError: (error) => {
      handleError.call(showErrorToast, error)
    },
    onSuccess: (_response, postitId) => {
      queryClient.setQueryData<BoardPostIt[]>(
        getPostitsQueryKey(boardId),
        (current) => current?.filter((postit) => postit.id !== postitId),
      )
      setSelectedIds((current) => current.filter((id) => id !== postitId))
      void queryClient.invalidateQueries({
        queryKey: ["boards", "detail", boardId],
      })
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (
      items: Array<{
        id: string
        x?: number
        y?: number
        color?: string
        group_id?: string | null
      }>,
    ) =>
      PostitsService.updatePostitsBulk({
        body: items,
        path: { board_id: boardId },
      }),
    onError: (error) => {
      void queryClient.invalidateQueries({
        queryKey: getPostitsQueryKey(boardId),
      })
      handleError.call(showErrorToast, error)
    },
    onSuccess: (response) => {
      const saved = response.data.map(normalizePostIt)
      const savedById = new Map(saved.map((postit) => [postit.id, postit]))
      queryClient.setQueryData<BoardPostIt[]>(
        getPostitsQueryKey(boardId),
        (current) =>
          current?.map((postit) => savedById.get(postit.id) ?? postit),
      )
      void queryClient.invalidateQueries({
        queryKey: ["boards", "detail", boardId],
      })
    },
  })

  const deleteStrokeMutation = useMutation({
    mutationFn: (strokeId: string) =>
      StrokesService.deleteStroke({
        path: { board_id: boardId, id: strokeId },
      }),
    onError: (error) => {
      setRedoStack([])
      void queryClient.invalidateQueries({
        queryKey: getStrokesQueryKey(boardId),
      })
      handleError.call(showErrorToast, error)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["boards", "detail", boardId],
      })
    },
  })

  const strokeMutation = useMutation({
    mutationFn: (line: BoardStroke) =>
      StrokesService.createStroke({
        body: {
          points: line.points,
          color: line.color,
          width: line.width,
          tool: line.tool,
        },
        path: { board_id: boardId },
      }),
    onError: (error, line) => {
      doomedStrokeIds.current.delete(line.id)
      queryClient.setQueryData<BoardStroke[]>(
        getStrokesQueryKey(boardId),
        (current) => current?.filter((stroke) => stroke.id !== line.id),
      )
      handleError.call(showErrorToast, error)
    },
    onSuccess: (response, line) => {
      if (doomedStrokeIds.current.has(line.id)) {
        // Undone while the save was still in flight: remove the saved
        // stroke again instead of inserting it into the canvas.
        doomedStrokeIds.current.delete(line.id)
        deleteStrokeMutation.mutate(response.data.id)
        return
      }
      const savedStroke = normalizeStroke(response.data)
      queryClient.setQueryData<BoardStroke[]>(
        getStrokesQueryKey(boardId),
        (current) =>
          current?.map((stroke) =>
            stroke.id === line.id ? savedStroke : stroke,
          ),
      )
      void queryClient.invalidateQueries({
        queryKey: ["boards", "detail", boardId],
      })
    },
  })

  const editingPostIt = postits.find((postit) => postit.id === editingId)

  const removeDraft = (postitId: string) => {
    queryClient.setQueryData<BoardPostIt[]>(
      getPostitsQueryKey(boardId),
      (current) => current?.filter((postit) => postit.id !== postitId),
    )
  }

  const commitDraft = (draft: BoardPostIt) => {
    if (handledIds.current.has(draft.id)) return
    handledIds.current.add(draft.id)
    setEditingId((current) => (current === draft.id ? null : current))
    // The render-scope draft can predate the last keystroke when blur fires
    // before re-render. The query cache is updated synchronously on every
    // change, so always commit the freshest version.
    const fresh =
      queryClient
        .getQueryData<BoardPostIt[]>(getPostitsQueryKey(boardId))
        ?.find((postit) => postit.id === draft.id) ?? draft
    const isTemporary = fresh.id.startsWith("temporary-")
    if (isTemporary) {
      mutation.mutate(fresh)
    } else {
      updateMutation.mutate(fresh)
    }
  }

  const cancelDraft = (draft: BoardPostIt) => {
    if (handledIds.current.has(draft.id)) return
    handledIds.current.add(draft.id)
    removeDraft(draft.id)
    setEditingId((current) => (current === draft.id ? null : current))
  }

  const updateDraftContent = (postitId: string, content: string) => {
    queryClient.setQueryData<BoardPostIt[]>(
      getPostitsQueryKey(boardId),
      (current) =>
        current?.map((postit) =>
          postit.id === postitId ? { ...postit, content } : postit,
        ),
    )
  }

  const selectPostIt = (postit: BoardPostIt, additive: boolean) => {
    if (postit.id.startsWith("temporary-")) return
    setSelectedIds((current) => {
      if (additive) {
        return current.includes(postit.id)
          ? current.filter((id) => id !== postit.id)
          : [...current, postit.id]
      }
      return [postit.id]
    })
  }

  const recolorSelected = (color: string) => {
    const targets = postits.filter(
      (postit) =>
        selectedIds.includes(postit.id) &&
        !postit.id.startsWith("temporary-") &&
        postit.color !== color,
    )
    if (targets.length === 0) return
    queryClient.setQueryData<BoardPostIt[]>(
      getPostitsQueryKey(boardId),
      (current) =>
        current?.map((postit) =>
          selectedIds.includes(postit.id) ? { ...postit, color } : postit,
        ),
    )
    for (const target of targets) {
      updateMutation.mutate({ ...target, color })
    }
  }

  const groupSelected = () => {
    const targets = postits.filter(
      (postit) =>
        selectedIds.includes(postit.id) && !postit.id.startsWith("temporary-"),
    )
    if (targets.length < 2) return
    const groupId = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `group-${Date.now()}-${Math.random().toString(36).slice(2)}`
    queryClient.setQueryData<BoardPostIt[]>(
      getPostitsQueryKey(boardId),
      (current) =>
        current?.map((postit) =>
          selectedIds.includes(postit.id)
            ? { ...postit, group_id: groupId }
            : postit,
        ),
    )
    bulkMutation.mutate(
      targets.map((target) => ({ id: target.id, group_id: groupId })),
    )
  }

  const ungroupSelected = () => {
    const targets = postits.filter(
      (postit) =>
        selectedIds.includes(postit.id) &&
        !postit.id.startsWith("temporary-") &&
        postit.group_id !== null,
    )
    if (targets.length === 0) return
    queryClient.setQueryData<BoardPostIt[]>(
      getPostitsQueryKey(boardId),
      (current) =>
        current?.map((postit) =>
          selectedIds.includes(postit.id)
            ? { ...postit, group_id: null }
            : postit,
        ),
    )
    bulkMutation.mutate(
      targets.map((target) => ({ id: target.id, group_id: null })),
    )
  }

  const movePostIt = (
    postit: BoardPostIt,
    position: { x: number; y: number },
  ) => {
    if (postit.id.startsWith("temporary-")) return
    if (postit.id === editingId) return
    const clamped = clampPosition(position, canvasSize)
    if (clamped.x === postit.x && clamped.y === postit.y) return
    const moved: BoardPostIt = { ...postit, x: clamped.x, y: clamped.y }
    queryClient.setQueryData<BoardPostIt[]>(
      getPostitsQueryKey(boardId),
      (current) =>
        current?.map((item) => (item.id === moved.id ? moved : item)),
    )
    updateMutation.mutate(moved)
  }

  const addDraft = (position: { x: number; y: number }) => {
    if (editingPostIt && !handledIds.current.has(editingPostIt.id)) {
      commitDraft(editingPostIt)
    }

    const draft: BoardPostIt = {
      id: createTemporaryId(),
      board_id: boardId,
      title: "",
      content: "",
      x: clampPosition(position, canvasSize).x,
      y: clampPosition(position, canvasSize).y,
      color: POSTIT_DEFAULT_COLOR,
      group_id: null,
    }
    queryClient.setQueryData<BoardPostIt[]>(
      getPostitsQueryKey(boardId),
      (current) => [...(current ?? []), draft],
    )
    setEditingId(draft.id)
  }

  const handleStageDoubleClick = (event: KonvaEventObject<MouseEvent>) => {
    if (isDrawing) return
    const stage = event.target.getStage()
    if (!stage || event.target !== stage) return

    const pointer = stage.getRelativePointerPosition()
    if (!pointer) return

    addDraft({
      x: pointer.x - POSTIT_WIDTH / 2,
      y: pointer.y - POSTIT_HEIGHT / 2,
    })
  }

  const getPointerPosition = (
    event: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>,
  ) => event.target.getStage()?.getRelativePointerPosition() ?? null

  const handlePointerDown = (
    event: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>,
  ) => {
    if (!isDrawing) return
    const pointer = getPointerPosition(event)
    if (!pointer) return
    isPointerDown.current = true
    setCurrentPoints([pointer.x, pointer.y])
  }

  const handlePointerMove = (
    event: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>,
  ) => {
    if (!isDrawing || !isPointerDown.current) return
    const pointer = getPointerPosition(event)
    if (!pointer) return
    setCurrentPoints((current) => [...(current ?? []), pointer.x, pointer.y])
  }

  const finishStroke = () => {
    if (!isDrawing || !isPointerDown.current) return
    isPointerDown.current = false
    if (currentPoints && currentPoints.length >= 4) {
      const line: BoardStroke = {
        id: createTemporaryId(),
        board_id: boardId,
        points: currentPoints,
        color: penColor,
        width: penWidth,
        tool: "pen",
      }
      queryClient.setQueryData<BoardStroke[]>(
        getStrokesQueryKey(boardId),
        (current) => [...(current ?? []), line],
      )
      setRedoStack([])
      strokeMutation.mutate(line)
    }
    setCurrentPoints(null)
  }

  const undoStroke = () => {
    const last = strokes[strokes.length - 1]
    if (!last) return
    queryClient.setQueryData<BoardStroke[]>(
      getStrokesQueryKey(boardId),
      (current) => current?.filter((stroke) => stroke.id !== last.id),
    )
    setRedoStack((current) => [...current, last])
    if (last.id.startsWith("temporary-")) {
      doomedStrokeIds.current.add(last.id)
    } else {
      deleteStrokeMutation.mutate(last.id)
    }
  }

  const redoStroke = () => {
    const last = redoStack[redoStack.length - 1]
    if (!last) return
    // Re-save as a new stroke so this works for deleted strokes too,
    // regardless of whether the original save had finished.
    const line: BoardStroke = { ...last, id: createTemporaryId() }
    setRedoStack((current) => current.slice(0, -1))
    queryClient.setQueryData<BoardStroke[]>(
      getStrokesQueryKey(boardId),
      (current) => [...(current ?? []), line],
    )
    strokeMutation.mutate(line)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === "z" && !event.shiftKey) {
        event.preventDefault()
        undoStroke()
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault()
        redoStroke()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col gap-3">
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        role="toolbar"
        aria-label="Whiteboard tools"
      >
        <p className="text-sm text-muted-foreground">
          {isDrawing
            ? "Draw on the canvas. Switch drawing off to move post-its again."
            : "Double-click the canvas to add a post-it."}
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
                disabled={selectedIds.length === 0}
                onClick={() => recolorSelected(swatch.value)}
                className="h-7 w-7 rounded-full border border-black/10 disabled:cursor-not-allowed disabled:opacity-30"
                style={{ backgroundColor: swatch.value }}
              />
            ))}
          </fieldset>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={groupSelected}
            disabled={selectedIds.length < 2}
            data-testid="group-postits"
            aria-label="Group post-its"
            title="Group selected post-its (select with Shift-click)"
          >
            <Group />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={ungroupSelected}
            disabled={
              !postits.some(
                (postit) =>
                  selectedIds.includes(postit.id) && postit.group_id !== null,
              )
            }
            data-testid="ungroup-postits"
            aria-label="Ungroup post-its"
            title="Ungroup selected post-its"
          >
            <Ungroup />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={undoStroke}
            disabled={strokes.length === 0}
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
            onClick={redoStroke}
            disabled={redoStack.length === 0}
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
                  onChange={(event) => setPenColor(event.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border bg-background p-0.5"
                  data-testid="pen-color"
                />
              </label>
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Pen width
                <select
                  aria-label="Pen width"
                  value={penWidth}
                  onChange={(event) => setPenWidth(Number(event.target.value))}
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
            onClick={() => setIsDrawing((current) => !current)}
            data-testid="drawing-toggle"
            aria-pressed={isDrawing}
          >
            <Pencil />
            {isDrawing ? "Drawing..." : "Draw"}
          </Button>
          <Button
            type="button"
            onClick={() => addDraft({ x: 40, y: 40 })}
            disabled={isDrawing}
          >
            <Plus />
            Add post-it
          </Button>
        </div>
      </div>

      <section
        ref={canvasRef}
        className="relative min-h-[420px] flex-1 overflow-hidden rounded-xl border bg-background"
        data-testid="whiteboard-stage"
        aria-label="Whiteboard canvas"
      >
        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <Stage
            width={canvasSize.width}
            height={canvasSize.height}
            onDblClick={handleStageDoubleClick}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={finishStroke}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={finishStroke}
            onClick={(event) => {
              if (event.target === event.target.getStage()) {
                setSelectedIds([])
              }
            }}
          >
            <Layer listening={!isDrawing}>
              {postits.map((postit) =>
                postit.id === editingId ? null : (
                  <PostItNode
                    key={postit.id}
                    postit={postit}
                    isEditing={false}
                    isDrawing={isDrawing}
                    isSelected={selectedIds.includes(postit.id)}
                    isGrouped={postit.group_id !== null}
                    onEdit={(p) => {
                      handledIds.current.delete(p.id)
                      setEditingId(p.id)
                    }}
                    onDelete={(p) => setDeleteCandidate(p)}
                    onSelect={(p, additive) => selectPostIt(p, additive)}
                    onDragEnd={(p, position) => movePostIt(p, position)}
                    dragBoundFunc={(position) =>
                      clampPosition(position, canvasSize)
                    }
                  />
                ),
              )}
            </Layer>
            <Layer listening={false}>
              {strokes.map((stroke) => (
                <StrokeLine key={stroke.id} stroke={stroke} />
              ))}
              {currentPoints && currentPoints.length >= 2 && (
                <StrokeLine
                  stroke={{
                    id: "current-stroke",
                    board_id: boardId,
                    points: currentPoints,
                    color: penColor,
                    width: penWidth,
                    tool: "pen",
                  }}
                />
              )}
            </Layer>
          </Stage>
        )}

        {postits.length === 0 && !editingPostIt && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
            <div>
              <p className="font-medium">Empty workspace</p>
              <p className="text-sm text-muted-foreground">
                Add a post-it to start capturing ideas.
              </p>
            </div>
          </div>
        )}

        {editingPostIt && (
          <textarea
            ref={editorRef}
            aria-label="Post-it text"
            className="absolute z-10 resize-none rounded-[10px] border border-amber-300 p-4 text-sm leading-relaxed text-slate-900 shadow-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-amber-500"
            data-testid="post-it-editor"
            placeholder="Write a thought..."
            spellCheck
            style={{
              left: editingPostIt.x,
              top: editingPostIt.y,
              width: POSTIT_WIDTH - 16,
              height: POSTIT_HEIGHT - 16,
              backgroundColor: editingPostIt.color || POSTIT_DEFAULT_COLOR,
            }}
            value={editingPostIt.content}
            onBlur={() => commitDraft(editingPostIt)}
            onChange={(event) =>
              updateDraftContent(editingPostIt.id, event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                cancelDraft(editingPostIt)
                return
              }
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault()
                commitDraft(editingPostIt)
              }
            }}
          />
        )}

        <ul className="sr-only" aria-label="Post-its on this whiteboard">
          {postits.map((postit) => (
            <li key={postit.id}>
              {postit.title
                ? `${postit.title}: ${postit.content}`
                : postit.content || "Empty post-it"}
            </li>
          ))}
        </ul>

        <Dialog
          open={deleteCandidate !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteCandidate(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post-it verwijderen</DialogTitle>
              <DialogDescription>
                Weet je zeker dat je deze post-it wilt verwijderen? Deze actie
                kan niet ongedaan worden gemaakt.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteCandidate(null)}
              >
                Annuleren
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteCandidate) {
                    deleteMutation.mutate(deleteCandidate.id)
                    setDeleteCandidate(null)
                  }
                }}
              >
                Verwijderen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  )
}
