import sqlite3
import hashlib
from datetime import datetime, timedelta
import random
from .database import get_db_connection, init_db
from .services.simulator_service import generate_burst_telemetry

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode('utf-8')).hexdigest()


def ensure_default_redistribution_history(conn):
    existing_history = conn.execute(
        "SELECT 1 FROM redistribution_recommendations WHERE status IN ('COMPLETED', 'DISMISSED') LIMIT 1"
    ).fetchone()
    if existing_history:
        return

    source = conn.execute(
        "SELECT id FROM users WHERE email = ?", ("hospital@citycare.org",)
    ).fetchone()
    target = conn.execute(
        "SELECT id FROM users WHERE email = ?", ("clinic@greenvalley.org",)
    ).fetchone()
    if not source or not target:
        return

    source_batch = conn.execute(
        "SELECT * FROM batches WHERE batch_number = ? AND facility_id = ?",
        ("COV-2026-A102", source["id"]),
    ).fetchone()
    if not source_batch or source_batch["current_doses"] <= 0:
        return

    receiving_batch_number = "REDIST-DEMO-HISTORY-COV-2026-A102"
    if conn.execute(
        "SELECT 1 FROM batches WHERE batch_number = ?", (receiving_batch_number,)
    ).fetchone():
        return

    transfer_doses = min(100, source_batch["current_doses"])
    conn.execute(
        "UPDATE batches SET current_doses = current_doses - ? WHERE id = ?",
        (transfer_doses, source_batch["id"]),
    )
    conn.execute(
        """
        INSERT INTO batches (
            batch_number, facility_id, vaccine_id, manufacture_date, expiry_date,
            initial_doses, current_doses, status, cold_storage_unit, quarantine_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'Clinic Refrigerator 1', ?)
        """,
        (
            receiving_batch_number,
            target["id"],
            source_batch["vaccine_id"],
            source_batch["manufacture_date"],
            source_batch["expiry_date"],
            transfer_doses,
            transfer_doses,
            "Default completed redistribution transaction.",
        ),
    )
    conn.execute(
        """
        INSERT INTO redistribution_recommendations (
            source_facility_id, target_facility_id, batch_id, vaccine_id,
            recommended_doses, reason, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
        """,
        (
            source["id"],
            target["id"],
            source_batch["id"],
            source_batch["vaccine_id"],
            transfer_doses,
            "Completed default demo transfer to Green Valley Community Health Center.",
            (datetime.now() - timedelta(days=14)).strftime("%Y-%m-%d %H:%M:%S"),
        ),
    )


