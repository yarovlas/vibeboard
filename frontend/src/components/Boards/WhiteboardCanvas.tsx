import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import type { KonvaEventObject } from "konva/lib/Node"
import { Group, Pencil, Plus, Redo2, Undo2, Ungroup } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Layer, Stage } from "react-konva"
import type { BoardPublic } from "@/client"
import { BoardsService, PostitsService, StrokesService } from "@/client"
import { FolderNode } from "@/components/Boards/FolderNode"
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

function getBoardQueryOptions(boardId: string) {
  return {
    queryFn: async () =>
      (await BoardsService.readBoard({ path: { id: boardId } })).data,
    queryKey: ["boards", "detail", boardId] as const,
  }
}

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

const FOLDER_ROW_X = 40
const FOLDER_ROW_Y = 40
const FOLDER_GAP = 48
const FOLDER_AUTO_COLLAPSE_MS = 10_000

function dockPerRow(canvasWidth: number) {
  return Math.max(
    1,
    Math.floor((canvasWidth - FOLDER_ROW_X) / (POSTIT_WIDTH + FOLDER_GAP)),
  )
}

function dockSlotAt(slot: number, perRow: number) {
  return {
    x: FOLDER_ROW_X + (slot % perRow) * (POSTIT_WIDTH + FOLDER_GAP),
    y: FOLDER_ROW_Y + Math.floor(slot / perRow) * (POSTIT_HEIGHT + FOLDER_GAP),
  }
}

// First dock slot whose box keeps a full gap from every taken box.
function findFreeDockSlot(taken: { x: number; y: number }[], perRow: number) {
  for (let slot = 0; slot < 500; slot++) {
    const position = dockSlotAt(slot, perRow)
    const blocked = taken.some(
      (box) =>
        Math.abs(box.x - position.x) < POSTIT_WIDTH + FOLDER_GAP &&
        Math.abs(box.y - position.y) < POSTIT_HEIGHT + FOLDER_GAP,
    )
    if (!blocked) return position
  }
  return dockSlotAt(500, perRow)
}

