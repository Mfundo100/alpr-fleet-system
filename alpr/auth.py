from functools import wraps
from flask import session, jsonify, redirect, url_for, request

ROLE_RANK = {"OFFICER": 1, "SUPERVISOR": 2, "ADMIN": 3}


def current_user():
    if not session.get("user_id"):
        return None
    return {
        "id": session.get("user_id"),
        "username": session.get("username"),
        "full_name": session.get("full_name"),
        "role": session.get("role"),
    }


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            if request.path.startswith("/api/"):
                return jsonify({"error": "unauthorized"}), 401
            return redirect(url_for("main.login_page"))
        return f(*args, **kwargs)
    return wrapper


def role_required(minimum):
    def deco(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            role = session.get("role")
            if not role or ROLE_RANK.get(role, 0) < ROLE_RANK.get(minimum, 99):
                return jsonify({"error": "forbidden", "required": minimum}), 403
            return f(*args, **kwargs)
        return wrapper
    return deco
