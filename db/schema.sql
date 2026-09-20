PRAGMA foreign_keys = ON;

-- =========================================================
-- Ministries
-- =========================================================
CREATE TABLE IF NOT EXISTS ministries (
    id             INTEGER PRIMARY KEY,
    name           TEXT NOT NULL UNIQUE,
    code           TEXT,
    contact_email  TEXT,
    created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO ministries (id, name, code, contact_email) VALUES
 (1,'Ministry of Health','MOH','info@health.gov.sz'),
 (2,'Ministry of Education','MOE','info@education.gov.sz'),
 (3,'Ministry of Public Works','MPW','info@publicworks.gov.sz'),
 (4,'Ministry of Agriculture','MOA','info@agriculture.gov.sz'),
 (5,'Ministry of Finance','MOF','info@finance.gov.sz'),
 (6,'Ministry of Home Affairs','MHA','info@homeaffairs.gov.sz'),
 (7,'Ministry of Tourism','MOT','info@tourism.gov.sz'),
 (8,'Ministry of ICT','MICT','info@ict.gov.sz');

-- =========================================================
-- Checkpoints
-- =========================================================
CREATE TABLE IF NOT EXISTS checkpoints (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    location   TEXT,
    region     TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO checkpoints (id, name, location, region) VALUES
 (1,'Mbabane Main Gate','Mbabane CBD','Hhohho'),
 (2,'Manzini Hub','Manzini City','Manzini'),
 (3,'Lobamba Royal Gate','Lobamba','Hhohho'),
 (4,'Siteki Border Post','Siteki','Lubombo'),
 (5,'Nhlangano Depot','Nhlangano','Shiselweni'),
 (6,'Matsapha Industrial','Matsapha','Manzini'),
 (7,'Big Bend Gate','Big Bend','Lubombo');

-- =========================================================
-- Drivers
-- =========================================================
CREATE TABLE IF NOT EXISTS drivers (
    id              INTEGER PRIMARY KEY,
    full_name       TEXT NOT NULL,
    license_number  TEXT NOT NULL UNIQUE,
    license_expiry  TEXT,
    phone           TEXT,
    ministry_id     INTEGER REFERENCES ministries(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO drivers (id, full_name, license_number, license_expiry, phone, ministry_id, status) VALUES
 (1,'Sipho Dlamini','SZ-DL-1001','2027-04-12','+268 7600 1001',1,'ACTIVE'),
 (2,'Thandiwe Nkambule','SZ-DL-1002','2026-09-30','+268 7600 1002',2,'ACTIVE'),
 (3,'Mandla Maseko','SZ-DL-1003','2025-12-01','+268 7600 1003',3,'ACTIVE'),
 (4,'Nomsa Shongwe','SZ-DL-1004','2026-06-18','+268 7600 1004',4,'ACTIVE'),
 (5,'Bongani Simelane','SZ-DL-1005','2025-11-05','+268 7600 1005',5,'SUSPENDED'),
 (6,'Zanele Mamba','SZ-DL-1006','2027-02-22','+268 7600 1006',6,'ACTIVE'),
 (7,'Tshepo Magagula','SZ-DL-1007','2026-08-14','+268 7600 1007',7,'ACTIVE'),
 (8,'Precious Gamedze','SZ-DL-1008','2026-03-09','+268 7600 1008',8,'ACTIVE');

-- =========================================================
-- Vehicles
-- =========================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id                    INTEGER PRIMARY KEY,
    plate_number          TEXT NOT NULL UNIQUE,
    make                  TEXT,
    model                 TEXT,
    year                  INTEGER,
    color                 TEXT,
    ministry_id           INTEGER REFERENCES ministries(id) ON DELETE SET NULL,
    assigned_driver_id    INTEGER REFERENCES drivers(id)   ON DELETE SET NULL,
    status                TEXT NOT NULL DEFAULT 'ACTIVE'
                          CHECK (status IN ('ACTIVE','INACTIVE','MAINTENANCE')),
    registration_expiry   TEXT,
    insurance_expiry      TEXT,
    created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO vehicles
  (id, plate_number, make, model, year, color, ministry_id, assigned_driver_id, status, registration_expiry, insurance_expiry) VALUES
 (1,'SD-GOV-001','Toyota','Hilux',2021,'White',1,1,'ACTIVE','2027-01-15','2026-11-30'),
 (2,'SD-GOV-002','Ford','Ranger',2022,'Silver',2,2,'ACTIVE','2026-12-01','2026-12-01'),
 (3,'SD-GOV-003','Nissan','Navara',2020,'Blue',3,3,'ACTIVE','2026-08-20','2026-09-15'),
 (4,'SD-GOV-004','Isuzu','D-Max',2023,'White',4,4,'ACTIVE','2027-05-10','2027-04-10'),
 (5,'SD-GOV-005','Toyota','Land Cruiser',2019,'Black',5,5,'ACTIVE','2026-07-30','2026-10-22'),
 (6,'SD-GOV-006','Hyundai','H1',2021,'Grey',6,6,'ACTIVE','2026-11-11','2027-01-05'),
 (7,'SD-GOV-007','Mazda','BT-50',2022,'Red',7,7,'MAINTENANCE','2027-03-03','2027-02-15'),
 (8,'SD-GOV-008','VW','Amarok',2020,'White',8,8,'ACTIVE','2026-10-10','2026-12-20'),
 (9,'SD-GOV-009','Toyota','Corolla',2024,'Silver',1,NULL,'ACTIVE','2028-01-01','2028-01-01'),
 (10,'SD-GOV-010','Ford','Transit',2018,'White',2,2,'INACTIVE','2025-10-01','2025-09-01');

-- =========================================================
-- Officers (system users)
-- =========================================================
CREATE TABLE IF NOT EXISTS officers (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT,
    role          TEXT NOT NULL DEFAULT 'OFFICER'
                  CHECK (role IN ('OFFICER','SUPERVISOR','ADMIN')),
    checkpoint_id INTEGER REFERENCES checkpoints(id) ON DELETE SET NULL,
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- Scan logs (audit trail)
-- =========================================================
CREATE TABLE IF NOT EXISTS scan_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    plate_number  TEXT NOT NULL,
    vehicle_id    INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id     INTEGER REFERENCES drivers(id)  ON DELETE SET NULL,
    checkpoint_id INTEGER REFERENCES checkpoints(id) ON DELETE SET NULL,
    officer_id    INTEGER REFERENCES officers(id) ON DELETE SET NULL,
    direction     TEXT NOT NULL DEFAULT 'ENTRY'
                  CHECK (direction IN ('ENTRY','EXIT','PASSING')),
    result        TEXT NOT NULL
                  CHECK (result IN ('AUTHORIZED','NOT_FOUND','SUSPENDED_DRIVER','EXPIRED_REG','EXPIRED_INS','UNAUTHORIZED')),
    confidence    REAL,
    notes         TEXT,
    flagged       INTEGER NOT NULL DEFAULT 0,
    scanned_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_plate  ON scan_logs(plate_number);
CREATE INDEX IF NOT EXISTS idx_scan_time   ON scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scan_result ON scan_logs(result);

-- =========================================================
-- Alerts
-- =========================================================
CREATE TABLE IF NOT EXISTS alerts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    severity      TEXT NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL')),
    title         TEXT NOT NULL,
    message       TEXT,
    related_plate TEXT,
    scan_log_id   INTEGER REFERENCES scan_logs(id) ON DELETE SET NULL,
    resolved      INTEGER NOT NULL DEFAULT 0,
    resolved_by   INTEGER REFERENCES officers(id) ON DELETE SET NULL,
    resolved_at   TEXT,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
