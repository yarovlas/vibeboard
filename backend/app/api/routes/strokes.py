import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.api.routes.postits import get_owned_board
from app.models import Message, Stroke, StrokeCreate, StrokePublic

router = APIRouter(prefix="/boards", tags=["strokes"])


def validate_points(points: list[float]) -> None:
    if len(points) < 4 or len(points) % 2 != 0:
        raise HTTPException(
            status_code=422,
            detail="Points must contain at least two x,y-coordinate pairs",
        )


@router.get("/{board_id}/strokes", response_model=list[StrokePublic])
def read_strokes(
    *, session: SessionDep, current_user: CurrentUser, board_id: uuid.UUID
) -> list[StrokePublic]:
    """Retrieve all strokes for a board."""
    get_owned_board(session=session, current_user=current_user, board_id=board_id)
    statement = (
        select(Stroke)
        .where(Stroke.board_id == board_id)
        .order_by(Stroke.created_at, Stroke.id)
    )
    return [
        StrokePublic.model_validate(stroke) for stroke in session.exec(statement).all()
    ]


@router.post("/{board_id}/strokes", response_model=StrokePublic)
def create_stroke(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    board_id: uuid.UUID,
    stroke_in: StrokeCreate,
) -> StrokePublic:
    """Create a stroke on a board."""
    board = get_owned_board(
        session=session, current_user=current_user, board_id=board_id
    )
    validate_points(stroke_in.points)
    stroke = Stroke.model_validate(stroke_in, update={"board_id": board_id})
    board.updated_at = datetime.now(UTC)
    session.add(stroke)
    session.commit()
    session.refresh(stroke)
    return StrokePublic.model_validate(stroke)


@router.post("/{board_id}/strokes/bulk", response_model=list[StrokePublic])
def create_strokes_bulk(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    board_id: uuid.UUID,
    strokes_in: list[StrokeCreate],
) -> list[StrokePublic]:
    """Create multiple strokes on a board in one request."""
    board = get_owned_board(
        session=session, current_user=current_user, board_id=board_id
    )
    strokes: list[Stroke] = []
    for stroke_in in strokes_in:
        validate_points(stroke_in.points)
        strokes.append(Stroke.model_validate(stroke_in, update={"board_id": board_id}))
    board.updated_at = datetime.now(UTC)
    session.add_all(strokes)
    session.commit()
    for stroke in strokes:
        session.refresh(stroke)
    return [StrokePublic.model_validate(stroke) for stroke in strokes]


@router.delete("/{board_id}/strokes/{id}")
def delete_stroke(
    session: SessionDep,
    current_user: CurrentUser,
    board_id: uuid.UUID,
    id: uuid.UUID,
) -> Message:
    """Delete a stroke from a board."""
    get_owned_board(session=session, current_user=current_user, board_id=board_id)
    stroke = session.get(Stroke, id)
    if not stroke:
        raise HTTPException(status_code=404, detail="Stroke not found")
    if stroke.board_id != board_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(stroke)
    session.commit()
    return Message(message="Stroke deleted successfully")
