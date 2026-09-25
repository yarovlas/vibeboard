import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import type { KonvaEventObject } from "konva/lib/Node"
import { Plus } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Layer, Stage } from "react-konva"

import { PostitsService } from "@/client"
import {
  type BoardPostIt,
  normalizePostIt,
  POSTIT_HEIGHT,
  POSTIT_WIDTH,
  PostItNode,
} from "@/components/Boards/PostItNode"
import { Button } from "@/components/ui/button"
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

function createTemporaryId() {
  return globalThis.crypto.randomUUID()
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

  const mutation = useMutation({
    mutationFn: (draft: BoardPostIt) =>
      PostitsService.createPostit({
        body: {
          title: draft.title,
          content: draft.content,
          x: draft.x,
          y: draft.y,
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
    mutation.mutate(draft)
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
    }
    queryClient.setQueryData<BoardPostIt[]>(
      getPostitsQueryKey(boardId),
      (current) => [...(current ?? []), draft],
    )
    setEditingId(draft.id)
  }

  const handleStageDoubleClick = (event: KonvaEventObject<MouseEvent>) => {
    const stage = event.target.getStage()
    if (!stage || event.target !== stage) return

    const pointer = stage.getRelativePointerPosition()
    if (!pointer) return

    addDraft({
      x: pointer.x - POSTIT_WIDTH / 2,
      y: pointer.y - POSTIT_HEIGHT / 2,
    })
  }

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col gap-3">
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        role="toolbar"
        aria-label="Whiteboard tools"
      >
        <p className="text-sm text-muted-foreground">
          Double-click the canvas to add a post-it.
        </p>
        <Button type="button" onClick={() => addDraft({ x: 40, y: 40 })}>
          <Plus />
          Add post-it
        </Button>
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
          >
            <Layer>
              {postits.map((postit) => (
                <PostItNode
                  key={postit.id}
                  postit={postit}
                  isEditing={postit.id === editingId}
                />
              ))}
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
            className="absolute z-10 resize-none rounded-[10px] border border-amber-300 bg-[#FEF3C7] p-4 text-sm leading-relaxed text-slate-900 shadow-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-amber-500"
            data-testid="post-it-editor"
            placeholder="Write a thought..."
            spellCheck
            style={{
              left: editingPostIt.x,
              top: editingPostIt.y,
              width: POSTIT_WIDTH - 16,
              height: POSTIT_HEIGHT - 16,
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
      </section>
    </div>
  )
}
