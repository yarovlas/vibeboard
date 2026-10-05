import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import Board, Message, PostIt, PostItCreate, PostItPublic, PostItUpdate

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


@router.patch("/{board_id}/postits/{id}", response_model=PostItPublic)
def update_postit(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    board_id: uuid.UUID,
    id: uuid.UUID,
    postit_in: PostItUpdate,
) -> PostItPublic:
    """Update a post-it on a board."""
    get_owned_board(session=session, current_user=current_user, board_id=board_id)
    postit = session.get(PostIt, id)
    if not postit:
        raise HTTPException(status_code=404, detail="Post-it not found")
    if postit.board_id != board_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    update_dict = postit_in.model_dump(exclude_unset=True)
    postit.sqlmodel_update(update_dict)
    board = session.get(Board, board_id)
    if board:
        board.updated_at = datetime.now(UTC)
    session.add(postit)
    session.commit()
    session.refresh(postit)
    return PostItPublic.model_validate(postit)


@router.delete("/{board_id}/postits/{id}")
def delete_postit(
    session: SessionDep,
    current_user: CurrentUser,
    board_id: uuid.UUID,
    id: uuid.UUID,
) -> Message:
    """Delete a post-it from a board."""
    get_owned_board(session=session, current_user=current_user, board_id=board_id)
    postit = session.get(PostIt, id)
    if not postit:
        raise HTTPException(status_code=404, detail="Post-it not found")
    if postit.board_id != board_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(postit)
    session.commit()
    return Message(message="Post-it deleted successfully")
