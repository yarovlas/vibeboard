import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import Board, PostIt, PostItCreate, PostItPublic

router = APIRouter(prefix="/boards", tags=["postits"])


def get_owned_board(
    *, session: SessionDep, current_user: CurrentUser, board_id: uuid.UUID
) -> Board:
    board = session.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if board.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return board


@router.get("/{board_id}/postits", response_model=list[PostItPublic])
def read_postits(
    *, session: SessionDep, current_user: CurrentUser, board_id: uuid.UUID
) -> list[PostItPublic]:
    """Retrieve all post-its for a board."""
    get_owned_board(session=session, current_user=current_user, board_id=board_id)
    statement = select(PostIt).where(PostIt.board_id == board_id)
    return [
        PostItPublic.model_validate(postit) for postit in session.exec(statement).all()
    ]


@router.post("/{board_id}/postits", response_model=PostItPublic)
def create_postit(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    board_id: uuid.UUID,
    postit_in: PostItCreate,
) -> PostItPublic:
    """Create a post-it on a board."""
    board = get_owned_board(
        session=session, current_user=current_user, board_id=board_id
    )
    postit = PostIt.model_validate(postit_in, update={"board_id": board_id})
    board.updated_at = datetime.now(UTC)
    session.add(postit)
    session.commit()
    session.refresh(postit)
    return PostItPublic.model_validate(postit)
