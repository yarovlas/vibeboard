import { BoardsService, PostitsService, StrokesService } from "@/client"
import { normalizePostIt } from "@/components/Boards/PostItNode"
import { normalizeStroke } from "@/components/Boards/StrokeLine"
import { queryKeys } from "@/lib/query-keys"

export function getBoardQueryOptions(boardId: string) {
  return {
    queryFn: async () =>
      (await BoardsService.readBoard({ path: { id: boardId } })).data,
    queryKey: queryKeys.boards.detail(boardId),
  }
}

export function getBoardsQueryOptions() {
  return {
    queryFn: async () =>
      (await BoardsService.readBoards({ query: { skip: 0, limit: 100 } })).data,
    queryKey: queryKeys.boards.all,
  }
}

export function getPostitsQueryOptions(boardId: string) {
  return {
    queryFn: async () => {
      const response = await PostitsService.readPostits({
        path: { board_id: boardId },
      })
      return response.data.map(normalizePostIt)
    },
    queryKey: queryKeys.boards.postits(boardId),
  }
}

export function getStrokesQueryOptions(boardId: string) {
  return {
    queryFn: async () => {
      const response = await StrokesService.readStrokes({
        path: { board_id: boardId },
      })
      return response.data.map(normalizeStroke)
    },
    queryKey: queryKeys.boards.strokes(boardId),
  }
}
