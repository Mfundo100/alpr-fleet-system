import os
from flask import Flask
from dotenv import load_dotenv

load_dotenv()


def create_app():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app = Flask(
        __name__,
        template_folder=os.path.join(here, "templates"),
        static_folder=os.path.join(here, "static"),
    )
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    app.config["DATABASE"] = os.environ.get(
        "DATABASE_PATH", os.path.join(here, "db", "alpr_fleet.db")
    )
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

    from . import db
    db.init_app(app)

    from .routes import bp
    app.register_blueprint(bp)

    with app.app_context():
        db.init_db()
        db.seed_admin()

    return app
