import json
import sqlite3
import hashlib
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from .config import settings
from .database import get_db_connection, init_db
from .seed_data import seed_database
from .services.thermal_analyzer import analyze_thermal_records, calculate_mean_kinetic_temperature
from .services.demand_forecaster import forecast_vaccine_demand
from .services.redistribution_engine import generate_redistribution_recommendations
from .services.simulator_service import generate_telemetry_reading, generate_burst_telemetry

app = Flask(__name__)
seed_database()
# Ensure CORS support for React frontend
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,PUT,POST,DELETE,OPTIONS"
    return response

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "project": "Vaccine Distribution Inventory Control System and Cold Storage Thermal Tracking Hub",
        "status": "online",
        "version": "1.0.0",
        "api_docs": "/api/health"
    })

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()})

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================

@app.route("/api/auth/demo-users", methods=["GET"])
def get_demo_users():
    conn = get_db_connection()
    users = conn.execute("SELECT id, email, role, facility_name, facility_type, district, state FROM users").fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid email or facility credentials"}), 401

    if user["password_hash"] != hash_pw(password) and password != "demo":
        return jsonify({"error": "Incorrect password"}), 401

    user_dict = dict(user)
    user_dict.pop("password_hash", None)

    return jsonify({
        "message": "Login successful",
        "token": f"demo-jwt-{user['id']}-{user['role']}",
        "user": user_dict
    })

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "HOSPITAL").upper()
    facility_name = data.get("facility_name", "")
    facility_type = data.get("facility_type", "Hospital")
    district = data.get("district", "Central")
    state = data.get("state", "State")
    contact = data.get("contact_number", "")

    if not email or not password or not facility_name:
        return jsonify({"error": "Email, password, and facility name are required"}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO users (email, password_hash, role, facility_name, facility_type, district, state, contact_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (email, hash_pw(password), role, facility_name, facility_type, district, state, contact))
        new_id = cursor.lastrowid
        conn.commit()

        user = conn.execute("SELECT * FROM users WHERE id = ?", (new_id,)).fetchone()
        conn.close()
        user_dict = dict(user)
        user_dict.pop("password_hash", None)

        return jsonify({
            "message": "Registration successful",
            "token": f"demo-jwt-{new_id}-{role}",
            "user": user_dict
        }), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "User with this email already exists"}), 409

# ==========================================
# INVENTORY & BATCH MANAGEMENT
# ==========================================

@app.route("/api/inventory/vaccines", methods=["GET"])
def get_vaccines():
    conn = get_db_connection()
    vaccines = conn.execute("SELECT * FROM vaccines ORDER BY name ASC").fetchall()
    conn.close()
    return jsonify([dict(v) for v in vaccines])

@app.route("/api/inventory/batches", methods=["GET"])
def get_batches():
    facility_id = request.args.get("facility_id", type=int)
    conn = get_db_connection()
    
    query = """
    SELECT b.*, v.name as vaccine_name, v.type as vaccine_type,
           v.recommended_temp_min, v.recommended_temp_max, v.doses_per_vial
    FROM batches b
    JOIN vaccines v ON b.vaccine_id = v.id
    """
    params = []
    if facility_id:
        query += " WHERE b.facility_id = ?"
        params.append(facility_id)

    query += " ORDER BY b.expiry_date ASC"
    batches = conn.execute(query, params).fetchall()
    conn.close()

    result = []
    now = datetime.now()
    for b in batches:
        b_dict = dict(b)
        try:
            exp_date = datetime.strptime(b_dict["expiry_date"][:10], "%Y-%m-%d")
            days_left = (exp_date - now).days
            b_dict["days_to_expiry"] = days_left
            b_dict["is_expiring_soon"] = days_left <= 45
        except Exception:
            b_dict["days_to_expiry"] = 999
            b_dict["is_expiring_soon"] = False
        result.append(b_dict)

    return jsonify(result)

