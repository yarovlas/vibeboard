from fastapi.testclient import TestClient


def test_cors_allows_local_development_origins(client: TestClient) -> None:
    for origin in (
        "http://localhost:5173",
        "http://localhost",
        "http://127.0.0.1:5173",
    ):
        response = client.options(
            "/api/v1/users/me",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin
