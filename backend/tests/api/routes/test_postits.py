import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.board import create_random_board


def create_board(client: TestClient, headers: dict[str, str]) -> str:
    response = client.post(
        f"{settings.API_V1_STR}/boards/",
        headers=headers,
        json={"name": "Post-it board"},
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_create_postit(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    data = {
        "title": "Idea",
        "content": "Remember this thought",
        "x": 120,
        "y": 240,
    }

    response = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
        json=data,
    )

    assert response.status_code == 200
    content = response.json()
    assert content["board_id"] == board_id
    assert content["title"] == data["title"]
    assert content["content"] == data["content"]
    assert content["x"] == data["x"]
    assert content["y"] == data["y"]
    assert "id" in content


def test_create_postit_uses_path_board_id(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    other_board_id = str(uuid.uuid4())

    response = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
        json={
            "title": "",
            "content": "A note",
            "x": 0,
            "y": 0,
            "board_id": other_board_id,
        },
    )

    assert response.status_code == 200
    assert response.json()["board_id"] == board_id


def test_read_postits(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    created = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
        json={"content": "A persisted note", "x": 40, "y": 80},
    )
    assert created.status_code == 200

    response = client.get(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
    )

    assert response.status_code == 200
    content = response.json()
    assert len(content) == 1
    assert content[0]["id"] == created.json()["id"]
    assert content[0]["content"] == "A persisted note"


def test_create_postit_board_not_found(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/boards/{uuid.uuid4()}/postits",
        headers=first_user_token_headers,
        json={"content": "A note"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Board not found"


def test_read_postits_board_not_found(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/boards/{uuid.uuid4()}/postits",
        headers=first_user_token_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Board not found"


def test_create_postit_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)

    response = client.post(
        f"{settings.API_V1_STR}/boards/{board.id}/postits",
        headers=normal_user_token_headers,
        json={"content": "A private note"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"


def test_read_postits_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)

    response = client.get(
        f"{settings.API_V1_STR}/boards/{board.id}/postits",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"
