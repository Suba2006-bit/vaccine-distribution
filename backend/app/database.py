import sqlite3
import os
from .config import settings

DB_PATH = os.path.join(settings.BASE_DIR, "vaccine_system.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL, -- 'HOSPITAL' or 'MANUFACTURER'
        facility_name TEXT NOT NULL,
        facility_type TEXT DEFAULT 'Hospital',
        district TEXT DEFAULT 'Central',
        state TEXT DEFAULT 'Metro State',
        contact_number TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Vaccines Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vaccines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        recommended_temp_min REAL DEFAULT 2.0,
        recommended_temp_max REAL DEFAULT 8.0,
        shelf_life_days INTEGER DEFAULT 180,
        doses_per_vial INTEGER DEFAULT 10,
        description TEXT DEFAULT ''
    );
    """)

    # Batches Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_number TEXT UNIQUE NOT NULL,
        facility_id INTEGER NOT NULL,
        vaccine_id INTEGER NOT NULL,
        manufacture_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        initial_doses INTEGER NOT NULL,
        current_doses INTEGER NOT NULL,
        status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'QUARANTINED_HEAT', 'QUARANTINED_FREEZE', 'EXPIRED', 'DEPLETED'
        cold_storage_unit TEXT DEFAULT 'Cold Storage Hub 1',
        quarantine_reason TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (facility_id) REFERENCES users (id),
        FOREIGN KEY (vaccine_id) REFERENCES vaccines (id)
    );
    """)

    # Thermal Logs Table (Method A Simulated Telemetry)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS thermal_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        facility_id INTEGER NOT NULL,
        batch_id INTEGER,
        unit_name TEXT DEFAULT 'Cold Storage Hub 1',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        temperature REAL NOT NULL,
        humidity REAL DEFAULT 50.0,
        door_status TEXT DEFAULT 'CLOSED', -- 'CLOSED', 'OPEN'
        power_status TEXT DEFAULT 'MAINS',  -- 'MAINS', 'BATTERY', 'FAILURE'
        scenario_tag TEXT DEFAULT 'OPTIMAL', -- 'OPTIMAL', 'DOOR_AJAR', 'POWER_FAILURE', 'FREEZE_EXCURSION'
        FOREIGN KEY (facility_id) REFERENCES users (id),
        FOREIGN KEY (batch_id) REFERENCES batches (id)
    );
    """)

    # Historical Daily Vaccine Consumption (for AI demand models)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vaccine_consumption_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        facility_id INTEGER NOT NULL,
        vaccine_id INTEGER NOT NULL,
        record_date TEXT NOT NULL,
        doses_administered INTEGER NOT NULL,
        FOREIGN KEY (facility_id) REFERENCES users (id),
        FOREIGN KEY (vaccine_id) REFERENCES vaccines (id)
    );
    """)

    # Vaccine Supply Requests (Hospital -> Manufacturer)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vaccine_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requesting_facility_id INTEGER NOT NULL,
        manufacturer_id INTEGER,
        vaccine_id INTEGER NOT NULL,
        requested_doses INTEGER NOT NULL,
        priority TEXT DEFAULT 'ROUTINE', -- 'ROUTINE', 'URGENT'
        status TEXT DEFAULT 'PENDING',   -- 'PENDING', 'APPROVED', 'DISPATCHED', 'DELIVERED', 'REJECTED'
        notes TEXT DEFAULT '',
        dispatch_notes TEXT DEFAULT '',
        transit_temperature REAL DEFAULT 4.5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requesting_facility_id) REFERENCES users (id),
        FOREIGN KEY (manufacturer_id) REFERENCES users (id),
        FOREIGN KEY (vaccine_id) REFERENCES vaccines (id)
    );
    """)

    # Redistribution Recommendations (Surplus/Expiring -> Shortage Facilities)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS redistribution_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_facility_id INTEGER NOT NULL,
        target_facility_id INTEGER NOT NULL,
        batch_id INTEGER NOT NULL,
        vaccine_id INTEGER NOT NULL,
        recommended_doses INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'SUGGESTED', -- 'SUGGESTED', 'ACCEPTED', 'COMPLETED', 'DISMISSED'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_facility_id) REFERENCES users (id),
        FOREIGN KEY (target_facility_id) REFERENCES users (id),
        FOREIGN KEY (batch_id) REFERENCES batches (id),
        FOREIGN KEY (vaccine_id) REFERENCES vaccines (id)
    );
    """)

    # Support / Communication Queries
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS query_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER,
        subject TEXT NOT NULL,
        category TEXT DEFAULT 'GENERAL', -- 'STOCK_ISSUE', 'TEMPERATURE_EXCURSION', 'ORDER_STATUS', 'GENERAL'
        message TEXT NOT NULL,
        reply TEXT DEFAULT '',
        status TEXT DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users (id),
        FOREIGN KEY (recipient_id) REFERENCES users (id)
    );
    """)

    # Manufacturer Production Batches
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS production_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturer_id INTEGER NOT NULL,
        vaccine_id INTEGER NOT NULL,
        planned_doses INTEGER NOT NULL,
        target_completion_date TEXT NOT NULL,
        status TEXT DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'IN_PRODUCTION', 'COMPLETED'
        batch_code TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manufacturer_id) REFERENCES users (id),
        FOREIGN KEY (vaccine_id) REFERENCES vaccines (id)
    );
    """)

    conn.commit()
    conn.close()