function FolderNameEditor({
  initialName,
  x,
  y,
  color,
  onCommit,
  onCancel,
}: {
  initialName: string
  x: number
  y: number
  color: string
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  // Escape unmounts the editor, which can fire blur afterwards: finish
  // exactly once so a cancelled rename never commits.
  const done = useRef(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])
  const finish = (commit: boolean) => {
    if (done.current) return
    done.current = true
    if (commit) onCommit(name)
    else onCancel()
  }
  return (
    <textarea
      ref={inputRef}
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
      onBlur={() => finish(true)}
      onChange={(event) => setName(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          finish(false)
          return
        }
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault()
          finish(true)
        }
      }}
    />
  )
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
  const { data: board } = useSuspenseQuery(getBoardQueryOptions(boardId))
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
  const [folderDeleteCandidate, setFolderDeleteCandidate] = useState<{
    color: string
    ids: string[]
  } | null>(null)
  // Colors expanded by clicking a folder collapse back automatically when
  // none of their post-its are touched before the timer runs out.
  const autoCollapseTimers = useRef(new Map<string, number>())
  const timerBoardId = useRef(boardId)
  if (timerBoardId.current !== boardId) {
    timerBoardId.current = boardId
    for (const timer of autoCollapseTimers.current.values()) {
      clearTimeout(timer)
    }
    autoCollapseTimers.current.clear()
  }

  useEffect(() => {
    const timers = autoCollapseTimers.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    }
  }, [])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // User-moved folder positions, keyed by color. A moved folder stays where
  // it was dropped (persisted per board) until moved again; every other
  // folder lives in the dedicated dock row at the top with a constant gap.
  const folderPositionsKey = `vibeboard:folder-positions:${boardId}`
  const [folderPositions, setFolderPositions] = useState<
    Record<string, { x: number; y: number }>
  >(() => {
    try {
      const raw = localStorage.getItem(folderPositionsKey)
      const parsed: unknown = raw ? JSON.parse(raw) : null
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const positions: Record<string, { x: number; y: number }> = {}
        for (const [color, value] of Object.entries(
          parsed as Record<string, unknown>,
        )) {
          if (
            value &&
            typeof value === "object" &&
            Number.isFinite((value as { x?: unknown }).x) &&
            Number.isFinite((value as { y?: unknown }).y)
          ) {
            positions[color] = {
              x: (value as { x: number }).x,
              y: (value as { y: number }).y,
            }
          }
        }
        return positions
      }
    } catch {
      // Corrupt storage: folders fall back to their dock slots.
    }
    return {}
  })
  const writeFolderPositions = (
    next: Record<string, { x: number; y: number }>,
  ) => {
    setFolderPositions(next)
    try {
      localStorage.setItem(folderPositionsKey, JSON.stringify(next))
    } catch {
      // Storage full or unavailable: moves just don't survive reload.
    }
  }
  // Snapshot of which post-it ids were grouped per color. A folder only ever
  // shows its snapshot: post-its created (or recolored) afterwards stay
  // visible next to the folder until the Group button regroups explicitly.
  const folderMembersKey = `vibeboard:folder-members:${boardId}`
  const [folderMembers, setFolderMembers] = useState<Record<string, string[]>>(
    () => {
      try {
        const raw = localStorage.getItem(folderMembersKey)
        const parsed: unknown = raw ? JSON.parse(raw) : null
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, string[]>
        }
      } catch {
        // Corrupt storage: start without snapshots (legacy color behavior).
      }
      return {}
    },
  )
  const writeFolderMembers = (next: Record<string, string[]>) => {
    setFolderMembers(next)
    try {
      localStorage.setItem(folderMembersKey, JSON.stringify(next))
    } catch {
      // Storage full or unavailable: snapshots just don't survive reload.
    }
  }
  // Custom group names, keyed by color. Same local-first trade-off as the
  // snapshots above: instant and offline-friendly, per browser.
  const folderNamesKey = `vibeboard:folder-names:${boardId}`
  const [folderNames, setFolderNames] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(folderNamesKey)
      const parsed: unknown = raw ? JSON.parse(raw) : null
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const names: Record<string, string> = {}
        for (const [color, value] of Object.entries(
          parsed as Record<string, unknown>,
        )) {
          if (typeof value === "string" && value.trim()) {
            names[color] = value.slice(0, 120)
          }
        }
        return names
      }
    } catch {
      // Corrupt storage: fall back to member text.
    }
    return {}
  })
  const writeFolderNames = (next: Record<string, string>) => {
    setFolderNames(next)
    try {
      localStorage.setItem(folderNamesKey, JSON.stringify(next))
    } catch {
      // Storage full or unavailable: names just don't survive reload.
    }
  }
  const [renamingColor, setRenamingColor] = useState<string | null>(null)
  // Stable React keys for post-its: when a draft is saved, its id changes
  // from temporary to saved. Remounting the Konva node on that change breaks
  // in-flight mouse sequences and hit-testing, so the key stays put.
  const postItKeys = useRef(new Map<string, string>())

  const getPostItKey = (postit: BoardPostIt) => {
    if (postit.id.startsWith("temporary-")) return postit.id
    const known = postItKeys.current.get(postit.id)
    if (known) return known
    postItKeys.current.set(postit.id, postit.id)
    return postit.id
  }

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

  const boardMutation = useMutation({
    mutationFn: (collapsedColors: string[]) =>
      BoardsService.updateBoard({
        body: { collapsed_colors: collapsedColors },
        path: { id: boardId },
      }),
    onError: (error) => {
      void queryClient.invalidateQueries({
        queryKey: getBoardQueryOptions(boardId).queryKey,
      })
      handleError.call(showErrorToast, error)
    },
    onSuccess: (response) => {
      queryClient.setQueryData(
        getBoardQueryOptions(boardId).queryKey,
        response.data,
      )
    },
  })

  // Reconciles folder snapshots with fresh post-its after deletes/recolors:
  // departed members drop out, folders below 2 members ungroup, and ids in
  // keepOut (just recolored cards) never sneak into a legacy snapshot.
  // Never pulls cards in — only the Group button does that.
  const syncFolderSnapshots = (
    freshPostits: BoardPostIt[],
    keepOut: Set<string>,
  ) => {
    const board = queryClient.getQueryData<BoardPublic>(
      getBoardQueryOptions(boardId).queryKey,
    )
    const collapsed = board?.collapsed_colors ?? []
    if (collapsed.length === 0) return
    const byColor = new Map<string, BoardPostIt[]>()
    for (const postit of freshPostits) {
      if (postit.id.startsWith("temporary-")) continue
      const list = byColor.get(postit.color)
      if (list) list.push(postit)
      else byColor.set(postit.color, [postit])
    }
    const snapshots = { ...folderMembers }
    let snapshotsChanged = false
    let nextCollapsed = [...collapsed]
    let collapsedChanged = false
    for (const color of collapsed) {
      const all = (byColor.get(color) ?? []).filter(
        (postit) => !keepOut.has(postit.id),
      )
      const snapshot = snapshots[color]
      const members = snapshot
        ? all.filter((postit) => snapshot.includes(postit.id))
        : all
      if (members.length < 2) {
        delete snapshots[color]
        snapshotsChanged = true
        nextCollapsed = nextCollapsed.filter((item) => item !== color)
        collapsedChanged = true
      } else if (
        snapshot === undefined ||
        snapshot.length !== members.length ||
        snapshot.some((id) => !members.some((postit) => postit.id === id))
      ) {
        snapshots[color] = members.map((postit) => postit.id)
        snapshotsChanged = true
      }
    }
    if (snapshotsChanged) writeFolderMembers(snapshots)
    if (collapsedChanged) {
      queryClient.setQueryData<BoardPublic>(
        getBoardQueryOptions(boardId).queryKey,
        (current) =>
          current ? { ...current, collapsed_colors: nextCollapsed } : current,
      )
      boardMutation.mutate(nextCollapsed)
    }
  }

  const mutation = useMutation({
    mutationFn: (draft: BoardPostIt) =>
      PostitsService.createPostit({
        body: {
          title: draft.title,
          content: draft.content,
          x: draft.x,
          y: draft.y,
          color: draft.color,
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
      setSelectedIds((current) => current.filter((id) => id !== draft.id))
      handleError.call(showErrorToast, error)
    },
    onSuccess: (response, draft) => {
      const savedPostIt = normalizePostIt(response.data)
      // The temporary id is replaced by the saved id: migrate in-flight
      // editing/selection state and keep the stable React key so the Konva
      // node is updated in place instead of remounted.
      postItKeys.current.set(savedPostIt.id, draft.id)
      setEditingId((current) =>
        current === draft.id ? savedPostIt.id : current,
      )
      setSelectedIds((current) =>
        current.map((id) => (id === draft.id ? savedPostIt.id : id)),
      )
      // A newly created post-it never joins a collapsed folder silently and
      // never breaks it open: the folder keeps its snapshot, the new card
      // stays visible next to it. Only the Group button regroups.
      // Legacy safety net: a collapsed color without a snapshot (grouped
      // before snapshots existed) freezes to its pre-existing members so
      // the newcomer still stays out.
      queryClient.setQueryData<BoardPostIt[]>(
        getPostitsQueryKey(boardId),
        (current) =>
          current?.map((postit) =>
            postit.id === draft.id ? savedPostIt : postit,
          ),
      )
      const allPostits =
        queryClient.getQueryData<BoardPostIt[]>(getPostitsQueryKey(boardId)) ??
        []
      setFolderMembers((current) => {
        if (current[savedPostIt.color] !== undefined) return current
        const members = allPostits.filter(
          (postit) =>
            postit.color === savedPostIt.color && postit.id !== savedPostIt.id,
        )
        if (members.length < 2) return current
        const next = {
          ...current,
          [savedPostIt.color]: members.map((postit) => postit.id),
        }
        try {
          localStorage.setItem(folderMembersKey, JSON.stringify(next))
        } catch {
          // Ignore storage failures; the in-memory snapshot still applies.
        }
        return next
      })
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
      postItKeys.current.delete(postitId)
      setSelectedIds((current) => current.filter((id) => id !== postitId))
      // A deleted member drops out of its folder snapshot; a folder left
      // with fewer than 2 members ungroups instead of lingering.
      const fresh =
        queryClient.getQueryData<BoardPostIt[]>(getPostitsQueryKey(boardId)) ??
        []
      syncFolderSnapshots(fresh, new Set())
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

  const collapsedColors = board.collapsed_colors ?? []
  const savedPostits = postits.filter(
    (postit) => !postit.id.startsWith("temporary-"),
  )
  const membersByColor = new Map<string, BoardPostIt[]>()
  for (const postit of savedPostits) {
    const members = membersByColor.get(postit.color)
    if (members) {
      members.push(postit)
    } else {
      membersByColor.set(postit.color, [postit])
    }
  }
  const multiColors = [...membersByColor.entries()]
    .filter(([, members]) => members.length >= 2)
    .map(([color]) => color)
  // Visible folders, in collapsed order. A folder shows its Group-time
  // snapshot, not every post-it of the color: cards created afterwards stay
  // visible until regrouped. No snapshot yet (legacy board): all members.
  const visibleFolders = collapsedColors.flatMap((color) => {
    const all = membersByColor.get(color) ?? []
    const snapshot = folderMembers[color]
    const members = snapshot
      ? all.filter((postit) => snapshot.includes(postit.id))
      : all
    if (members.length < 2) return []
    return [{ color, members, ids: members.map((item) => item.id) }]
  })
  // Dedicated dock: unmoved folders sit in a clean grid at the top with a
  // constant gap, compact in visible order. Positions are assigned once at
  // group time and then never touched — dragging one folder never shifts
  // the others. Full freedom of movement until the next Group press.
  const folders = (() => {
    const perRow = dockPerRow(canvasSize.width)
    let slot = 0
    return visibleFolders.map((folder) => {
      const override = folderPositions[folder.color]
      if (override) return { ...folder, x: override.x, y: override.y }
      const position = dockSlotAt(slot, perRow)
      slot += 1
      return { ...folder, x: position.x, y: position.y }
    })
  })()
  const collapsedIds = new Set(folders.flatMap((folder) => folder.ids))
  const renamingFolder =
    renamingColor !== null
      ? folders.find((folder) => folder.color === renamingColor)
      : undefined
  const visiblePostits = postits.filter(
    (postit) => !collapsedIds.has(postit.id),
  )
  // The Group button is enabled whenever grouping would change something:
  // a new groupable color, or cards that are not yet inside their folder
  // (created/recolored after grouping, or a legacy board without snapshots).
  const needsGrouping = multiColors.some((color) => {
    if (!collapsedColors.includes(color)) return true
    const snapshot = folderMembers[color]
    if (!snapshot) return true
    const ids = (membersByColor.get(color) ?? []).map((postit) => postit.id)
    return (
      snapshot.length !== ids.length || ids.some((id) => !snapshot.includes(id))
    )
  })

  const setCollapsedColors = (
    colors: string[],
    options?: { keepSelection?: boolean },
  ) => {
    queryClient.setQueryData<BoardPublic>(
      getBoardQueryOptions(boardId).queryKey,
      (current) =>
        current ? { ...current, collapsed_colors: colors } : current,
    )
    if (!options?.keepSelection) setSelectedIds([])
    boardMutation.mutate(colors)
  }

  const clearAutoCollapse = (color?: string) => {
    if (color !== undefined) {
      const timer = autoCollapseTimers.current.get(color)
      if (timer !== undefined) {
        clearTimeout(timer)
        autoCollapseTimers.current.delete(color)
      }
      return
    }
    for (const timer of autoCollapseTimers.current.values()) {
      clearTimeout(timer)
    }
    autoCollapseTimers.current.clear()
  }

  const armAutoCollapse = (color: string) => {
    clearAutoCollapse(color)
    const timer = window.setTimeout(() => {
      autoCollapseTimers.current.delete(color)
      const current =
        queryClient.getQueryData<BoardPublic>(
          getBoardQueryOptions(boardId).queryKey,
        )?.collapsed_colors ?? []
      if (!current.includes(color)) {
        // Recollapse snapshots whoever is currently of that color.
        const members =
          queryClient
            .getQueryData<BoardPostIt[]>(getPostitsQueryKey(boardId))
            ?.filter(
              (postit) =>
                postit.color === color && !postit.id.startsWith("temporary-"),
            ) ?? []
        if (members.length >= 2) {
          setFolderMembers((previous) => {
            const next = {
              ...previous,
              [color]: members.map((postit) => postit.id),
            }
            try {
              localStorage.setItem(folderMembersKey, JSON.stringify(next))
            } catch {
              // Ignore storage failures.
            }
            return next
          })
          // The recollapsing folder takes the first free dock slot, like a
          // manual Group press would.
          setFolderPositions((previous) => {
            if (previous[color]) return previous
            const width = canvasRef.current?.clientWidth || 1024
            const found = findFreeDockSlot(
              Object.values(previous),
              dockPerRow(width),
            )
            const next = { ...previous, [color]: found }
            try {
              localStorage.setItem(folderPositionsKey, JSON.stringify(next))
            } catch {
              // Ignore storage failures.
            }
            return next
          })
          setCollapsedColors([...current, color], { keepSelection: true })
        }
      }
    }, FOLDER_AUTO_COLLAPSE_MS)
    autoCollapseTimers.current.set(color, timer)
  }

  const collapseAll = () => {
    clearAutoCollapse()
    if (editingPostIt && !handledIds.current.has(editingPostIt.id)) {
      commitDraft(editingPostIt)
    }
    // Grouping snapshots every grouped color: newcomers merge into their
    // folder. This is the only place folders gain members. Colors without
    // a stored position are placed into the first free dock slot now, so
    // later drags never reshuffle the others.
    const next = [...collapsedColors]
    for (const color of multiColors) {
      if (!next.includes(color)) next.push(color)
    }
    const snapshots: Record<string, string[]> = { ...folderMembers }
    let snapshotsChanged = false
    for (const color of multiColors) {
      const ids = (membersByColor.get(color) ?? []).map((postit) => postit.id)
      const previous = snapshots[color] ?? []
      if (
        previous.length !== ids.length ||
        previous.some((id) => !ids.includes(id))
      ) {
        snapshots[color] = ids
        snapshotsChanged = true
      }
    }
    if (snapshotsChanged) writeFolderMembers(snapshots)
    const perRow = dockPerRow(canvasSize.width)
    const positions = { ...folderPositions }
    const taken = Object.values(positions)
    let positionsChanged = false
    for (const color of next) {
      if (positions[color]) continue
      const found = findFreeDockSlot(taken, perRow)
      positions[color] = found
      taken.push(found)
      positionsChanged = true
    }
    if (positionsChanged) writeFolderPositions(positions)
    const colorsChanged =
      next.length !== collapsedColors.length ||
      next.some((color) => !collapsedColors.includes(color))
    if (!colorsChanged) return
    setCollapsedColors(next)
  }

  const expandAll = () => {
    if (collapsedColors.length === 0) return
    clearAutoCollapse()
    const snapshots = { ...folderMembers }
    for (const color of collapsedColors) delete snapshots[color]
    writeFolderMembers(snapshots)
    setCollapsedColors([])
  }

  const expandFolder = (color: string) => {
    const snapshots = { ...folderMembers }
    delete snapshots[color]
    writeFolderMembers(snapshots)
    setCollapsedColors(collapsedColors.filter((item) => item !== color))
    armAutoCollapse(color)
  }

  const removeDraft = (postitId: string) => {
    queryClient.setQueryData<BoardPostIt[]>(
      getPostitsQueryKey(boardId),
      (current) => current?.filter((postit) => postit.id !== postitId),
    )
  }

  const commitDraft = (draft: BoardPostIt) => {
    // Saving never hides a card in a folder and never breaks one open:
    // folders keep their snapshots, so a saved card simply stays visible
    // until the Group button regroups. Pending auto-collapse timers keep
    // running so nothing unfolds as a side effect of editing.
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

  const selectPostIt = (postit: BoardPostIt) => {
    clearAutoCollapse(postit.color)
    // Single selection only: clicking a post-it selects just that card.
    // Temporary ids migrate to the saved id when the create request
    // succeeds, so a selection made mid-save is kept.
    setSelectedIds([postit.id])
  }

  const recolorSelected = (color: string) => {
    // While a new post-it is being created, the palette paints only the
    // draft: selected saved post-its are left untouched, so choosing the new
    // card's color can never ungroup or recolor anything else. On save the
    // new card stays visible next to its collapsed color until regrouped.
    if (
      editingPostIt?.id.startsWith("temporary-") &&
      editingPostIt.color !== color
    ) {
      const draftId = editingPostIt.id
      queryClient.setQueryData<BoardPostIt[]>(
        getPostitsQueryKey(boardId),
        (current) =>
          current?.map((postit) =>
            postit.id === draftId ? { ...postit, color } : postit,
          ),
      )
      return
    }
    const targets = postits.filter(
      (postit) =>
        selectedIds.includes(postit.id) &&
        !postit.id.startsWith("temporary-") &&
        postit.color !== color,
    )
    // The open editor can recolor the draft being created as well: a
    // temporary draft is only updated in the cache and saved on commit.
    const editingDraft =
      editingPostIt &&
      !selectedIds.includes(editingPostIt.id) &&
      editingPostIt.color !== color
        ? editingPostIt
        : null
    if (targets.length === 0 && !editingDraft) return
    const recoloredIds = new Set([
      ...selectedIds,
      ...(editingDraft ? [editingDraft.id] : []),
    ])
    queryClient.setQueryData<BoardPostIt[]>(
      getPostitsQueryKey(boardId),
      (current) =>
        current?.map((postit) =>
          recoloredIds.has(postit.id) ? { ...postit, color } : postit,
        ),
    )
    for (const target of targets) {
      updateMutation.mutate({ ...target, color })
    }
    if (editingDraft && !editingDraft.id.startsWith("temporary-")) {
      updateMutation.mutate({ ...editingDraft, color })
    }
    for (const target of targets) {
      clearAutoCollapse(target.color)
    }
    // Recolored cards never join or break a folder: they stay visible next
    // to it, departed members drop out of their old snapshot, and only the
    // Group button pulls cards in.
    if (
      targets.length > 0 ||
      (editingDraft && !editingDraft.id.startsWith("temporary-"))
    ) {
      clearAutoCollapse(color)
      const fresh =
        queryClient.getQueryData<BoardPostIt[]>(getPostitsQueryKey(boardId)) ??
        []
      syncFolderSnapshots(fresh, recoloredIds)
    }
  }

  const movePostIt = (
    postit: BoardPostIt,
    position: { x: number; y: number },
  ) => {
    if (postit.id.startsWith("temporary-")) return
    if (postit.id === editingId) return
    clearAutoCollapse(postit.color)
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

  const moveFolder = (color: string, position: { x: number; y: number }) => {
    const clamped = clampPosition(position, canvasSize)
    const previous = folderPositions[color]
    if (previous?.x === clamped.x && previous?.y === clamped.y) return
    writeFolderPositions({ ...folderPositions, [color]: clamped })
  }

  const editPostIt = (postit: BoardPostIt) => {
    handledIds.current.delete(postit.id)
    setEditingId(postit.id)
  }

  const requestFolderRename = (color: string) => {
    if (editingPostIt && !handledIds.current.has(editingPostIt.id)) {
      commitDraft(editingPostIt)
    }
    setRenamingColor(color)
  }

  const commitFolderRename = (color: string, name: string) => {
    setRenamingColor((current) => (current === color ? null : current))
    const trimmed = name.trim().slice(0, 120)
    const next = { ...folderNames }
    if (trimmed) {
      if (next[color] === trimmed) return
      next[color] = trimmed
    } else {
      if (!(color in next)) return
      delete next[color]
    }
    writeFolderNames(next)
  }

  const cancelFolderRename = () => setRenamingColor(null)

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

    // Fallback for a stale Konva hit graph (e.g. a post-it that was just
    // remounted): a double-click inside a saved post-it edits it instead of
    // stacking a new draft on top. Members hidden inside a folder are
    // skipped: editing an invisible post-it looks like a broken creation.
    const hit = [...postits]
      .reverse()
      .find(
        (postit) =>
          !postit.id.startsWith("temporary-") &&
          !collapsedIds.has(postit.id) &&
          pointer.x >= postit.x &&
          pointer.x <= postit.x + POSTIT_WIDTH &&
          pointer.y >= postit.y &&
          pointer.y <= postit.y + POSTIT_HEIGHT,
      )
    if (hit) {
      editPostIt(hit)
      return
    }

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
                disabled={selectedIds.length === 0 && !editingPostIt}
                onMouseDown={(event) => {
                  // Keep the focus (and the open editor) while recoloring.
                  event.preventDefault()
                }}
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
            onClick={collapseAll}
            disabled={!needsGrouping}
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
            onClick={expandAll}
            disabled={collapsedColors.length === 0}
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
              {folders.map((folder, index) => (
                <FolderNode
                  key={`folder-${folder.color}`}
                  x={folder.x}
                  y={folder.y}
                  color={folder.color}
                  count={folder.members.length}
                  label={
                    folder.members[0]?.title || folder.members[0]?.content || ""
                  }
                  name={folderNames[folder.color] ?? ""}
                  enterDelay={Math.min(index * 0.07, 0.35)}
                  draggable={!isDrawing}
                  dragBoundFunc={(position) =>
                    clampPosition(position, canvasSize)
                  }
                  onExpand={() => expandFolder(folder.color)}
                  onDelete={() =>
                    setFolderDeleteCandidate({
                      color: folder.color,
                      ids: folder.ids,
                    })
                  }
                  onRename={() => requestFolderRename(folder.color)}
                  onDragEnd={(color, position) => moveFolder(color, position)}
                />
              ))}
              {visiblePostits.map((postit, index) =>
                postit.id === editingId ? null : (
                  <PostItNode
                    key={getPostItKey(postit)}
                    postit={postit}
                    isEditing={false}
                    isDrawing={isDrawing}
                    isSelected={selectedIds.includes(postit.id)}
                    enterDelay={Math.min(index * 0.03, 0.3)}
                    onEdit={(p) => {
                      editPostIt(p)
                    }}
                    onDelete={(p) => {
                      // A draft that is still being saved has no server id
                      // yet; deleting it would hit the API with a temp id.
                      if (!p.id.startsWith("temporary-")) setDeleteCandidate(p)
                    }}
                    onSelect={(p) => selectPostIt(p)}
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
            <li key={getPostItKey(postit)}>
              {postit.title
                ? `${postit.title}: ${postit.content}`
                : postit.content || "Empty post-it"}
            </li>
          ))}
        </ul>

        <ul className="sr-only" aria-label="Post-it folders on this whiteboard">
          {folders.map((folder) => (
            <li key={`folder-${folder.color}`}>
              {folderNames[folder.color]
                ? `${folderNames[folder.color]}: Map met ${folder.members.length} post-its`
                : `Map met ${folder.members.length} post-its`}
            </li>
          ))}
        </ul>

        {renamingFolder && (
          <FolderNameEditor
            key={`rename-${renamingFolder.color}`}
            initialName={folderNames[renamingFolder.color] ?? ""}
            x={renamingFolder.x}
            y={renamingFolder.y}
            color={renamingFolder.color}
            onCommit={(name) => commitFolderRename(renamingFolder.color, name)}
            onCancel={cancelFolderRename}
          />
        )}

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
        <Dialog
          open={folderDeleteCandidate !== null}
          onOpenChange={(open) => {
            if (!open) setFolderDeleteCandidate(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Map verwijderen</DialogTitle>
              <DialogDescription>
                {`Weet je zeker dat je deze map met ${folderDeleteCandidate?.ids.length ?? 0} post-its wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setFolderDeleteCandidate(null)}
              >
                Annuleren
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (folderDeleteCandidate) {
                    const deletedColor = folderDeleteCandidate.color
                    clearAutoCollapse(deletedColor)
                    for (const id of folderDeleteCandidate.ids) {
                      deleteMutation.mutate(id)
                    }
                    const snapshots = { ...folderMembers }
                    delete snapshots[deletedColor]
                    writeFolderMembers(snapshots)
                    if (deletedColor in folderNames) {
                      const names = { ...folderNames }
                      delete names[deletedColor]
                      writeFolderNames(names)
                    }
                    if (deletedColor in folderPositions) {
                      const positions = { ...folderPositions }
                      delete positions[deletedColor]
                      writeFolderPositions(positions)
                    }
                    setCollapsedColors(
                      collapsedColors.filter((color) => color !== deletedColor),
                    )
                    setFolderDeleteCandidate(null)
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
