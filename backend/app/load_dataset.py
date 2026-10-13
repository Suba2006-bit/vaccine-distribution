import csv
import os
from datetime import datetime
from .database import get_db_connection, init_db
from .config import settings

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(CURRENT_DIR, "data", "cold_chain_dataset.csv")

def import_dataset():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create dataset_telemetry_logs table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dataset_telemetry_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_date TEXT NOT NULL,
        batch_id TEXT NOT NULL,
        location TEXT NOT NULL,
        current_hop TEXT NOT NULL,
        external_storage TEXT NOT NULL,
        thermal_shipper_temp REAL NOT NULL,
        room_temp REAL NOT NULL,
        room_humidity REAL NOT NULL,
        item_expiry_hours INTEGER NOT NULL,
        ult_freezer_hours INTEGER NOT NULL,
        out_of_bound_hours INTEGER NOT NULL,
        refrigeration_hours INTEGER NOT NULL,
        phase_tag TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Check if a Jharkand facility exists or create one
    cursor.execute("SELECT id FROM users WHERE facility_name LIKE '%Jharkhand%' OR facility_name LIKE '%Jharkand%'")
    jharkand_user = cursor.fetchone()
    if not jharkand_user:
        cursor.execute("""
        INSERT INTO users (email, password_hash, role, facility_name, facility_type, district, state, contact_number)
        VALUES ('depot@jharkhandhealth.gov.in', 'dummyhash', 'HOSPITAL', 'Jharkhand Central Vaccine Depot', 'Regional Depository', 'Ranchi', 'Jharkhand', '+91 94311 00223')
        """)
        jharkand_user_id = cursor.lastrowid
    else:
        jharkand_user_id = jharkand_user["id"]

    # Check if batch001 exists in batches table
    cursor.execute("SELECT id FROM batches WHERE batch_number = 'batch001'")
    existing_batch = cursor.fetchone()
    if not existing_batch:
        # Check vaccine 1 (or create mRNA Ultra-Cold Vaccine)
        cursor.execute("SELECT id FROM vaccines WHERE name LIKE '%mRNA%' OR name LIKE '%Pfizer%'")
        vaccine_row = cursor.fetchone()
        if not vaccine_row:
            cursor.execute("""
            INSERT INTO vaccines (name, type, recommended_temp_min, recommended_temp_max, shelf_life_days, doses_per_vial, description)
            VALUES ('Comirnaty (mRNA COVID-19)', 'mRNA Ultra-Cold', -80.0, -60.0, 30, 6, 'Ultra-low temperature mRNA vaccine (-70°C). After thaw, stable at 2°C-8°C for 120 hours (5 days).')
            """)
            vaccine_id = cursor.lastrowid
        else:
            vaccine_id = vaccine_row["id"]

        cursor.execute("""
        INSERT INTO batches (
            batch_number, facility_id, vaccine_id, manufacture_date, expiry_date,
            initial_doses, current_doses, status, cold_storage_unit, quarantine_reason
        ) VALUES (
            'batch001', ?, ?, '2020-09-01', '2020-10-07',
            1000, 0, 'QUARANTINED_HEAT', 'Jharkhand Vaccine Storage Unit',
            'Breached to 14°C after 119h thaw. Automatically moved to dest_discarded_vaccine_storage_unit.'
        )
        """, (jharkand_user_id, vaccine_id))

    # Clear previous import if any and reload
    cursor.execute("DELETE FROM dataset_telemetry_logs WHERE batch_id = 'batch001'")

    rows_to_insert = []
    with open(CSV_FILE, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            shipper_temp = float(row["thermal_shipper_temp_reading"])
            if shipper_temp < -20.0:
                phase_tag = "ULTRA_LOW_FREEZER"
            elif shipper_temp <= 8.0:
                phase_tag = "REFRIGERATED_STORAGE"
            else:
                phase_tag = "EXCURSION_DISCARD"

            rows_to_insert.append((
                row["date"],
                row["batch_id"],
                row["location"],
                row["current_hop"],
                row["external_storage"],
                shipper_temp,
                float(row["room_temp_reading"]),
                float(row["room_humidity_reading"]),
                int(row["item_expiry_hours"]),
                int(row["ultra_low_temperature_freezer_hours"]),
                int(row["out_of_bound_temperature_hours"]),
                int(row["refrigeration_temperature_hours"]),
                phase_tag
            ))

    cursor.executemany("""
    INSERT INTO dataset_telemetry_logs (
        log_date, batch_id, location, current_hop, external_storage,
        thermal_shipper_temp, room_temp, room_humidity, item_expiry_hours,
        ult_freezer_hours, out_of_bound_hours, refrigeration_hours, phase_tag
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows_to_insert)

    conn.commit()
    count = len(rows_to_insert)
    conn.close()
    print(f"Successfully loaded {count} telemetry logs from cold_chain_dataset.csv into SQLite database!")
    return count

if __name__ == "__main__":
    import_dataset()
