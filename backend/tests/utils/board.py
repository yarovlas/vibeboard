from sqlmodel import Session

from app.models import Board
from tests.utils.user import create_random_user
from tests.utils.utils import random_lower_string


def create_random_board(db: Session) -> Board:
    user = create_random_user(db)
    owner_id = user.id
    assert owner_id is not None
    board = Board.model_validate(
        {"name": random_lower_string()}, update={"owner_id": owner_id}
    )
    db.add(board)
    db.commit()
    db.refresh(board)
    return board
