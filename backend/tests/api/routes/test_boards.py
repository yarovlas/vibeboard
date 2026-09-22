import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.board import create_random_board


def test_create_board(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"name": "Sprint 1 whiteboard"}
    response = client.post(
        f"{settings.API_V1_STR}/boards/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert "id" in content
    assert "owner_id" in content
    assert "created_at" in content
    assert "updated_at" in content


def test_read_board(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)
    response = client.get(
        f"{settings.API_V1_STR}/boards/{board.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == board.name
    assert content["id"] == str(board.id)
    assert content["owner_id"] == str(board.owner_id)


def test_read_board_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/boards/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Board not found"


def test_read_board_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)
    response = client.get(
        f"{settings.API_V1_STR}/boards/{board.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_read_boards(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_board(db)
    create_random_board(db)
    response = client.get(
        f"{settings.API_V1_STR}/boards/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert len(content["data"]) >= 2


def test_read_boards_only_own_boards_for_regular_user(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    # A board owned by somebody else
    create_random_board(db)

    # Create a board owned by the normal user via the API
    create_response = client.post(
        f"{settings.API_V1_STR}/boards/",
        headers=normal_user_token_headers,
        json={"name": "Own board"},
    )
    assert create_response.status_code == 200
    own_board_id = create_response.json()["id"]

    me = client.get(
        f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers
    )
    assert me.status_code == 200
    normal_user_id = me.json()["id"]

    response = client.get(
        f"{settings.API_V1_STR}/boards/",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 1
    assert any(board["id"] == own_board_id for board in content["data"])
    assert all(board["owner_id"] == normal_user_id for board in content["data"])


def test_update_board(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)
    data = {"name": "Updated board name"}
    response = client.patch(
        f"{settings.API_V1_STR}/boards/{board.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert content["id"] == str(board.id)
    assert content["owner_id"] == str(board.owner_id)


def test_update_board_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"name": "Updated board name"}
    response = client.patch(
        f"{settings.API_V1_STR}/boards/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Board not found"


def test_update_board_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)
    data = {"name": "Updated board name"}
    response = client.patch(
        f"{settings.API_V1_STR}/boards/{board.id}",
        headers=normal_user_token_headers,
        json=data,
    )
    assert response.status_code == 403
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_delete_board(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)
    response = client.delete(
        f"{settings.API_V1_STR}/boards/{board.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["message"] == "Board deleted successfully"


def test_delete_board_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.delete(
        f"{settings.API_V1_STR}/boards/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Board not found"


def test_delete_board_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)
    response = client.delete(
        f"{settings.API_V1_STR}/boards/{board.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 403
    content = response.json()
    assert content["detail"] == "Not enough permissions"
