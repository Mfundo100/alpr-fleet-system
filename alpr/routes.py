import csv
import io
from datetime import date

from flask import (
    Blueprint, render_template, request, jsonify, session,
    redirect, url_for, Response
)
from werkzeug.security import check_password_hash

from .auth import login_required, role_required, current_user
from .db import get_db
from .scan_service import verify_plate

bp = Blueprint("main", __name__)

PAGES = [
    ("dashboard",  "Dashboard",   "*"),
    ("scan",       "Scan Vehicle","#"),
    ("vehicles",   "Vehicles",    "V"),
    ("drivers",    "Drivers",     "D"),
    ("audit",      "Audit Log",   "A"),
    ("alerts",     "Alerts",      "!"),
    ("reports",    "Reports",     "R"),
    ("ministries", "Ministries",  "M"),
]


@bp.app_context_processor
def inject_pages():
    return {"nav_pages": PAGES, "user": current_user()}


@bp.route("/login")
def login_page():
    if session.get("user_id"):
        return redirect(url_for("main.dashboard_page"))
    return render_template("login.html")


@bp.route("/")
@login_required
def index():
    return redirect(url_for("main.dashboard_page"))


def _page(template, active):
    return render_template(template, active=active)


@bp.route("/dashboard")
@login_required
def dashboard_page():   return _page("dashboard.html",  "dashboard")

@bp.route("/scan")
@login_required
def scan_page():        return _page("scan.html",       "scan")

@bp.route("/vehicles")
@login_required
def vehicles_page():    return _page("vehicles.html",   "vehicles")

@bp.route("/drivers")
@login_required
def drivers_page():     return _page("drivers.html",    "drivers")

@bp.route("/audit")
@login_required
def audit_page():       return _page("audit.html",      "audit")

@bp.route("/alerts")
@login_required
def alerts_page():      return _page("alerts.html",     "alerts")

@bp.route("/reports")
@login_required
def reports_page():     return _page("reports.html",    "reports")

@bp.route("/ministries")
@login_required
def ministries_page():  return _page("ministries.html", "ministries")


# =========================================================
# AUTH API
# =========================================================
@bp.post("/api/auth/login")
def api_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    user = get_db().execute(
        "SELECT * FROM officers WHERE username = ? AND active = 1", (username,)
    ).fetchone()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    session.clear()
    session["user_id"]   = user["id"]
    session["username"]  = user["username"]
    session["full_name"] = user["full_name"] or user["username"]
    session["role"]      = user["role"]
    return jsonify({"ok": True, "user": current_user()})


@bp.post("/api/auth/logout")
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@bp.get("/api/auth/me")
@login_required
def api_me():
    return jsonify(current_user())


