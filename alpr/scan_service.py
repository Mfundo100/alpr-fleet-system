from datetime import date
from .db import get_db


def _today():
    return date.today().isoformat()


def _expired(date_str):
    return bool(date_str) and date_str < _today()


def verify_plate(plate, direction="ENTRY", checkpoint_id=None,
                 officer_id=None, confidence=None):
    db = get_db()
    plate = (plate or "").strip().upper().replace(" ", "")
    if not plate:
        raise ValueError("Plate number is required")

    vehicle = db.execute(
        "SELECT * FROM vehicles WHERE plate_number = ?", (plate,)
    ).fetchone()

    result = "AUTHORIZED"
    notes = []
    vehicle_id = None
    driver_id = None
    driver_row = None

    if vehicle is None:
        result = "NOT_FOUND"
        notes.append("Plate not present in fleet database")
    else:
        vehicle_id = vehicle["id"]
        driver_id = vehicle["assigned_driver_id"]

        if vehicle["status"] != "ACTIVE":
            result = "UNAUTHORIZED"
            notes.append("Vehicle status is " + str(vehicle["status"]))
        else:
            if driver_id:
                driver_row = db.execute(
                    "SELECT * FROM drivers WHERE id = ?", (driver_id,)
                ).fetchone()
                if driver_row and driver_row["status"] == "SUSPENDED":
                    result = "SUSPENDED_DRIVER"
                    notes.append("Driver " + driver_row["full_name"] + " is suspended")

            if result == "AUTHORIZED":
                if _expired(vehicle["registration_expiry"]):
                    result = "EXPIRED_REG"
                    notes.append("Registration expired")
                elif _expired(vehicle["insurance_expiry"]):
                    result = "EXPIRED_INS"
                    notes.append("Insurance expired")

    cur = db.execute(
        """INSERT INTO scan_logs
           (plate_number, vehicle_id, driver_id, checkpoint_id, officer_id,
            direction, result, confidence, notes)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (plate, vehicle_id, driver_id, checkpoint_id, officer_id,
         direction, result, confidence, "; ".join(notes)),
    )
    scan_id = cur.lastrowid

    if result != "AUTHORIZED":
        severity = "CRITICAL" if result in ("NOT_FOUND", "SUSPENDED_DRIVER") else "WARNING"
        db.execute(
            """INSERT INTO alerts
               (severity, title, message, related_plate, scan_log_id)
               VALUES (?,?,?,?,?)""",
            (severity, result + " - " + plate, "; ".join(notes) or result,
             plate, scan_id),
        )

    db.commit()

    return {
        "scan_id": scan_id,
        "plate": plate,
        "result": result,
        "notes": "; ".join(notes),
        "vehicle": dict(vehicle) if vehicle else None,
        "driver": dict(driver_row) if driver_row else None,
    }
