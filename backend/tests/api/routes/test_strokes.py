import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import Stroke
from tests.utils.board import create_random_board


def create_board(client: TestClient, headers: dict[str, str]) -> str:
    response = client.post(
        f"{settings.API_V1_STR}/boards/",
        headers=headers,
        json={"name": "Drawing board"},
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_create_stroke(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    data = {
        "points": [10, 20, 30, 40, 50, 60],
        "color": "#ff0000",
        "width": 5,
        "tool": "pen",
    }

    response = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes",
        headers=first_user_token_headers,
        json=data,
    )

    assert response.status_code == 200
    content = response.json()
    assert content["board_id"] == board_id
    assert content["points"] == data["points"]
    assert content["color"] == data["color"]
    assert content["width"] == data["width"]
    assert "id" in content


def test_create_stroke_uses_path_board_id(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    other_board_id = str(uuid.uuid4())

    response = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes",
        headers=first_user_token_headers,
        json={
            "points": [0, 0, 10, 10],
            "board_id": other_board_id,
        },
    )

    assert response.status_code == 200
    assert response.json()["board_id"] == board_id


def test_create_stroke_rejects_odd_points(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)

    response = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes",
        headers=first_user_token_headers,
        json={"points": [0, 0, 10]},
    )

    assert response.status_code == 422


def test_create_strokes_bulk(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)

    response = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes/bulk",
        headers=first_user_token_headers,
        json=[
            {"points": [0, 0, 10, 10]},
            {"points": [20, 20, 30, 30], "color": "#00ff00", "width": 8},
        ],
    )

    assert response.status_code == 200
    assert len(response.json()) == 2

    get_response = client.get(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes",
        headers=first_user_token_headers,
    )
    assert get_response.status_code == 200
    assert len(get_response.json()) == 2


def test_read_strokes(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    created = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes",
        headers=first_user_token_headers,
        json={"points": [5, 5, 15, 15]},
    )
    assert created.status_code == 200

    response = client.get(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes",
        headers=first_user_token_headers,
    )

    assert response.status_code == 200
    content = response.json()
    assert len(content) == 1
    assert content[0]["id"] == created.json()["id"]
    assert content[0]["points"] == [5, 5, 15, 15]


def test_read_strokes_board_not_found(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/boards/{uuid.uuid4()}/strokes",
        headers=first_user_token_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Board not found"


def test_create_stroke_board_not_found(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/boards/{uuid.uuid4()}/strokes",
        headers=first_user_token_headers,
        json={"points": [0, 0, 10, 10]},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Board not found"


def test_strokes_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)

    for method in ("get", "post"):
        response = client.request(
            method,
            f"{settings.API_V1_STR}/boards/{board.id}/strokes",
            headers=normal_user_token_headers,
            json={"points": [0, 0, 10, 10]} if method == "post" else None,
        )

        assert response.status_code == 403
        assert response.json()["detail"] == "Not enough permissions"


def test_delete_stroke(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    created = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes",
        headers=first_user_token_headers,
        json={"points": [0, 0, 10, 10]},
    )
    assert created.status_code == 200
    stroke_id = created.json()["id"]

    response = client.delete(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes/{stroke_id}",
        headers=first_user_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Stroke deleted successfully"

    get_response = client.get(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes",
        headers=first_user_token_headers,
    )
    assert get_response.status_code == 200
    assert len(get_response.json()) == 0


def test_delete_stroke_not_found(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)

    response = client.delete(
        f"{settings.API_V1_STR}/boards/{board_id}/strokes/{uuid.uuid4()}",
        headers=first_user_token_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Stroke not found"


def test_delete_stroke_from_other_board_forbidden(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)
    stroke = Stroke(board_id=board.id, points=[0, 0, 10, 10])
    db.add(stroke)
    db.commit()
    db.refresh(stroke)

    response = client.delete(
        f"{settings.API_V1_STR}/boards/{board.id}/strokes/{stroke.id}",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"
