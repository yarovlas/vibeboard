import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { LayoutGrid, Plus } from "lucide-react"
import { type FormEvent, Suspense, useState } from "react"

import { type BoardCreate, BoardsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

function getBoardsQueryOptions() {
  return {
    queryFn: async () =>
      (await BoardsService.readBoards({ query: { skip: 0, limit: 100 } })).data,
    queryKey: ["boards"],
  }
}

function CreateBoardButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (data: BoardCreate) =>
      BoardsService.createBoard({ body: data }),
    onSuccess: (response) => {
      showSuccessToast("Whiteboard created successfully")
      setIsOpen(false)
      setName("")
      navigate({
        to: "/boards/$boardId",
        params: { boardId: response.data.id },
      })
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] })
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    mutation.mutate({ name: trimmedName })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2" />
          New whiteboard
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>New whiteboard</DialogTitle>
            <DialogDescription>
              Give your whiteboard a name to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="board-name">Name</Label>
            <Input
              id="board-name"
              placeholder="e.g. Sprint 1 ideas"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? "Creating..." : "Create whiteboard"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BoardsListContent() {
  const { data: boards } = useSuspenseQuery(getBoardsQueryOptions())

  if (boards.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <LayoutGrid className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          You don't have any whiteboards yet
        </h3>
        <p className="text-muted-foreground">
          Create a new whiteboard to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {boards.data.map((board) => (
        <Link
          key={board.id}
          to="/boards/$boardId"
          params={{ boardId: board.id }}
          className="group flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
        >
          <span className="font-semibold leading-snug group-hover:text-primary">
            {board.name}
          </span>
          <span className="text-xs text-muted-foreground">
            Created{" "}
            {board.created_at
              ? new Date(board.created_at).toLocaleDateString()
              : ""}
          </span>
        </Link>
      ))}
    </div>
  )
}

function BoardsList() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      }
    >
      <BoardsListContent />
    </Suspense>
  )
}

export function BoardsOverview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Create and manage your whiteboards
          </p>
        </div>
        <CreateBoardButton />
      </div>
      <BoardsList />
    </div>
  )
}
