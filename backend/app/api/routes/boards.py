import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Board,
    BoardCreate,
    BoardPublic,
    BoardsPublic,
    BoardUpdate,
    Message,
)

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("/", response_model=BoardsPublic)
def read_boards(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve boards.

    Superusers see all boards, regular users only their own.
    """

    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(Board)
        count = session.exec(count_statement).one()
        statement = (
            select(Board)
            .order_by(col(Board.updated_at).desc())
            .offset(skip)
            .limit(limit)
        )
    else:
        count_statement = (
            select(func.count())
            .select_from(Board)
            .where(Board.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(Board)
            .where(Board.owner_id == current_user.id)
            .order_by(col(Board.updated_at).desc())
            .offset(skip)
            .limit(limit)
        )
    boards = session.exec(statement).all()

    boards_public = [BoardPublic.model_validate(board) for board in boards]
    return BoardsPublic(data=boards_public, count=count)


@router.get("/{id}", response_model=BoardPublic)
def read_board(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get board by ID.
    """
    board = session.get(Board, id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if not current_user.is_superuser and (board.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return board


@router.post("/", response_model=BoardPublic)
def create_board(
    *, session: SessionDep, current_user: CurrentUser, board_in: BoardCreate
) -> Any:
    """
    Create new board.
    """
    board = Board.model_validate(board_in, update={"owner_id": current_user.id})
    session.add(board)
    session.commit()
    session.refresh(board)
    return board


@router.patch("/{id}", response_model=BoardPublic)
def update_board(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    board_in: BoardUpdate,
) -> Any:
    """
    Update a board.
    """
    board = session.get(Board, id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if not current_user.is_superuser and (board.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    update_dict = board_in.model_dump(exclude_unset=True)
    board.sqlmodel_update(update_dict)
    board.updated_at = datetime.now(UTC)
    session.add(board)
    session.commit()
    session.refresh(board)
    return board


@router.delete("/{id}")
def delete_board(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete a board.
    """
    board = session.get(Board, id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if not current_user.is_superuser and (board.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(board)
    session.commit()
    return Message(message="Board deleted successfully")