@app.route("/api/inventory/batches", methods=["POST"])
def create_batch():
    data = request.get_json() or {}
    facility_id = data.get("facility_id")
    vaccine_id = data.get("vaccine_id")
    batch_number = data.get("batch_number", "").strip()
    manufacture_date = data.get("manufacture_date", datetime.now().strftime("%Y-%m-%d"))
    expiry_date = data.get("expiry_date", (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d"))
    initial_doses = data.get("initial_doses", 500)
    current_doses = data.get("current_doses", initial_doses)
    cold_storage_unit = data.get("cold_storage_unit", "Main Cold Room A")

    if not facility_id or not vaccine_id or not batch_number:
        return jsonify({"error": "Facility ID, Vaccine ID, and Batch Number are required"}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO batches (batch_number, facility_id, vaccine_id, manufacture_date, expiry_date, initial_doses, current_doses, cold_storage_unit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (batch_number, facility_id, vaccine_id, manufacture_date, expiry_date, initial_doses, current_doses, cold_storage_unit))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({"message": "Batch added successfully", "batch_id": new_id}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": f"Batch number '{batch_number}' already exists"}), 409

@app.route("/api/inventory/batches/<int:batch_id>/consume", methods=["POST"])
def consume_doses(batch_id):
    data = request.get_json() or {}
    doses = data.get("doses_to_consume", 1)

    conn = get_db_connection()
    batch = conn.execute("SELECT * FROM batches WHERE id = ?", (batch_id,)).fetchone()
    if not batch:
        conn.close()
        return jsonify({"error": "Batch not found"}), 404

    if batch["status"] != "ACTIVE":
        conn.close()
        return jsonify({"error": f"Cannot consume doses: Batch is currently {batch['status']}"}), 400

    new_stock = max(batch["current_doses"] - doses, 0)
    new_status = "DEPLETED" if new_stock == 0 else batch["status"]

    conn.execute("UPDATE batches SET current_doses = ?, status = ? WHERE id = ?", (new_stock, new_status, batch_id))
    
    # Also log into consumption history for today
    today_str = datetime.now().strftime("%Y-%m-%d")
    existing = conn.execute("""
    SELECT id, doses_administered FROM vaccine_consumption_history
    WHERE facility_id = ? AND vaccine_id = ? AND record_date = ?
    """, (batch["facility_id"], batch["vaccine_id"], today_str)).fetchone()

    if existing:
        conn.execute("""
        UPDATE vaccine_consumption_history SET doses_administered = doses_administered + ?
        WHERE id = ?
        """, (doses, existing["id"]))
    else:
        conn.execute("""
        INSERT INTO vaccine_consumption_history (facility_id, vaccine_id, record_date, doses_administered)
        VALUES (?, ?, ?, ?)
        """, (batch["facility_id"], batch["vaccine_id"], today_str, doses))

    conn.commit()
    conn.close()

    return jsonify({"message": "Doses consumed successfully", "current_doses": new_stock, "status": new_status})

@app.route("/api/inventory/batches/<int:batch_id>/quarantine", methods=["POST"])
def quarantine_batch(batch_id):
    data = request.get_json() or {}
    status = data.get("status", "QUARANTINED_HEAT")
    reason = data.get("reason", "Manual Quarantine Action")

    conn = get_db_connection()
    conn.execute("UPDATE batches SET status = ?, quarantine_reason = ? WHERE id = ?", (status, reason, batch_id))
    conn.commit()
    conn.close()
    return jsonify({"message": f"Batch status updated to {status}", "batch_id": batch_id})

@app.route("/api/thermal/dataset-telemetry", methods=["GET"])
def get_dataset_telemetry():
    conn = get_db_connection()
    logs = conn.execute("""
    SELECT * FROM dataset_telemetry_logs
    ORDER BY id ASC
    """).fetchall()
    conn.close()

    if not logs:
        from .load_dataset import import_dataset
        import_dataset()
        conn = get_db_connection()
        logs = conn.execute("SELECT * FROM dataset_telemetry_logs ORDER BY id ASC").fetchall()
        conn.close()

    records = []
    ult_count = 0
    refrig_count = 0
    excursion_count = 0

    for r in logs:
        phase = r["phase_tag"]
        if phase == "ULTRA_LOW_FREEZER":
            ult_count += 1
        elif phase == "REFRIGERATED_STORAGE":
            refrig_count += 1
        else:
            excursion_count += 1

        records.append({
            "id": r["id"],
            "date": r["log_date"],
            "batch_id": r["batch_id"],
            "location": r["location"],
            "current_hop": r["current_hop"],
            "external_storage": r["external_storage"],
            "shipper_temp": r["thermal_shipper_temp"],
            "room_temp": r["room_temp"],
            "room_humidity": r["room_humidity"],
            "item_expiry_hours": r["item_expiry_hours"],
            "ult_hours": r["ult_freezer_hours"],
            "out_of_bound_hours": r["out_of_bound_hours"],
            "refrig_hours": r["refrigeration_hours"],
            "phase": phase
        })

    latest = records[0] if records else {}

    summary = {
        "batch_id": "batch001",
        "location": "Jharkand",
        "total_records": len(records),
        "latest_shipper_temp": latest.get("shipper_temp", 14.0),
        "latest_room_temp": latest.get("room_temp", 22.0),
        "latest_humidity": latest.get("room_humidity", 75.0),
        "current_hop": latest.get("current_hop", "dest_discarded_vaccine_storage_unit"),
        "item_expiry_hours": latest.get("item_expiry_hours", -1),
        "ult_freezer_hours": latest.get("ult_hours", 720),
        "refrigeration_hours": latest.get("refrig_hours", 119),
        "out_of_bound_hours": latest.get("out_of_bound_hours", 1),
        "status": "DISCARDED / QUARANTINED",
        "phase_breakdown": {
            "ultra_low_freezer_readings": ult_count,
            "refrigerated_readings": refrig_count,
            "excursion_discard_readings": excursion_count
        }
    }

    chronological_records = list(reversed(records))

    return jsonify({
        "summary": summary,
        "chronological_records": chronological_records,
        "table_records": records[:100]
    })

@app.route("/api/thermal/logs", methods=["GET"])
def get_thermal_logs():
    facility_id = request.args.get("facility_id", 1, type=int)
    unit_name = request.args.get("unit_name", "Main Cold Room A")
    limit = request.args.get("limit", 40, type=int)

    conn = get_db_connection()
    logs = conn.execute("""
    SELECT * FROM thermal_logs
    WHERE facility_id = ? AND unit_name = ?
    ORDER BY timestamp DESC
    LIMIT ?
    """, (facility_id, unit_name, limit)).fetchall()
    conn.close()

    # Return chronological order (oldest to newest for charting)
    records = [dict(log) for log in reversed(logs)]
    return jsonify(records)

@app.route("/api/thermal/analysis", methods=["GET"])
def get_thermal_analysis():
    facility_id = request.args.get("facility_id", 1, type=int)
    unit_name = request.args.get("unit_name", "Main Cold Room A")

    conn = get_db_connection()
    logs = conn.execute("""
    SELECT temperature, timestamp FROM thermal_logs
    WHERE facility_id = ? AND unit_name = ?
    ORDER BY timestamp DESC
    LIMIT 60
    """, (facility_id, unit_name)).fetchall()
    conn.close()

    log_dicts = [{"temperature": r["temperature"]} for r in reversed(logs)]
    analysis = analyze_thermal_records(log_dicts, safe_min=2.0, safe_max=8.0)
    return jsonify(analysis)

@app.route("/api/thermal/simulate-step", methods=["POST"])
def simulate_single_step():
    data = request.get_json() or {}
    facility_id = data.get("facility_id", 1)
    unit_name = data.get("unit_name", "Main Cold Room A")
    scenario = data.get("scenario", "OPTIMAL")
    batch_id = data.get("batch_id")

    reading = generate_telemetry_reading(scenario=scenario)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO thermal_logs (facility_id, batch_id, unit_name, timestamp, temperature, humidity, door_status, power_status, scenario_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (facility_id, batch_id, unit_name, timestamp, reading["temperature"], reading["humidity"], reading["door_status"], reading["power_status"], reading["scenario_tag"]))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    reading["id"] = new_id
    reading["timestamp"] = timestamp
    reading["unit_name"] = unit_name
    return jsonify(reading)

@app.route("/api/thermal/simulate-burst", methods=["POST"])
def simulate_burst():
    """Generates an entire scenario sequence (e.g. 30 readings) so the user immediately sees the full excursion curve."""
    data = request.get_json() or {}
    facility_id = data.get("facility_id", 1)
    unit_name = data.get("unit_name", "Main Cold Room A")
    scenario = data.get("scenario", "DOOR_AJAR")
    count = data.get("count", 30)

    records = generate_burst_telemetry(facility_id=facility_id, unit_name=unit_name, scenario=scenario, count=count)

    conn = get_db_connection()
    cursor = conn.cursor()
    insert_data = [
        (r["facility_id"], r["batch_id"], r["unit_name"], r["timestamp"], r["temperature"], r["humidity"], r["door_status"], r["power_status"], r["scenario_tag"])
        for r in records
    ]
    cursor.executemany("""
    INSERT INTO thermal_logs (facility_id, batch_id, unit_name, timestamp, temperature, humidity, door_status, power_status, scenario_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, insert_data)
    conn.commit()
    conn.close()

    # Re-evaluate thermal analysis
    log_dicts = [{"temperature": r["temperature"]} for r in records]
    analysis = analyze_thermal_records(log_dicts)

    return jsonify({
        "message": f"Successfully simulated {count} readings under scenario '{scenario}'",
        "scenario": scenario,
        "records_added": count,
        "analysis": analysis
    })

@app.route("/api/thermal/auto-quarantine", methods=["POST"])
def auto_quarantine_unit_batches():
    """Triggered when severe breach occurs: marks all batches stored in the compromised unit as quarantined."""
    data = request.get_json() or {}
    facility_id = data.get("facility_id", 1)
    unit_name = data.get("unit_name", "Main Cold Room A")
    reason = data.get("reason", "Thermal Degradation Breach Detected (MKT Excursion)")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE batches
    SET status = 'QUARANTINED_HEAT', quarantine_reason = ?
    WHERE facility_id = ? AND cold_storage_unit = ? AND status = 'ACTIVE'
    """, (reason, facility_id, unit_name))
    affected_count = cursor.rowcount
    conn.commit()
    conn.close()

    return jsonify({
        "message": f"Quarantine enforced: {affected_count} batch(es) locked.",
        "affected_count": affected_count,
        "unit_name": unit_name
    })

@app.route("/api/thermal/reset", methods=["POST"])
def reset_thermal_hub():
    """Resets the unit back to optimal 4.5°C state and generates clean logs."""
    data = request.get_json() or {}
    facility_id = data.get("facility_id", 1)
    unit_name = data.get("unit_name", "Main Cold Room A")

    conn = get_db_connection()
    conn.execute("DELETE FROM thermal_logs WHERE facility_id = ? AND unit_name = ?", (facility_id, unit_name))
    conn.commit()

    records = generate_burst_telemetry(facility_id, unit_name, "OPTIMAL", count=35)
    cursor = conn.cursor()
    insert_data = [
        (r["facility_id"], r["batch_id"], r["unit_name"], r["timestamp"], r["temperature"], r["humidity"], r["door_status"], r["power_status"], r["scenario_tag"])
        for r in records
    ]
    cursor.executemany("""
    INSERT INTO thermal_logs (facility_id, batch_id, unit_name, timestamp, temperature, humidity, door_status, power_status, scenario_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, insert_data)
    conn.commit()
    conn.close()

    return jsonify({"message": f"Thermal logs for '{unit_name}' reset to optimal baseline."})

# ==========================================
# AI / ML ANALYTICS & DEMAND FORECASTING
# ==========================================

@app.route("/api/analytics/demand-forecast", methods=["GET"])
def get_demand_forecast():
    facility_id = request.args.get("facility_id", 1, type=int)
    vaccine_id = request.args.get("vaccine_id", 1, type=int)

    conn = get_db_connection()
    # Vaccine details
    vaccine = conn.execute("SELECT * FROM vaccines WHERE id = ?", (vaccine_id,)).fetchone()
    if not vaccine:
        conn.close()
        return jsonify({"error": "Vaccine not found"}), 404

    # Current available stock
    stock_row = conn.execute("""
    SELECT COALESCE(SUM(current_doses), 0) as total_stock
    FROM batches
    WHERE facility_id = ? AND vaccine_id = ? AND status = 'ACTIVE'
    """, (facility_id, vaccine_id)).fetchone()
    current_stock = stock_row["total_stock"] if stock_row else 0

    # Historical consumption records
    history = conn.execute("""
    SELECT record_date, doses_administered
    FROM vaccine_consumption_history
    WHERE facility_id = ? AND vaccine_id = ?
    ORDER BY record_date ASC
    """, (facility_id, vaccine_id)).fetchall()
    conn.close()

    history_dicts = [dict(h) for h in history]
    forecast = forecast_vaccine_demand(history_dicts, current_stock, forecast_days=30)

    forecast["vaccine_id"] = vaccine_id
    forecast["vaccine_name"] = vaccine["name"]
    forecast["vaccine_type"] = vaccine["type"]
    forecast["current_stock"] = current_stock

    return jsonify(forecast)

@app.route("/api/analytics/stock-status", methods=["GET"])
def get_stock_status():
    facility_id = request.args.get("facility_id", 1, type=int)
    conn = get_db_connection()

    vaccines = conn.execute("SELECT * FROM vaccines").fetchall()
    items = []

    for v in vaccines:
        v_id = v["id"]
        # Total active stock
        stock = conn.execute("""
        SELECT COALESCE(SUM(current_doses), 0) as total
        FROM batches
        WHERE facility_id = ? AND vaccine_id = ? AND status = 'ACTIVE'
        """, (facility_id, v_id)).fetchone()["total"]

        # Average daily consumption (past 30 days)
        burn_row = conn.execute("""
        SELECT AVG(doses_administered) as avg_burn
        FROM vaccine_consumption_history
        WHERE facility_id = ? AND vaccine_id = ?
        """, (facility_id, v_id)).fetchone()
        avg_burn = round(burn_row["avg_burn"] or 20.0, 1)

        days_supply = round(stock / avg_burn, 1) if avg_burn > 0 else 999.0

        # Safety Stock = 7 days of consumption; Reorder Point = 14 days
        safety_stock = int(avg_burn * 7)
        reorder_point = int(avg_burn * 14)

        if days_supply < 12:
            status = "CRITICAL_SHORTAGE"
        elif days_supply < 20:
            status = "LOW_STOCK"
        elif days_supply > 65:
            status = "EXCESS_STOCK"
        else:
            status = "OPTIMAL"

        # Count near expiry batches
        expiry_risk_count = conn.execute("""
        SELECT COUNT(*) as cnt FROM batches
        WHERE facility_id = ? AND vaccine_id = ? AND status = 'ACTIVE'
        AND date(expiry_date) <= date('now', '+45 days')
        """, (facility_id, v_id)).fetchone()["cnt"]

        items.append({
            "vaccine_id": v_id,
            "vaccine_name": v["name"],
            "current_stock": stock,
            "daily_burn_rate": avg_burn,
            "days_of_supply_remaining": days_supply,
            "safety_stock_threshold": safety_stock,
            "reorder_point": reorder_point,
            "status": status,
            "expiry_risk_batches_count": expiry_risk_count
        })

    conn.close()
    return jsonify(items)

@app.route("/api/analytics/expiry-risk", methods=["GET"])
def get_expiry_risk():
    facility_id = request.args.get("facility_id", 1, type=int)
    conn = get_db_connection()

    batches = conn.execute("""
    SELECT b.*, v.name as vaccine_name
    FROM batches b
    JOIN vaccines v ON b.vaccine_id = v.id
    WHERE b.facility_id = ? AND b.status = 'ACTIVE'
    ORDER BY b.expiry_date ASC
    """, (facility_id,)).fetchall()

    result = []
    now = datetime.now()

    for b in batches:
        b_dict = dict(b)
        exp_dt = datetime.strptime(b_dict["expiry_date"][:10], "%Y-%m-%d")
        days_to_exp = (exp_dt - now).days

        # Get avg burn rate for this vaccine
        burn_row = conn.execute("""
        SELECT AVG(doses_administered) as avg_burn
        FROM vaccine_consumption_history
        WHERE facility_id = ? AND vaccine_id = ?
        """, (facility_id, b_dict["vaccine_id"])).fetchone()
        avg_burn = burn_row["avg_burn"] or 20.0

        days_to_deplete = round(b_dict["current_doses"] / avg_burn, 1)

        is_risk = (days_to_exp < days_to_deplete) or (days_to_exp <= 45)

        b_dict["days_to_expiry"] = days_to_exp
        b_dict["estimated_days_to_deplete"] = days_to_deplete
        b_dict["expiry_risk_level"] = "HIGH" if (days_to_exp < days_to_deplete) else ("MODERATE" if days_to_exp <= 60 else "LOW")
        b_dict["recommended_fefo_priority"] = 1 if is_risk else 2

        result.append(b_dict)

    conn.close()
    return jsonify(result)

# ==========================================
# VACCINE ORDER REQUESTS PIPELINE
# ==========================================

@app.route("/api/requests", methods=["GET"])
def get_requests():
    facility_id = request.args.get("facility_id", type=int)
    role = request.args.get("role", "HOSPITAL").upper()

    conn = get_db_connection()
    if role == "MANUFACTURER":
        query = """
        SELECT r.*, v.name as vaccine_name, u.facility_name as requesting_facility_name, u.district as requesting_district
        FROM vaccine_requests r
        JOIN vaccines v ON r.vaccine_id = v.id
        JOIN users u ON r.requesting_facility_id = u.id
        ORDER BY r.created_at DESC
        """
        rows = conn.execute(query).fetchall()
    else:
        query = """
        SELECT r.*, v.name as vaccine_name, m.facility_name as manufacturer_name
        FROM vaccine_requests r
        JOIN vaccines v ON r.vaccine_id = v.id
        LEFT JOIN users m ON r.manufacturer_id = m.id
        WHERE r.requesting_facility_id = ?
        ORDER BY r.created_at DESC
        """
        rows = conn.execute(query, (facility_id,)).fetchall()

    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/requests", methods=["POST"])
def create_request():
    data = request.get_json() or {}
    facility_id = data.get("facility_id")
    vaccine_id = data.get("vaccine_id")
    requested_doses = data.get("requested_doses", 100)
    priority = data.get("priority", "ROUTINE").upper()
    notes = data.get("notes", "")

    conn = get_db_connection()
    # Find manufacturer ID (Apex Biologics)
    mfg = conn.execute("SELECT id FROM users WHERE role = 'MANUFACTURER' LIMIT 1").fetchone()
    mfg_id = mfg["id"] if mfg else None

    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO vaccine_requests (requesting_facility_id, manufacturer_id, vaccine_id, requested_doses, priority, status, notes)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
    """, (facility_id, mfg_id, vaccine_id, requested_doses, priority, notes))
    req_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"message": "Vaccine request submitted successfully", "request_id": req_id}), 201

@app.route("/api/requests/<int:request_id>/update-status", methods=["POST"])
def update_request_status(request_id):
    data = request.get_json() or {}
    new_status = data.get("status", "APPROVED").upper()
    dispatch_notes = data.get("dispatch_notes", "")
    transit_temp = data.get("transit_temperature", 4.5)

    conn = get_db_connection()
    req = conn.execute("SELECT * FROM vaccine_requests WHERE id = ?", (request_id,)).fetchone()
    if not req:
        conn.close()
        return jsonify({"error": "Request not found"}), 404

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("""
    UPDATE vaccine_requests
    SET status = ?, dispatch_notes = ?, transit_temperature = ?, updated_at = ?
    WHERE id = ?
    """, (new_status, dispatch_notes, transit_temp, now_str, request_id))

    # If status is set to DELIVERED, automatically add a new batch to the hospital inventory!
    if new_status == "DELIVERED":
        new_batch_num = f"DISP-{datetime.now().strftime('%Y%m%d')}-{request_id}"
        conn.execute("""
        INSERT INTO batches (
            batch_number, facility_id, vaccine_id, manufacture_date, expiry_date,
            initial_doses, current_doses, status, cold_storage_unit, quarantine_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'Main Cold Room A', '')
        """, (
            new_batch_num, req["requesting_facility_id"], req["vaccine_id"],
            datetime.now().strftime("%Y-%m-%d"),
            (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d"),
            req["requested_doses"], req["requested_doses"]
        ))

    conn.commit()
    conn.close()

    return jsonify({"message": f"Order status updated to {new_status}", "request_id": request_id})

# ==========================================
# REDISTRIBUTION OPTIMIZER
# ==========================================

@app.route("/api/redistribution/recommendations", methods=["GET"])
def get_redistributions():
    conn = get_db_connection()
    # Fetch active recommendations
    recs = conn.execute("""
    SELECT r.*, v.name as vaccine_name, b.batch_number,
           s.facility_name as source_facility_name, s.district as source_district,
           t.facility_name as target_facility_name, t.district as target_district
    FROM redistribution_recommendations r
    JOIN vaccines v ON r.vaccine_id = v.id
    JOIN batches b ON r.batch_id = b.id
    JOIN users s ON r.source_facility_id = s.id
    JOIN users t ON r.target_facility_id = t.id
    ORDER BY r.created_at DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in recs])

@app.route("/api/redistribution/available-stock", methods=["GET"])
def get_redistribution_available_stock():
    facility_id = request.args.get("facility_id", type=int)
    if not facility_id:
        return jsonify({"error": "A hospital facility ID is required"}), 400

    conn = get_db_connection()
    facility = conn.execute(
        "SELECT id FROM users WHERE id = ? AND role = 'HOSPITAL'", (facility_id,)
    ).fetchone()
    if not facility:
        conn.close()
        return jsonify({"error": "Hospital facility not found"}), 404

    stock = conn.execute("""
    SELECT b.id AS batch_id, b.facility_id AS source_facility_id,
           u.facility_name AS source_facility_name, u.district AS source_district,
           b.batch_number, b.vaccine_id, v.name AS vaccine_name,
           b.current_doses AS available_doses, b.expiry_date
    FROM batches b
    JOIN users u ON b.facility_id = u.id
    JOIN vaccines v ON b.vaccine_id = v.id
    WHERE u.role = 'HOSPITAL' AND b.facility_id != ?
      AND b.status = 'ACTIVE' AND b.current_doses > 0
    ORDER BY v.name, u.facility_name, b.expiry_date
    """, (facility_id,)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in stock])

@app.route("/api/redistribution/requests", methods=["POST"])
def create_redistribution_request():
    data = request.get_json() or {}
    try:
        requester_id = int(data.get("facility_id"))
        batch_id = int(data.get("batch_id"))
        requested_doses = int(data.get("requested_doses"))
    except (TypeError, ValueError):
        return jsonify({"error": "Facility, batch, and requested doses are required"}), 400

    if requested_doses <= 0:
        return jsonify({"error": "Requested doses must be greater than zero"}), 400

    conn = get_db_connection()
    requester = conn.execute(
        "SELECT id FROM users WHERE id = ? AND role = 'HOSPITAL'", (requester_id,)
    ).fetchone()
    if not requester:
        conn.close()
        return jsonify({"error": "Hospital facility not found"}), 404

    batch = conn.execute("""
    SELECT b.*, u.role AS source_role
    FROM batches b
    JOIN users u ON b.facility_id = u.id
    WHERE b.id = ?
    """, (batch_id,)).fetchone()
    if not batch or batch["source_role"] != "HOSPITAL" or batch["status"] != "ACTIVE":
        conn.close()
        return jsonify({"error": "Active hospital stock was not found"}), 404
    if batch["facility_id"] == requester_id:
        conn.close()
        return jsonify({"error": "Choose stock from another hospital"}), 400
    if requested_doses > batch["current_doses"]:
        conn.close()
        return jsonify({"error": "Requested doses exceed the available batch stock"}), 400

    reason = (data.get("reason") or "").strip()
    if not reason:
        reason = "Vaccine transfer requested by another hospital."

    cursor = conn.execute("""
    INSERT INTO redistribution_recommendations (
        source_facility_id, target_facility_id, batch_id, vaccine_id,
        recommended_doses, reason, status
    ) VALUES (?, ?, ?, ?, ?, ?, 'REQUESTED')
    """, (
        batch["facility_id"], requester_id, batch_id, batch["vaccine_id"],
        requested_doses, reason
    ))
    conn.commit()
    request_id = cursor.lastrowid
    conn.close()
    return jsonify({"message": "Vaccine request sent to the source hospital.", "request_id": request_id}), 201

@app.route("/api/redistribution/recommendations/<int:rec_id>/action", methods=["POST"])
def action_redistribution(rec_id):
    data = request.get_json() or {}
    action = data.get("action", "ACCEPT").upper()
    actor_id = data.get("facility_id")

    conn = get_db_connection()
    rec = conn.execute("SELECT * FROM redistribution_recommendations WHERE id = ?", (rec_id,)).fetchone()
    if not rec:
        conn.close()
        return jsonify({"error": "Recommendation not found"}), 404

    if rec["status"] == "REQUESTED":
        if actor_id != rec["source_facility_id"]:
            conn.close()
            return jsonify({"error": "Only the source hospital can respond to this request"}), 403
        if action == "REJECT":
            conn.execute(
                "UPDATE redistribution_recommendations SET status = 'REJECTED' WHERE id = ?",
                (rec_id,),
            )
            msg = "Vaccine request rejected."
        elif action == "ACCEPT":
            batch = conn.execute("SELECT * FROM batches WHERE id = ?", (rec["batch_id"],)).fetchone()
            if not batch or batch["current_doses"] < rec["recommended_doses"]:
                conn.close()
                return jsonify({"error": "The source batch no longer has enough doses"}), 409

            conn.execute(
                "UPDATE batches SET current_doses = current_doses - ? WHERE id = ?",
                (rec["recommended_doses"], rec["batch_id"]),
            )
            new_batch_num = f"REDIST-{batch['batch_number']}-{rec_id}"
            conn.execute("""
            INSERT INTO batches (
                batch_number, facility_id, vaccine_id, manufacture_date, expiry_date,
                initial_doses, current_doses, status, cold_storage_unit, quarantine_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'Clinic Refrigerator 1', 'Transferred through hospital request')
            """, (
                new_batch_num, rec["target_facility_id"], rec["vaccine_id"],
                batch["manufacture_date"], batch["expiry_date"],
                rec["recommended_doses"], rec["recommended_doses"],
            ))
            conn.execute(
                "UPDATE redistribution_recommendations SET status = 'COMPLETED' WHERE id = ?",
                (rec_id,),
            )
            msg = f"Transfer accepted: {rec['recommended_doses']} doses reallocated successfully."
        else:
            conn.close()
            return jsonify({"error": "Action must be ACCEPT or REJECT"}), 400

        conn.commit()
        conn.close()
        return jsonify({"message": msg})

    if rec["status"] != "SUGGESTED":
        conn.close()
        return jsonify({"error": "This redistribution is no longer awaiting action"}), 409
    if action == "ACCEPT":
        batch = conn.execute("SELECT * FROM batches WHERE id = ?", (rec["batch_id"],)).fetchone()
        transfer_doses = min(rec["recommended_doses"], batch["current_doses"])
        conn.execute("UPDATE batches SET current_doses = current_doses - ? WHERE id = ?", (transfer_doses, rec["batch_id"]))

        # Create new receiving batch at target facility
        new_batch_num = f"REDIST-{batch['batch_number']}"
        conn.execute("""
        INSERT INTO batches (
            batch_number, facility_id, vaccine_id, manufacture_date, expiry_date,
            initial_doses, current_doses, status, cold_storage_unit, quarantine_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'Clinic Refrigerator 1', 'Transferred via Smart Redistribution')
        """, (new_batch_num, rec["target_facility_id"], rec["vaccine_id"], batch["manufacture_date"], batch["expiry_date"], transfer_doses, transfer_doses))

        conn.execute("UPDATE redistribution_recommendations SET status = 'COMPLETED' WHERE id = ?", (rec_id,))
        msg = f"Transfer accepted: {transfer_doses} doses reallocated successfully."
    elif action == "DISMISS":
        conn.execute("UPDATE redistribution_recommendations SET status = 'DISMISSED' WHERE id = ?", (rec_id,))
        msg = "Recommendation dismissed."
    elif rec["status"] == "SUGGESTED":
        conn.close()
        return jsonify({"error": "Action must be ACCEPT or DISMISS"}), 400

    conn.commit()
    conn.close()
    return jsonify({"message": msg})

# ==========================================
# QUERY & SUPPORT TICKETS
# ==========================================

@app.route("/api/queries", methods=["GET"])
def get_queries():
    facility_id = request.args.get("facility_id", type=int)
    role = request.args.get("role", "HOSPITAL").upper()

    conn = get_db_connection()
    if role == "MANUFACTURER":
        query = """
        SELECT q.*, s.facility_name as sender_name, s.role as sender_role
        FROM query_tickets q
        JOIN users s ON q.sender_id = s.id
        ORDER BY q.created_at DESC
        """
        rows = conn.execute(query).fetchall()
    else:
        query = """
        SELECT q.*, s.facility_name as sender_name, r.facility_name as recipient_name
        FROM query_tickets q
        JOIN users s ON q.sender_id = s.id
        LEFT JOIN users r ON q.recipient_id = r.id
        WHERE q.sender_id = ?
        ORDER BY q.created_at DESC
        """
        rows = conn.execute(query, (facility_id,)).fetchall()

    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/queries", methods=["POST"])
def create_query():
    data = request.get_json() or {}
    sender_id = data.get("sender_id")
    recipient_id = data.get("recipient_id")
    subject = data.get("subject", "")
    category = data.get("category", "GENERAL")
    message = data.get("message", "")

    if not sender_id or not subject or not message:
        return jsonify({"error": "Sender ID, subject, and message are required"}), 400

    conn = get_db_connection()
    if not recipient_id:
        mfg = conn.execute("SELECT id FROM users WHERE role = 'MANUFACTURER' LIMIT 1").fetchone()
        recipient_id = mfg["id"] if mfg else None

    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO query_tickets (sender_id, recipient_id, subject, category, message, status)
    VALUES (?, ?, ?, ?, ?, 'OPEN')
    """, (sender_id, recipient_id, subject, category, message))
    q_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"message": "Query ticket created", "ticket_id": q_id}), 201

@app.route("/api/queries/<int:query_id>/reply", methods=["POST"])
def reply_query(query_id):
    data = request.get_json() or {}
    reply = data.get("reply", "")
    status = data.get("status", "RESOLVED")

    conn = get_db_connection()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("""
    UPDATE query_tickets
    SET reply = ?, status = ?, updated_at = ?
    WHERE id = ?
    """, (reply, status, now_str, query_id))
    conn.commit()
    conn.close()

    return jsonify({"message": "Reply saved and ticket updated", "ticket_id": query_id})

# ==========================================
# MANUFACTURER SPECIALIZED ENDPOINTS
# ==========================================

@app.route("/api/manufacturer/aggregate-demand", methods=["GET"])
def get_aggregate_demand():
    """Aggregates demand across all hospitals to assist manufacturer production planning."""
    conn = get_db_connection()
    vaccines = conn.execute("SELECT * FROM vaccines").fetchall()
    results = []

    for v in vaccines:
        v_id = v["id"]
        # Total consumption across all facilities in last 30 days
        hist = conn.execute("""
        SELECT SUM(doses_administered) as total_30_days, AVG(doses_administered) as avg_burn
        FROM vaccine_consumption_history
        WHERE vaccine_id = ?
        """, (v_id,)).fetchone()

        avg_daily = float(hist["avg_burn"] or 30.0)
        proj_30 = int(avg_daily * 30 * 1.15) # 15% seasonal surge buffer
        proj_90 = int(avg_daily * 90 * 1.15)

        # Pending hospital order requests for this vaccine
        pending_orders = conn.execute("""
        SELECT COALESCE(SUM(requested_doses), 0) as pending_doses
        FROM vaccine_requests
        WHERE vaccine_id = ? AND status IN ('PENDING', 'APPROVED')
        """, (v_id,)).fetchone()["pending_doses"]

        # Current manufacturer production planned
        in_prod = conn.execute("""
        SELECT COALESCE(SUM(planned_doses), 0) as prod_doses
        FROM production_plans
        WHERE vaccine_id = ? AND status IN ('SCHEDULED', 'IN_PRODUCTION')
        """, (v_id,)).fetchone()["prod_doses"]

        results.append({
            "vaccine_id": v_id,
            "vaccine_name": v["name"],
            "vaccine_type": v["type"],
            "monthly_burn_rate": int(hist["total_30_days"] or 900),
            "projected_demand_30d": proj_30,
            "projected_demand_90d": proj_90,
            "pending_hospital_orders": pending_orders,
            "units_in_production": in_prod,
            "recommended_batch_size": max(proj_30 * 2, 5000),
            "production_urgency": "HIGH" if pending_orders > in_prod else "NORMAL"
        })

    conn.close()
    return jsonify(results)

@app.route("/api/manufacturer/production-plans", methods=["GET"])
def get_production_plans():
    conn = get_db_connection()
    plans = conn.execute("""
    SELECT p.*, v.name as vaccine_name, v.type as vaccine_type
    FROM production_plans p
    JOIN vaccines v ON p.vaccine_id = v.id
    ORDER BY p.target_completion_date ASC
    """).fetchall()
    conn.close()
    return jsonify([dict(p) for p in plans])

@app.route("/api/manufacturer/production-plans", methods=["POST"])
def create_production_plan():
    data = request.get_json() or {}
    mfg_id = data.get("manufacturer_id", 3)
    vaccine_id = data.get("vaccine_id")
    planned_doses = data.get("planned_doses", 20000)
    target_date = data.get("target_completion_date", (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%d"))
    batch_code = data.get("batch_code", f"APX-BATCH-{datetime.now().strftime('%m%d')}")
    notes = data.get("notes", "")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO production_plans (manufacturer_id, vaccine_id, planned_doses, target_completion_date, status, batch_code, notes)
    VALUES (?, ?, ?, ?, 'SCHEDULED', ?, ?)
    """, (mfg_id, vaccine_id, planned_doses, target_date, batch_code, notes))
    p_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"message": "Production plan scheduled", "plan_id": p_id}), 201

@app.route("/api/manufacturer/inventory-requirements", methods=["GET"])
def get_inventory_requirements():
    """Calculates required vials, stoppers, cold-chain boxes for upcoming production."""
    conn = get_db_connection()
    plans = conn.execute("""
    SELECT p.*, v.name as vaccine_name, v.doses_per_vial
    FROM production_plans p
    JOIN vaccines v ON p.vaccine_id = v.id
    WHERE p.status IN ('SCHEDULED', 'IN_PRODUCTION')
    """).fetchall()
    conn.close()

    items = []
    total_doses = 0
    for p in plans:
        doses = p["planned_doses"]
        dpv = p["doses_per_vial"] or 10
        vials_needed = doses // dpv
        total_doses += doses

        items.append({
            "plan_id": p["id"],
            "batch_code": p["batch_code"],
            "vaccine_name": p["vaccine_name"],
            "planned_doses": doses,
            "vials_required": vials_needed,
            "elastomer_stoppers_required": vials_needed,
            "aluminum_seals_required": vials_needed,
            "isothermal_shipping_boxes": max(vials_needed // 50, 1),
            "target_date": p["target_completion_date"],
            "status": p["status"]
        })

    summary = {
        "total_planned_doses": total_doses,
        "total_glass_vials_needed": sum(i["vials_required"] for i in items),
        "total_cold_boxes_needed": sum(i["isothermal_shipping_boxes"] for i in items),
        "buffer_raw_material_readiness": "94% (Sufficient for Q4)",
        "requirements": items
    }
    return jsonify(summary)

if __name__ == "__main__":
    # Ensure tables and seed data exist
    seed_database()
    print("Starting Vaccine Distribution API on http://127.0.0.1:5000 ...")
    app.run(host="127.0.0.1", port=5000, debug=False, threaded=True)
