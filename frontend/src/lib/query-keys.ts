export const queryKeys = {
  boards: {
    all: ["boards"] as const,
    detail: (boardId: string) => ["boards", "detail", boardId] as const,
    postits: (boardId: string) => ["boards", boardId, "postits"] as const,
    strokes: (boardId: string) => ["boards", boardId, "strokes"] as const,
  },
  users: {
    all: ["users"] as const,
    current: ["currentUser"] as const,
  },
} as const
