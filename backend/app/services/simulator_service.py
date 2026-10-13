import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

def generate_telemetry_reading(
    scenario: str = "OPTIMAL",
    step_index: int = 0,
    total_steps: int = 30,
    previous_temp: Optional[float] = None
) -> Dict[str, Any]:
    """
    Simulates a physical cold-storage refrigeration unit under different thermodynamic scenarios.
    """
    scenario = scenario.upper()

    if scenario == "OPTIMAL":
        # Normal refrigeration around 4.5°C +/- 0.6°C
        temp = round(4.5 + random.gauss(0, 0.4), 2)
        temp = max(min(temp, 6.5), 2.5)  # Constrain inside safe band
        door_status = "CLOSED"
        power_status = "MAINS"
        humidity = round(48.0 + random.uniform(-3, 3), 1)

    elif scenario == "DOOR_AJAR":
        # Spikes up to 10°C - 12°C during door opening, then slowly recovers if closed
        # First half of steps: door open and heating up
        half = total_steps // 2
        if step_index < half:
            progress = step_index / max(half, 1)
            temp = round(4.5 + (progress * 6.5) + random.uniform(-0.3, 0.4), 2)
            door_status = "OPEN"
        else:
            # Recovery phase after door closed
            recovery_prog = (step_index - half) / max(half, 1)
            temp = round(11.0 - (recovery_prog * 4.5) + random.uniform(-0.3, 0.3), 2)
            door_status = "CLOSED"
        power_status = "MAINS"
        humidity = round(65.0 + random.uniform(-4, 4), 1)

    elif scenario == "POWER_FAILURE":
        # Thermal decay toward ambient room temp (24°C)
        progress = min(step_index / max(total_steps, 1), 1.0)
        # Exponential curve: T(t) = T_ambient - (T_ambient - T_0)*exp(-k*t)
        temp = round(4.5 + (20.0 * (progress ** 0.8)) + random.uniform(-0.2, 0.3), 2)
        door_status = "CLOSED"
        power_status = "FAILURE"
        humidity = round(52.0 + random.uniform(-2, 2), 1)

    elif scenario == "FREEZE_EXCURSION":
        # Thermostat defect: freezing excursion drops below 0°C (critical for vaccines!)
        progress = min(step_index / max(total_steps, 1), 1.0)
        temp = round(3.5 - (progress * 6.0) + random.uniform(-0.2, 0.2), 2)
        door_status = "CLOSED"
        power_status = "MAINS"
        humidity = round(42.0 + random.uniform(-2, 2), 1)

    else:
        temp = 4.5
        door_status = "CLOSED"
        power_status = "MAINS"
        humidity = 50.0

    return {
        "temperature": temp,
        "humidity": humidity,
        "door_status": door_status,
        "power_status": power_status,
        "scenario_tag": scenario
    }


def generate_burst_telemetry(
    facility_id: int,
    unit_name: str = "Cold Storage Hub 1",
    scenario: str = "OPTIMAL",
    count: int = 30,
    batch_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Generates a continuous sequence of readings over time (e.g. sampled every 2 minutes)
    to immediately populate charts with realistic curves.
    """
    records = []
    now = datetime.now()
    start_time = now - timedelta(minutes=count * 2)

    for i in range(count):
        reading_time = start_time + timedelta(minutes=i * 2)
        data = generate_telemetry_reading(scenario, step_index=i, total_steps=count)
        records.append({
            "facility_id": facility_id,
            "batch_id": batch_id,
            "unit_name": unit_name,
            "timestamp": reading_time.strftime("%Y-%m-%d %H:%M:%S"),
            "temperature": data["temperature"],
            "humidity": data["humidity"],
            "door_status": data["door_status"],
            "power_status": data["power_status"],
            "scenario_tag": data["scenario_tag"]
        })

    return records
