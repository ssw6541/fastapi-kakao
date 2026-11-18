"""Copy the existing SQLite accounts and sessions into PostgreSQL atomically."""
from datetime import datetime
import sqlite3

import main


def migrate():
    if not main.uses_postgres():
        raise RuntimeError("Set DATABASE_URL before running the migration.")
    if not main.DB_PATH.is_file():
        raise RuntimeError("The existing users.db was not found.")

    # A read transaction gives a consistent snapshot. Stop the old app first so
    # no new SQLite writes occur after that snapshot and before cutover.
    with sqlite3.connect(f"{main.DB_PATH.as_uri()}?mode=ro", uri=True) as source:
        source.execute("BEGIN")
        users = source.execute("SELECT id, name, email, password_hash FROM users").fetchall()
        sessions = source.execute("SELECT token_hash, user_id, expires_at FROM sessions").fetchall()
        main.init_database()
        with main.connect() as target:
            target.execute("LOCK TABLE users, sessions IN EXCLUSIVE MODE")
            for user in users:
                existing = target.execute("SELECT id, name, email, password_hash FROM users WHERE id = %s OR email = %s", (user[0], user[2])).fetchall()
                if existing and existing != [user]:
                    raise RuntimeError("Conflicting user data in PostgreSQL; migration rolled back.")
                if not existing:
                    target.execute("INSERT INTO users (id, name, email, password_hash) VALUES (%s, %s, %s, %s)", user)
            for token_hash, user_id, expires_at in sessions:
                session = (token_hash, user_id, datetime.fromisoformat(expires_at))
                existing = target.execute("SELECT token_hash, user_id, expires_at FROM sessions WHERE token_hash = %s", (token_hash,)).fetchone()
                if existing and existing != session:
                    raise RuntimeError("Conflicting session data in PostgreSQL; migration rolled back.")
                if not existing:
                    target.execute("INSERT INTO sessions VALUES (%s, %s, %s)", session)
            target.execute("SELECT setval(pg_get_serial_sequence('fastapi_kakao.users', 'id'), GREATEST(COALESCE(MAX(id), 0), 1), MAX(id) IS NOT NULL) FROM users")
    print(f"Copied {len(users)} users and {len(sessions)} sessions. Original SQLite database was preserved.")


if __name__ == "__main__":
    migrate()
