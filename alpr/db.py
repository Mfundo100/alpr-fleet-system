import os
import sqlite3
from flask import g, current_app
from werkzeug.security import generate_password_hash


def get_db():
    if "db" not in g:
        path = current_app.config["DATABASE"]
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        g.db = sqlite3.connect(path, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
        g.db.execute("PRAGMA journal_mode = WAL")
    return g.db


def close_db(exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    schema_path = os.path.join(here, "db", "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        get_db().executescript(f.read())
    get_db().commit()


def seed_admin():
    db = get_db()
    row = db.execute("SELECT id FROM officers WHERE username = 'admin'").fetchone()
    if row is None:
        db.execute(
            "INSERT INTO officers (username, password_hash, full_name, role) "
            "VALUES (?, ?, ?, 'ADMIN')",
            ("admin", generate_password_hash("Admin@1234"), "System Administrator"),
        )
        db.commit()


def init_app(app):
    app.teardown_appcontext(close_db)
