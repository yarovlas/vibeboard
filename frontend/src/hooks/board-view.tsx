import { createContext, type ReactNode, useContext, useState } from "react"

export type BoardView = "whiteboard" | "table"

interface BoardViewContextValue {
  view: BoardView
  setView: (view: BoardView) => void
}

const BoardViewContext = createContext<BoardViewContextValue | null>(null)

export function BoardViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<BoardView>("whiteboard")
  return (
    <BoardViewContext.Provider value={{ view, setView }}>
      {children}
    </BoardViewContext.Provider>
  )
}

export function useBoardView() {
  const context = useContext(BoardViewContext)
  if (!context) {
    throw new Error("useBoardView must be used within a BoardViewProvider")
  }
  return context
}
