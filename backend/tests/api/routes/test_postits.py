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


def test_update_postit(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    created = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
        json={"title": "Old title", "content": "Old content", "x": 10, "y": 20},
    )
    assert created.status_code == 200
    postit_id = created.json()["id"]

    response = client.patch(
        f"{settings.API_V1_STR}/boards/{board_id}/postits/{postit_id}",
        headers=first_user_token_headers,
        json={"title": "New title", "content": "New content"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "New title"
    assert body["content"] == "New content"
    assert body["x"] == 10
    assert body["y"] == 20


def test_update_postit_position(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    created = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
        json={"content": "Movable note", "x": 10, "y": 20},
    )
    assert created.status_code == 200
    postit_id = created.json()["id"]

    response = client.patch(
        f"{settings.API_V1_STR}/boards/{board_id}/postits/{postit_id}",
        headers=first_user_token_headers,
        json={"x": 300, "y": 250},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["x"] == 300
    assert body["y"] == 250
    assert body["content"] == "Movable note"


def test_update_postit_not_found(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)

    response = client.patch(
        f"{settings.API_V1_STR}/boards/{board_id}/postits/{uuid.uuid4()}",
        headers=first_user_token_headers,
        json={"title": "New title"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Post-it not found"


def test_update_postit_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)
    from app.models import PostIt

    postit = PostIt(board_id=board.id, title="Private", content="Secret", x=0, y=0)
    db.add(postit)
    db.commit()
    db.refresh(postit)

    response = client.patch(
        f"{settings.API_V1_STR}/boards/{board.id}/postits/{postit.id}",
        headers=normal_user_token_headers,
        json={"title": "Hacked"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"


def test_delete_postit(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    created = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
        json={"content": "To be deleted", "x": 30, "y": 40},
    )
    assert created.status_code == 200
    postit_id = created.json()["id"]

    response = client.delete(
        f"{settings.API_V1_STR}/boards/{board_id}/postits/{postit_id}",
        headers=first_user_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Post-it deleted successfully"

    # Verify it's gone
    get_response = client.get(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
    )
    assert get_response.status_code == 200
    assert len(get_response.json()) == 0


def test_delete_postit_not_found(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)

    response = client.delete(
        f"{settings.API_V1_STR}/boards/{board_id}/postits/{uuid.uuid4()}",
        headers=first_user_token_headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Post-it not found"


def test_delete_postit_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)
    from app.models import PostIt

    postit = PostIt(board_id=board.id, title="Private", content="Secret", x=0, y=0)
    db.add(postit)
    db.commit()
    db.refresh(postit)

    response = client.delete(
        f"{settings.API_V1_STR}/boards/{board.id}/postits/{postit.id}",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"


def test_create_postit_default_color(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    response = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
        json={"content": "Default styled note"},
    )

    assert response.status_code == 200
    assert response.json()["color"] == "#FEF3C7"


def test_create_postit_with_color(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    response = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
        json={"content": "Blue note", "color": "#BFDBFE"},
    )

    assert response.status_code == 200
    assert response.json()["color"] == "#BFDBFE"


def test_update_postit_color(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    created = client.post(
        f"{settings.API_V1_STR}/boards/{board_id}/postits",
        headers=first_user_token_headers,
        json={"content": "Recolor me"},
    )
    assert created.status_code == 200
    postit_id = created.json()["id"]

    response = client.patch(
        f"{settings.API_V1_STR}/boards/{board_id}/postits/{postit_id}",
        headers=first_user_token_headers,
        json={"color": "#FBCFE8"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["color"] == "#FBCFE8"
    assert body["content"] == "Recolor me"


def test_bulk_update_postit_positions(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)
    ids: list[str] = []
    for index in range(2):
        created = client.post(
            f"{settings.API_V1_STR}/boards/{board_id}/postits",
            headers=first_user_token_headers,
            json={"content": f"Folder member {index}", "x": 10 + index * 250, "y": 20},
        )
        assert created.status_code == 200
        ids.append(created.json()["id"])

    response = client.patch(
        f"{settings.API_V1_STR}/boards/{board_id}/postits/bulk",
        headers=first_user_token_headers,
        json=[
            {"id": ids[0], "x": 160, "y": 120},
            {"id": ids[1], "x": 410, "y": 120},
        ],
    )
    assert response.status_code == 200
    positions = {item["id"]: (item["x"], item["y"]) for item in response.json()}
    assert positions[ids[0]] == (160, 120)
    assert positions[ids[1]] == (410, 120)


def test_bulk_update_not_found(
    client: TestClient, first_user_token_headers: dict[str, str]
) -> None:
    board_id = create_board(client, first_user_token_headers)

    response = client.patch(
        f"{settings.API_V1_STR}/boards/{board_id}/postits/bulk",
        headers=first_user_token_headers,
        json=[{"id": str(uuid.uuid4()), "x": 10, "y": 10}],
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Post-it not found"


def test_bulk_update_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    board = create_random_board(db)
    from app.models import PostIt

    postit = PostIt(board_id=board.id, title="Private", content="Secret", x=0, y=0)
    db.add(postit)
    db.commit()
    db.refresh(postit)

    response = client.patch(
        f"{settings.API_V1_STR}/boards/{board.id}/postits/bulk",
        headers=normal_user_token_headers,
        json=[{"id": str(postit.id), "x": 99, "y": 99}],
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Not enough permissions"