# =========================================================
# SCAN API
# =========================================================
@bp.post("/api/scan")
@login_required
def api_scan():
    data = request.get_json(silent=True) or {}
    try:
        result = verify_plate(
            plate=data.get("plate", ""),
            direction=data.get("direction", "ENTRY"),
            checkpoint_id=data.get("checkpoint_id"),
            officer_id=session.get("user_id"),
            confidence=data.get("confidence"),
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(result)


@bp.get("/api/scan/recent")
@login_required
def api_scan_recent():
    limit = int(request.args.get("limit", 30))
    rows = get_db().execute(
        """SELECT s.*, v.make, v.model, c.name AS checkpoint_name,
                  o.full_name AS officer_name
           FROM scan_logs s
           LEFT JOIN vehicles v ON v.id = s.vehicle_id
           LEFT JOIN checkpoints c ON c.id = s.checkpoint_id
           LEFT JOIN officers o ON o.id = s.officer_id
           ORDER BY s.id DESC LIMIT ?""", (limit,)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@bp.get("/api/checkpoints")
@login_required
def api_checkpoints():
    rows = get_db().execute("SELECT * FROM checkpoints ORDER BY name").fetchall()
    return jsonify([dict(r) for r in rows])


# =========================================================
# VEHICLES API
# =========================================================
@bp.get("/api/vehicles")
@login_required
def api_vehicles_list():
    q = (request.args.get("q") or "").strip()
    sql = """SELECT v.*, m.name AS ministry_name, d.full_name AS driver_name
             FROM vehicles v
             LEFT JOIN ministries m ON m.id = v.ministry_id
             LEFT JOIN drivers   d ON d.id = v.assigned_driver_id"""
    params = []
    if q:
        sql += " WHERE v.plate_number LIKE ? OR v.make LIKE ? OR m.name LIKE ?"
        params = ["%" + q + "%"] * 3
    sql += " ORDER BY v.plate_number"
    rows = get_db().execute(sql, params).fetchall()
    return jsonify([dict(r) for r in rows])


@bp.get("/api/vehicles/<int:vid>")
@login_required
def api_vehicle_get(vid):
    row = get_db().execute("SELECT * FROM vehicles WHERE id = ?", (vid,)).fetchone()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify(dict(row))


@bp.post("/api/vehicles")
@login_required
def api_vehicle_create():
    d = request.get_json(silent=True) or {}
    if not d.get("plate_number"):
        return jsonify({"error": "plate_number is required"}), 400
    db = get_db()
    try:
        cur = db.execute(
            """INSERT INTO vehicles
               (plate_number, make, model, year, color, ministry_id,
                assigned_driver_id, status, registration_expiry, insurance_expiry)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (d["plate_number"].upper(), d.get("make"), d.get("model"),
             d.get("year"), d.get("color"), d.get("ministry_id"),
             d.get("assigned_driver_id"), d.get("status", "ACTIVE"),
             d.get("registration_expiry"), d.get("insurance_expiry")),
        )
        db.commit()
        return jsonify({"id": cur.lastrowid}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.put("/api/vehicles/<int:vid>")
@login_required
def api_vehicle_update(vid):
    d = request.get_json(silent=True) or {}
    db = get_db()
    try:
        db.execute(
            """UPDATE vehicles SET plate_number=?, make=?, model=?, year=?,
               color=?, ministry_id=?, assigned_driver_id=?, status=?,
               registration_expiry=?, insurance_expiry=? WHERE id=?""",
            (d["plate_number"].upper(), d.get("make"), d.get("model"),
             d.get("year"), d.get("color"), d.get("ministry_id"),
             d.get("assigned_driver_id"), d.get("status", "ACTIVE"),
             d.get("registration_expiry"), d.get("insurance_expiry"), vid),
        )
        db.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.delete("/api/vehicles/<int:vid>")
@login_required
@role_required("ADMIN")
def api_vehicle_delete(vid):
    db = get_db()
    db.execute("DELETE FROM vehicles WHERE id = ?", (vid,))
    db.commit()
    return jsonify({"ok": True})


# =========================================================
# DRIVERS API
# =========================================================
@bp.get("/api/drivers")
@login_required
def api_drivers_list():
    rows = get_db().execute(
        """SELECT d.*, m.name AS ministry_name
           FROM drivers d LEFT JOIN ministries m ON m.id = d.ministry_id
           ORDER BY d.full_name"""
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@bp.post("/api/drivers")
@login_required
def api_driver_create():
    d = request.get_json(silent=True) or {}
    if not d.get("full_name") or not d.get("license_number"):
        return jsonify({"error": "full_name and license_number required"}), 400
    db = get_db()
    try:
        cur = db.execute(
            """INSERT INTO drivers (full_name, license_number, license_expiry,
                                    phone, ministry_id, status)
               VALUES (?,?,?,?,?,?)""",
            (d["full_name"], d["license_number"], d.get("license_expiry"),
             d.get("phone"), d.get("ministry_id"), d.get("status", "ACTIVE")),
        )
        db.commit()
        return jsonify({"id": cur.lastrowid}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.put("/api/drivers/<int:did>")
@login_required
def api_driver_update(did):
    d = request.get_json(silent=True) or {}
    db = get_db()
    try:
        db.execute(
            """UPDATE drivers SET full_name=?, license_number=?, license_expiry=?,
               phone=?, ministry_id=?, status=? WHERE id=?""",
            (d["full_name"], d["license_number"], d.get("license_expiry"),
             d.get("phone"), d.get("ministry_id"), d.get("status", "ACTIVE"), did),
        )
        db.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/api/drivers/<int:did>/status")
@login_required
@role_required("SUPERVISOR")
def api_driver_set_status(did):
    d = request.get_json(silent=True) or {}
    status = (d.get("status") or "").upper()
    if status not in ("ACTIVE", "SUSPENDED"):
        return jsonify({"error": "status must be ACTIVE or SUSPENDED"}), 400
    db = get_db()
    db.execute("UPDATE drivers SET status=? WHERE id=?", (status, did))
    db.commit()
    return jsonify({"ok": True})


@bp.delete("/api/drivers/<int:did>")
@login_required
@role_required("ADMIN")
def api_driver_delete(did):
    db = get_db()
    db.execute("DELETE FROM drivers WHERE id=?", (did,))
    db.commit()
    return jsonify({"ok": True})


# =========================================================
# MINISTRIES API
# =========================================================
@bp.get("/api/ministries")
@login_required
def api_ministries_list():
    rows = get_db().execute("SELECT * FROM ministries ORDER BY name").fetchall()
    return jsonify([dict(r) for r in rows])


@bp.post("/api/ministries")
@login_required
@role_required("ADMIN")
def api_ministry_create():
    d = request.get_json(silent=True) or {}
    if not d.get("name"):
        return jsonify({"error": "name required"}), 400
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO ministries (name, code, contact_email) VALUES (?,?,?)",
            (d["name"], d.get("code"), d.get("contact_email")),
        )
        db.commit()
        return jsonify({"id": cur.lastrowid}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.put("/api/ministries/<int:mid>")
@login_required
@role_required("ADMIN")
def api_ministry_update(mid):
    d = request.get_json(silent=True) or {}
    db = get_db()
    db.execute(
        "UPDATE ministries SET name=?, code=?, contact_email=? WHERE id=?",
        (d["name"], d.get("code"), d.get("contact_email"), mid),
    )
    db.commit()
    return jsonify({"ok": True})


@bp.delete("/api/ministries/<int:mid>")
@login_required
@role_required("ADMIN")
def api_ministry_delete(mid):
    db = get_db()
    db.execute("DELETE FROM ministries WHERE id=?", (mid,))
    db.commit()
    return jsonify({"ok": True})


# =========================================================
# AUDIT / SCAN LOGS API
# =========================================================
def _audit_query():
    args = request.args
    sql = """SELECT s.*, v.make, v.model, c.name AS checkpoint_name,
                    o.full_name AS officer_name
             FROM scan_logs s
             LEFT JOIN vehicles v ON v.id = s.vehicle_id
             LEFT JOIN checkpoints c ON c.id = s.checkpoint_id
             LEFT JOIN officers o ON o.id = s.officer_id
             WHERE 1=1"""
    params = []
    if args.get("from"):
        sql += " AND date(s.scanned_at) >= date(?)"; params.append(args["from"])
    if args.get("to"):
        sql += " AND date(s.scanned_at) <= date(?)"; params.append(args["to"])
    if args.get("plate"):
        sql += " AND s.plate_number LIKE ?"; params.append("%" + args["plate"].upper() + "%")
    if args.get("result"):
        sql += " AND s.result = ?"; params.append(args["result"])
    if args.get("flagged") == "1":
        sql += " AND s.flagged = 1"
    sql += " ORDER BY s.id DESC LIMIT 1000"
    return sql, params


@bp.get("/api/audit")
@login_required
def api_audit():
    sql, params = _audit_query()
    rows = get_db().execute(sql, params).fetchall()
    return jsonify([dict(r) for r in rows])


@bp.get("/api/audit/export.csv")
@login_required
def api_audit_export():
    sql, params = _audit_query()
    rows = get_db().execute(sql, params).fetchall()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "scanned_at", "plate", "vehicle", "driver",
                "checkpoint", "officer", "direction", "result",
                "confidence", "notes", "flagged"])
    for r in rows:
        w.writerow([
            r["id"], r["scanned_at"], r["plate_number"],
            (str(r["make"] or "") + " " + str(r["model"] or "")).strip(),
            r["driver_id"], r["checkpoint_name"], r["officer_name"],
            r["direction"], r["result"], r["confidence"],
            r["notes"], "yes" if r["flagged"] else "no",
        ])
    return Response(
        buf.getvalue(), mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=alpr_audit.csv"},
    )


@bp.post("/api/audit/<int:sid>/flag")
@login_required
def api_audit_flag(sid):
    d = request.get_json(silent=True) or {}
    flagged = 1 if d.get("flagged") else 0
    db = get_db()
    db.execute("UPDATE scan_logs SET flagged=? WHERE id=?", (flagged, sid))
    db.commit()
    return jsonify({"ok": True})


# =========================================================
# ALERTS API
# =========================================================
@bp.get("/api/alerts")
@login_required
def api_alerts():
    only_open = request.args.get("open") == "1"
    sql = """SELECT a.*, o.full_name AS resolved_by_name
             FROM alerts a LEFT JOIN officers o ON o.id = a.resolved_by"""
    if only_open:
        sql += " WHERE a.resolved = 0"
    sql += " ORDER BY a.resolved ASC, a.id DESC"
    rows = get_db().execute(sql).fetchall()
    return jsonify([dict(r) for r in rows])


@bp.post("/api/alerts/<int:aid>/resolve")
@login_required
@role_required("SUPERVISOR")
def api_alert_resolve(aid):
    db = get_db()
    db.execute(
        "UPDATE alerts SET resolved=1, resolved_by=?, resolved_at=CURRENT_TIMESTAMP "
        "WHERE id=?",
        (session.get("user_id"), aid),
    )
    db.commit()
    return jsonify({"ok": True})


# =========================================================
# REPORTS API
# =========================================================
@bp.get("/api/reports/kpis")
@login_required
def api_kpis():
    db = get_db()
    today = date.today().isoformat()
    def one(sql, p=()):
        return db.execute(sql, p).fetchone()["c"]
    return jsonify({
        "scans_today":    one("SELECT COUNT(*) c FROM scan_logs WHERE date(scanned_at)=?", (today,)),
        "incidents_today":one("SELECT COUNT(*) c FROM scan_logs WHERE date(scanned_at)=? AND result!='AUTHORIZED'", (today,)),
        "flagged":        one("SELECT COUNT(*) c FROM scan_logs WHERE flagged=1"),
        "fleet":          one("SELECT COUNT(*) c FROM vehicles"),
        "open_alerts":    one("SELECT COUNT(*) c FROM alerts WHERE resolved=0"),
        "suspended":      one("SELECT COUNT(*) c FROM drivers WHERE status='SUSPENDED'"),
    })


@bp.get("/api/reports/scans-by-result")
@login_required
def api_scans_by_result():
    db = get_db()
    today = date.today().isoformat()
    today_rows = db.execute(
        "SELECT result, COUNT(*) c FROM scan_logs WHERE date(scanned_at)=? GROUP BY result",
        (today,)).fetchall()
    all_rows = db.execute(
        "SELECT result, COUNT(*) c FROM scan_logs GROUP BY result").fetchall()
    return jsonify({
        "today": [dict(r) for r in today_rows],
        "all":   [dict(r) for r in all_rows],
    })


@bp.get("/api/reports/fleet-status")
@login_required
def api_fleet_status():
    rows = get_db().execute(
        "SELECT status, COUNT(*) c FROM vehicles GROUP BY status"
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@bp.get("/api/reports/scans-by-ministry")
@login_required
def api_scans_by_ministry():
    rows = get_db().execute(
        """SELECT COALESCE(m.name,'(unknown)') AS ministry, COUNT(*) c
           FROM scan_logs s
           LEFT JOIN vehicles v ON v.id = s.vehicle_id
           LEFT JOIN ministries m ON m.id = v.ministry_id
           GROUP BY m.id ORDER BY c DESC"""
    ).fetchall()
    return jsonify([dict(r) for r in rows])
