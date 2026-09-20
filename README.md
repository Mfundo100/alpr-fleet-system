# ALPR Fleet Management System
### Kingdom of Eswatini - Government Vehicle Monitoring

A web application for monitoring government fleets using Automatic License
Plate Recognition (ALPR) principles. Flask + SQLite backend, plain
HTML/CSS/JS frontend, PWA-installable, deployable to Render.

---

## Default login

| Username | Password    | Role  |
|----------|-------------|-------|
| admin    | Admin@1234  | ADMIN |

The admin user is seeded automatically the first time the app starts.

---

## Run locally

```bash
python -m venv .venv
# Windows:  .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # edit SECRET_KEY
python app.py


Open http://127.0.0.1:5000 and log in as `admin` / `Admin@1234`.

The SQLite database (`db/alpr_fleet.db`) is created on first boot and
seeded with sample data: 8 ministries, 7 checkpoints, 8 drivers, 10 vehicles.

---

## Deploy to Render

1. Push the repo to GitHub.
2. Render -> New -> Blueprint -> point at the repo (uses render.yaml).
3. Deploy.

The render.yaml mounts a persistent disk at /var/data (requires the
Starter plan or higher).

---

## Scan result codes

| Result             | Meaning                                        |
|--------------------|------------------------------------------------|
| AUTHORIZED         | Valid vehicle, active driver, current documents|
| NOT_FOUND          | Plate not in fleet database                    |
| SUSPENDED_DRIVER   | Assigned driver is suspended                   |
| UNAUTHORIZED       | Vehicle is INACTIVE or in MAINTENANCE          |
| EXPIRED_REG        | Registration expired                           |
| EXPIRED_INS        | Insurance expired                              |

---

## Roles

| Role       | Scan | Edit vehicles | Suspend drivers | Delete | Manage ministries |
|------------|------|---------------|-----------------|--------|-------------------|
| OFFICER    | yes  | yes           | no              | no     | no                |
| SUPERVISOR | yes  | yes           | yes             | no     | no                |
| ADMIN      | yes  | yes           | yes             | yes    | yes               |

---

*ALPR Fleet Management System - Kingdom of Eswatini Government*
