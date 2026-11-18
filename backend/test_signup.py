import base64
import hashlib
import io
import sqlite3
from urllib.parse import parse_qs, urlsplit

from fastapi.testclient import TestClient
import pytest
from PIL import Image

import main


@pytest.fixture(autouse=True)
def local_database(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SECRET_KEY", raising=False)


def test_database_defaults_to_local_sqlite(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert main.uses_postgres() is False


def test_database_url_selects_postgres(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/test")
    assert main.uses_postgres() is True


def test_profile_data_api_authenticates_and_uses_session_hash(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret")
    calls = []

    class Result:
        def raise_for_status(self):
            pass

        def json(self):
            return {"id": 1, "name": "Test", "email": "test@example.com"}

    def post(url, *, headers, json, timeout):
        calls.append((url, headers, json))
        return Result()

    monkeypatch.setattr(main.httpx, "post", post)
    assert main.profile_from_data_api("hashed-token")["id"] == 1
    assert calls[0][0] == "https://example.supabase.co/rest/v1/rpc/current_user_profile"
    assert calls[0][1]["apikey"] == "test-secret"
    assert calls[0][1]["Content-Profile"] == "app_api"
    assert calls[0][2] == {"p_token_hash": "hashed-token"}


def test_profile_data_api_reports_connection_error(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret")

    def fail(*args, **kwargs):
        raise main.httpx.ConnectError("connection failed")

    monkeypatch.setattr(main.httpx, "post", fail)
    with pytest.raises(main.HTTPException) as error:
        main.profile_from_data_api("hashed-token")
    assert error.value.status_code == 503


def test_profile_data_api_accepts_data_api_url(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co/rest/v1/")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret")
    urls = []

    class Result:
        def raise_for_status(self):
            pass

        def json(self):
            return None

    def post(url, **kwargs):
        urls.append(url)
        return Result()

    monkeypatch.setattr(main.httpx, "post", post)
    assert main.profile_from_data_api("hash") is None
    assert urls == ["https://example.supabase.co/rest/v1/rpc/current_user_profile"]


def test_signup_and_duplicate(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    with TestClient(main.app) as client:
        data = {"name": "홍길동", "email": "test@example.com", "password": "password123"}
        response = client.post("/api/signup", json=data)
        assert response.status_code == 201
        assert response.json()["email"] == data["email"]
        assert "password" not in response.json()
        assert client.post("/api/signup", json={**data, "email": "TEST@example.com"}).status_code == 409
        assert client.post("/api/signup", json={**data, "email": "bad"}).status_code == 422
        assert client.post("/api/signup", json={**data, "password": "short"}).status_code == 422
    with sqlite3.connect(main.DB_PATH) as db:
        stored = db.execute("SELECT password_hash FROM users").fetchone()[0]
        assert stored != data["password"]
        assert main.password_hasher.verify(data["password"], stored)


def test_login_session_and_logout(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    with TestClient(main.app) as client:
        data = {"name": "홍길동", "email": "test@example.com", "password": "password123"}
        assert client.post("/api/signup", json=data).status_code == 201
        assert client.post("/api/login", json={"email": data["email"], "password": "wrong-password"}).status_code == 401
        response = client.post("/api/login", json={"email": data["email"], "password": data["password"]})
        assert response.status_code == 200
        assert response.json()["name"] == data["name"]
        profile = client.get("/api/me")
        assert profile.status_code == 200
        assert profile.json() == {"id": response.json()["id"], "name": data["name"], "email": data["email"]}
        assert client.post("/api/logout").status_code == 204
        assert client.get("/api/me").status_code == 401


def test_update_own_profile(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    with TestClient(main.app) as client, TestClient(main.app) as other:
        assert client.patch("/api/me", json={"name": "New Name"}).status_code == 401
        first = {"name": "First", "email": "first@example.com", "password": "password123"}
        second = {"name": "Second", "email": "second@example.com", "password": "password123"}
        assert client.post("/api/signup", json=first).status_code == 201
        assert other.post("/api/signup", json=second).status_code == 201
        assert client.post("/api/login", json={"email": first["email"], "password": first["password"]}).status_code == 200
        assert other.post("/api/login", json={"email": second["email"], "password": second["password"]}).status_code == 200
        assert client.patch("/api/me", json={"name": "   "}).status_code == 422
        assert client.patch("/api/me", json={"name": "a" * 51}).status_code == 422
        response = client.patch("/api/me", json={"name": "  Updated  "})
        assert response.status_code == 200
        assert response.json()["name"] == "Updated"
        assert client.get("/api/me").json()["name"] == "Updated"
        assert other.get("/api/me").json()["name"] == "Second"


def test_community_posts_replies_likes_and_permissions(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    with TestClient(main.app) as alice, TestClient(main.app) as bob:
        assert alice.get("/api/posts").status_code == 401
        for client, name in ((alice, "Alice"), (bob, "Bob")):
            email = name.lower() + "@example.com"
            assert client.post("/api/signup", json={"name": name, "email": email, "password": "password123"}).status_code == 201
            assert client.post("/api/login", json={"email": email, "password": "password123"}).status_code == 200
        assert alice.post("/api/posts", json={"content": "   "}).status_code == 422
        post = alice.post("/api/posts", json={"content": "Hello community"})
        assert post.status_code == 201
        post_id = post.json()["id"]
        reply = bob.post("/api/posts", json={"content": "Hello back", "parent_id": post_id})
        assert reply.status_code == 201
        assert bob.post(f"/api/posts/{post_id}/like").json()["liked"] is True
        feed = bob.get("/api/posts").json()
        assert len(feed) == 1 and feed[0]["reply_count"] == 1
        assert feed[0]["like_count"] == 1 and feed[0]["liked"] is True
        assert alice.get(f"/api/posts/{post_id}/replies").json()[0]["content"] == "Hello back"
        assert bob.delete(f"/api/posts/{post_id}").status_code == 403
        assert bob.post(f"/api/posts/{post_id}/like").json()["liked"] is False
        assert alice.delete(f"/api/posts/{post_id}").status_code == 204
        assert alice.get("/api/posts").json() == []
        assert bob.get(f"/api/posts/{post_id}/replies").status_code == 404


def test_post_image_attachment(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    image = io.BytesIO()
    Image.new("RGB", (2, 2), "red").save(image, format="PNG")
    payload = image.getvalue()
    with TestClient(main.app) as client, TestClient(main.app) as anonymous:
        assert anonymous.post('/api/posts/with-image', files={'image': ('a.png', payload, 'image/png')}).status_code == 401
        assert client.post('/api/signup', json={'name':'Alice','email':'image@example.com','password':'password123'}).status_code == 201
        assert client.post('/api/login', json={'email':'image@example.com','password':'password123'}).status_code == 200
        assert client.post('/api/posts/with-image', files={'image': ('a.png', b'not an image', 'image/png')}).status_code == 422
        assert client.post('/api/posts/with-image', files={'image': ('big.png', b'x' * (2 * 1024 * 1024 + 1), 'image/png')}).status_code == 413
        response = client.post('/api/posts/with-image', data={'content':'hello'}, files={'image': ('a.png', payload, 'image/png')})
        assert response.status_code == 201
        post_id = response.json()['id']
        assert client.get('/api/posts').json()[0]['has_image'] is True
        assert anonymous.get(f'/api/posts/{post_id}/image').status_code == 401
        image_response = client.get(f'/api/posts/{post_id}/image')
        assert image_response.status_code == 200
        assert image_response.headers['content-type'] == 'image/png'
        assert image_response.content == payload
        assert client.delete(f'/api/posts/{post_id}').status_code == 204
        assert client.get(f'/api/posts/{post_id}/image').status_code == 404
        assert client.post('/api/posts/with-image', files={'image': ('a.png', payload, 'image/png')}).status_code == 201


def test_image_upload_daily_limit_and_rollover(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    image = io.BytesIO()
    Image.new("RGB", (2, 2), "red").save(image, format="PNG")
    payload = image.getvalue()
    with TestClient(main.app) as alice, TestClient(main.app) as bob:
        for client, name in ((alice, 'alice'), (bob, 'bob')):
            email = name + '@example.com'
            assert client.post('/api/signup', json={'name':name,'email':email,'password':'password123'}).status_code == 201
            assert client.post('/api/login', json={'email':email,'password':'password123'}).status_code == 200
        for _ in range(5):
            result = alice.post('/api/posts/with-image', files={'image': ('a.png', payload, 'image/png')})
            assert result.status_code == 201
        assert alice.delete('/api/posts/' + str(result.json()['id'])).status_code == 204
        limited = alice.post('/api/posts/with-image', files={'image': ('a.png', payload, 'image/png')})
        assert limited.status_code == 429
        assert alice.post('/api/posts', json={'content':'text still works'}).status_code == 201
        assert bob.post('/api/posts/with-image', files={'image': ('a.png', payload, 'image/png')}).status_code == 201
        monkeypatch.setattr(main, 'image_upload_day', lambda: '2099-01-01')
        assert alice.post('/api/posts/with-image', files={'image': ('a.png', payload, 'image/png')}).status_code == 201


def test_existing_posts_migrate_without_data_loss(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    with sqlite3.connect(main.DB_PATH) as db:
        db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL)")
        db.execute("CREATE TABLE posts (id INTEGER PRIMARY KEY, author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, parent_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, content TEXT NOT NULL, created_at TEXT NOT NULL)")
        db.execute("INSERT INTO users VALUES (1, 'Author', 'a@example.com', 'hash')")
        db.execute("INSERT INTO posts VALUES (1, 1, NULL, 'Existing post', '2026-01-01')")
    main.init_database()
    main.init_database()
    with sqlite3.connect(main.DB_PATH) as db:
        assert db.execute("SELECT content, image_data, image_type FROM posts WHERE id=1").fetchone() == ('Existing post', None, None)


def test_existing_image_uploads_count_after_migration(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    main.init_database()
    with sqlite3.connect(main.DB_PATH) as db:
        db.execute("INSERT INTO users VALUES (1, 'Author', 'a@example.com', 'hash')")
        db.execute("INSERT INTO posts (author_id, content, created_at, image_data, image_type) VALUES (1, '', ?, ?, 'image/png')", (main.datetime.now(main.timezone.utc).isoformat(), b'image'))
    main.init_database()
    with sqlite3.connect(main.DB_PATH) as db:
        assert db.execute("SELECT upload_count FROM image_uploads WHERE user_id=1").fetchone()[0] == 1
        db.execute("DELETE FROM posts")
    main.init_database()
    with sqlite3.connect(main.DB_PATH) as db:
        assert db.execute("SELECT upload_count FROM image_uploads WHERE user_id=1").fetchone()[0] == 1


def test_delete_account_revokes_all_sessions(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    with TestClient(main.app) as client, TestClient(main.app) as other:
        data = {"name": "홍길동", "email": "test@example.com", "password": "password123"}
        assert client.delete("/api/me").status_code == 401
        assert client.post("/api/signup", json=data).status_code == 201
        credentials = {"email": data["email"], "password": data["password"]}
        assert client.post("/api/login", json=credentials).status_code == 200
        assert other.post("/api/login", json=credentials).status_code == 200
        assert client.delete("/api/me").status_code == 204
        assert client.get("/api/me").status_code == 401
        assert other.get("/api/me").status_code == 401
        assert client.post("/api/login", json=credentials).status_code == 401
        assert client.post("/api/signup", json=data).status_code == 201


def test_kakao_login_and_state_validation(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setenv("KAKAO_CLIENT_ID", "test-client")
    monkeypatch.setenv("KAKAO_CLIENT_SECRET", "test-secret")

    class KakaoResponse:
        def __init__(self, data):
            self.data = data

        def raise_for_status(self):
            pass

        def json(self):
            return self.data

    def post(url, **kwargs):
        if url.endswith("/oauth/token"):
            return KakaoResponse({"access_token": "test-token"})
        assert url.endswith("/v2/user/me")
        return KakaoResponse({"id": 123456, "kakao_account": {"profile": {"nickname": "Kakao User"}}})

    monkeypatch.setattr(main.httpx, "post", post)
    with TestClient(main.app, follow_redirects=False) as client:
        start = client.get("/api/auth/kakao")
        assert start.status_code == 302
        assert "kauth.kakao.com/oauth/authorize" in start.headers["location"]
        state = client.cookies.get("kakao_oauth_state")
        assert state
        assert client.get("/api/auth/kakao/callback", params={"code": "code", "state": "wrong"}).status_code == 400
        result = client.get("/api/auth/kakao/callback", params={"code": "code", "state": state})
        assert result.status_code == 302
        profile = client.get("/api/me")
        assert profile.status_code == 200
        assert profile.json()["name"] == "Kakao User"
        assert profile.json()["email"] is None
        original_id = profile.json()["id"]
        assert client.post("/api/logout").status_code == 204
        assert client.get("/api/auth/kakao").status_code == 302
        state = client.cookies.get("kakao_oauth_state")
        assert client.get("/api/auth/kakao/callback", params={"code": "code", "state": state}).status_code == 302
        assert client.get("/api/me").json()["id"] == original_id
        assert client.delete("/api/me").status_code == 204
        with sqlite3.connect(main.DB_PATH) as db:
            assert db.execute("SELECT count(*) FROM kakao_accounts").fetchone()[0] == 0


def test_google_login_and_state_validation(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-secret")

    class GoogleResponse:
        def __init__(self, data):
            self.data = data

        def raise_for_status(self):
            pass

        def json(self):
            return self.data

    def post(url, **kwargs):
        assert url == "https://oauth2.googleapis.com/token"
        assert kwargs["data"]["code_verifier"]
        return GoogleResponse({"access_token": "test-token"})

    def get(url, **kwargs):
        assert url == "https://openidconnect.googleapis.com/v1/userinfo"
        assert kwargs["headers"]["Authorization"] == "Bearer test-token"
        return GoogleResponse({"sub": "google-123", "name": "Google User"})

    monkeypatch.setattr(main.httpx, "post", post)
    monkeypatch.setattr(main.httpx, "get", get)
    with TestClient(main.app, follow_redirects=False) as client:
        start = client.get("/api/auth/google")
        assert start.status_code == 302
        assert "accounts.google.com/o/oauth2/v2/auth" in start.headers["location"]
        query = parse_qs(urlsplit(start.headers["location"]).query)
        verifier = client.cookies.get("google_oauth_verifier")
        expected = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        assert query["code_challenge"] == [expected]
        assert query["code_challenge_method"] == ["S256"]
        state = client.cookies.get("google_oauth_state")
        assert state
        assert client.get("/api/auth/google/callback", params={"code": "code", "state": "wrong"}).status_code == 400
        assert client.get("/api/auth/google/callback", params={"code": "code", "state": state}).status_code == 302
        profile = client.get("/api/me")
        assert profile.status_code == 200
        assert profile.json()["name"] == "Google User"
        assert profile.json()["email"] is None
        original_id = profile.json()["id"]
        assert client.post("/api/logout").status_code == 204
        assert client.get("/api/auth/google").status_code == 302
        state = client.cookies.get("google_oauth_state")
        assert client.get("/api/auth/google/callback", params={"code": "code", "state": state}).status_code == 302
        assert client.get("/api/me").json()["id"] == original_id
        assert client.delete("/api/me").status_code == 204
        with sqlite3.connect(main.DB_PATH) as db:
            assert db.execute("SELECT count(*) FROM google_accounts").fetchone()[0] == 0