def seed_database():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if already seeded
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] > 0:
        ensure_default_redistribution_history(conn)
        conn.commit()
        conn.close()
        return

    print("Seeding initial data...")

    # 1. Users
    users_data = [
        (
            "hospital@citycare.org",
            hash_pw("hospital123"),
            "HOSPITAL",
            "CityCare General Hospital",
            "Tertiary Care Hospital",
            "Metro District",
            "Karnataka",
            "+91 98765 43210"
        ),
        (
            "clinic@greenvalley.org",
            hash_pw("clinic123"),
            "HOSPITAL",
            "Green Valley Community Health Center",
            "Primary Health Center",
            "Rural District",
            "Karnataka",
            "+91 98111 22334"
        ),
        (
            "manufacturer@serumlab.com",
            hash_pw("admin123"),
            "MANUFACTURER",
            "Apex Biologics & Vaccines Ltd.",
            "Vaccine Production Plant",
            "Industrial Zone",
            "Maharashtra",
            "+91 98450 11223"
        )
    ]
    cursor.executemany("""
    INSERT INTO users (email, password_hash, role, facility_name, facility_type, district, state, contact_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, users_data)

    citycare_id = 1
    greenvalley_id = 2
    apex_id = 3

    # 2. Vaccines
    vaccines_data = [
        ("Covaxin", "Inactivated Whole-Virion", 2.0, 8.0, 180, 10, "Whole-virion inactivated COVID-19 vaccine. Requires strict 2°C to 8°C storage."),
        ("Covishield", "Viral Vector (ChAdOx1)", 2.0, 8.0, 180, 10, "Recombinant viral vector vaccine. Protect from direct freezing."),
        ("BCG Vaccine", "Live-Attenuated Bacterial", 2.0, 8.0, 365, 20, "Tuberculosis immunization for infants. Highly sensitive to light and heat."),
        ("Measles-Rubella (MR)", "Live-Attenuated Viral", 2.0, 8.0, 720, 10, "Lyophilized pediatric combination vaccine. Must be refrigerated."),
        ("Oral Polio Vaccine (OPV)", "Live-Attenuated Trivalent", 2.0, 8.0, 720, 20, "Oral polio drops. Ultra heat-sensitive, historically frozen, stored at 2°C-8°C locally."),
        ("Hepatitis B", "Recombinant Subunit", 2.0, 8.0, 1080, 10, "Contains aluminum adjuvant. MUST NOT BE FROZEN under any circumstance.")
    ]
    cursor.executemany("""
    INSERT INTO vaccines (name, type, recommended_temp_min, recommended_temp_max, shelf_life_days, doses_per_vial, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, vaccines_data)

    now = datetime.now()

    # 3. Batches
    batches_data = [
        # CityCare Hospital Batches
        (
            "COV-2026-A101", citycare_id, 1, # Covaxin
            (now - timedelta(days=60)).strftime("%Y-%m-%d"),
            (now + timedelta(days=120)).strftime("%Y-%m-%d"),
            1000, 720, "ACTIVE", "Main Cold Room A", ""
        ),
        (
            "COV-2026-A102", citycare_id, 1, # Covaxin near expiry for redistribution demo
            (now - timedelta(days=150)).strftime("%Y-%m-%d"),
            (now + timedelta(days=25)).strftime("%Y-%m-%d"), # Expiring in 25 days!
            500, 380, "ACTIVE", "Secondary Cold Unit", "High Expiry Risk: Exceeds local 25-day burn rate."
        ),
        (
            "CSH-2026-B201", citycare_id, 2, # Covishield
            (now - timedelta(days=40)).strftime("%Y-%m-%d"),
            (now + timedelta(days=140)).strftime("%Y-%m-%d"),
            800, 540, "ACTIVE", "Main Cold Room A", ""
        ),
        (
            "BCG-2026-C301", citycare_id, 3, # BCG
            (now - timedelta(days=30)).strftime("%Y-%m-%d"),
            (now + timedelta(days=330)).strftime("%Y-%m-%d"),
            400, 290, "ACTIVE", "Pediatric Fridge B", ""
        ),
        (
            "MR-2026-D401", citycare_id, 4, # Measles
            (now - timedelta(days=90)).strftime("%Y-%m-%d"),
            (now + timedelta(days=630)).strftime("%Y-%m-%d"),
            600, 480, "ACTIVE", "Pediatric Fridge B", ""
        ),
        (
            "OPV-2026-E501", citycare_id, 5, # OPV
            (now - timedelta(days=20)).strftime("%Y-%m-%d"),
            (now + timedelta(days=700)).strftime("%Y-%m-%d"),
            1200, 950, "ACTIVE", "Main Cold Room A", ""
        ),
        (
            "HEPB-2026-F601", citycare_id, 6, # Hep B (Low stock / shortage)
            (now - timedelta(days=80)).strftime("%Y-%m-%d"),
            (now + timedelta(days=1000)).strftime("%Y-%m-%d"),
            200, 35, "ACTIVE", "Main Cold Room A", "Approaching Reorder Point."
        ),

        # Green Valley Community Health Center Batches
        (
            "GV-COV-101", greenvalley_id, 1, # Covaxin (Critical shortage!)
            (now - timedelta(days=50)).strftime("%Y-%m-%d"),
            (now + timedelta(days=130)).strftime("%Y-%m-%d"),
            300, 25, "ACTIVE", "Clinic Refrigerator 1", "Critical Stockout Risk"
        ),
        (
            "GV-BCG-301", greenvalley_id, 3, # BCG
            (now - timedelta(days=45)).strftime("%Y-%m-%d"),
            (now + timedelta(days=320)).strftime("%Y-%m-%d"),
            250, 180, "ACTIVE", "Clinic Refrigerator 1", ""
        ),
        (
            "GV-HEPB-601", greenvalley_id, 6, # Hep B (Surplus!)
            (now - timedelta(days=20)).strftime("%Y-%m-%d"),
            (now + timedelta(days=900)).strftime("%Y-%m-%d"),
            600, 520, "ACTIVE", "Clinic Refrigerator 1", "Excess Inventory"
        )
    ]
    cursor.executemany("""
    INSERT INTO batches (
        batch_number, facility_id, vaccine_id, manufacture_date, expiry_date,
        initial_doses, current_doses, status, cold_storage_unit, quarantine_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, batches_data)

    # 4. Historical Consumption Records (Past 60 days)
    consumption_records = []
    for day_offset in range(60, 0, -1):
        rec_date = (now - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        dow = (now - timedelta(days=day_offset)).weekday()

        # CityCare consumption (busier hospital)
        base_city_cov = 28 + (5 if dow in [1, 2] else -10 if dow == 6 else 0)
        consumption_records.append((citycare_id, 1, rec_date, max(int(random.gauss(base_city_cov, 4)), 5)))

        base_city_csh = 22 + (4 if dow in [1, 2] else -8 if dow == 6 else 0)
        consumption_records.append((citycare_id, 2, rec_date, max(int(random.gauss(base_city_csh, 3)), 4)))

        base_city_bcg = 12 + (3 if dow == 2 else 0)
        consumption_records.append((citycare_id, 3, rec_date, max(int(random.gauss(base_city_bcg, 2)), 2)))

        base_city_mr = 15 + (4 if dow in [1, 3] else 0)
        consumption_records.append((citycare_id, 4, rec_date, max(int(random.gauss(base_city_mr, 3)), 3)))

        base_city_opv = 35 + (8 if dow == 1 else -15 if dow == 6 else 0)
        consumption_records.append((citycare_id, 5, rec_date, max(int(random.gauss(base_city_opv, 5)), 6)))

        base_city_hepb = 14 + (2 if dow in [2, 4] else 0)
        consumption_records.append((citycare_id, 6, rec_date, max(int(random.gauss(base_city_hepb, 3)), 2)))

        # Green Valley consumption (smaller clinic)
        base_gv_cov = 10 + (3 if dow == 2 else -4 if dow == 6 else 0)
        consumption_records.append((greenvalley_id, 1, rec_date, max(int(random.gauss(base_gv_cov, 2)), 1)))

    cursor.executemany("""
    INSERT INTO vaccine_consumption_history (facility_id, vaccine_id, record_date, doses_administered)
    VALUES (?, ?, ?, ?)
    """, consumption_records)

    # 5. Baseline Thermal Logs for CityCare Cold Storage Hub 1
    # Generate 40 initial optimal readings (every 3 minutes)
    telemetry = generate_burst_telemetry(citycare_id, "Main Cold Room A", "OPTIMAL", count=40, batch_id=1)
    thermal_insert_data = [
        (t["facility_id"], t["batch_id"], t["unit_name"], t["timestamp"], t["temperature"], t["humidity"], t["door_status"], t["power_status"], t["scenario_tag"])
        for t in telemetry
    ]
    cursor.executemany("""
    INSERT INTO thermal_logs (facility_id, batch_id, unit_name, timestamp, temperature, humidity, door_status, power_status, scenario_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, thermal_insert_data)

    # 6. Vaccine Supply Requests
    requests_data = [
        (
            citycare_id, apex_id, 6, # CityCare requesting Hepatitis B (since it is running low)
            300, "URGENT", "PENDING",
            "Immediate replenishment required. Current stock below safety reserve threshold.",
            "", 4.5
        ),
        (
            greenvalley_id, apex_id, 1, # Green Valley requesting Covaxin
            200, "ROUTINE", "APPROVED",
            "Routine quarterly order for upcoming school vaccination drive.",
            "Order verified. Scheduled for cold-pack freight dispatch.", 4.2
        )
    ]
    cursor.executemany("""
    INSERT INTO vaccine_requests (
        requesting_facility_id, manufacturer_id, vaccine_id, requested_doses, priority, status,
        notes, dispatch_notes, transit_temperature
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, requests_data)

    # 7. Redistribution Recommendation
    # Match CityCare's near-expiry Covaxin (Batch COV-2026-A102) with Green Valley's stockout!
    redis_data = [
        (
            citycare_id, greenvalley_id, 2, 1, 200,
            "Impending Expiry Reallocation: CityCare has surplus Covaxin batch expiring in 25 days, while Green Valley is at critical stockout. Transferring 200 doses prevents expiration wastage.",
            "SUGGESTED"
        )
    ]
    cursor.executemany("""
    INSERT INTO redistribution_recommendations (
        source_facility_id, target_facility_id, batch_id, vaccine_id, recommended_doses, reason, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, redis_data)

    # 8. Query Tickets
    queries_data = [
        (
            citycare_id, apex_id,
            "Cold-Chain Transit Temperature Verification for Batch CSH-2026-B201",
            "TEMPERATURE_EXCURSION",
            "Hello Apex Team, could you provide the data logger certification for batch CSH-2026-B201 during interstate transit? Our compliance team requires audit verification.",
            "Data logger report attached. Transit Mean Kinetic Temperature was 4.3°C with zero excursions outside 2°C-8°C.",
            "RESOLVED"
        ),
        (
            greenvalley_id, apex_id,
            "Expedited Delivery Request for Rural Center Allocation",
            "ORDER_STATUS",
            "We have upcoming pediatric camps scheduled next Monday. Can our approved Covaxin order be dispatched with priority cold packaging?",
            "",
            "OPEN"
        )
    ]
    cursor.executemany("""
    INSERT INTO query_tickets (sender_id, recipient_id, subject, category, message, reply, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, queries_data)

    # 9. Manufacturer Production Plans
    production_data = [
        (
            apex_id, 1, 50000,
            (now + timedelta(days=15)).strftime("%Y-%m-%d"),
            "IN_PRODUCTION", "APX-COV-BATCH-99", "Automated vial filling in Cleanroom 3."
        ),
        (
            apex_id, 6, 25000,
            (now + timedelta(days=28)).strftime("%Y-%m-%d"),
            "SCHEDULED", "APX-HEPB-BATCH-42", "Planned for secondary packaging."
        )
    ]
    cursor.executemany("""
    INSERT INTO production_plans (
        manufacturer_id, vaccine_id, planned_doses, target_completion_date, status, batch_code, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, production_data)

    ensure_default_redistribution_history(conn)
    conn.commit()
    conn.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
