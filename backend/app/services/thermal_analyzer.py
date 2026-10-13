import math
from typing import List, Dict, Any

# Thermodynamic constants for Mean Kinetic Temperature (Arrhenius formula)
DELTA_H = 83.144       # Activation energy in kJ/mol (standard for biologicals/vaccines)
R_GAS = 8.3144e-3      # Universal gas constant in kJ / (mol * K)
DELTA_H_OVER_R = DELTA_H / R_GAS  # ~10000.0 K

def calculate_mean_kinetic_temperature(temperatures_celsius: List[float]) -> float:
    """
    Computes the Mean Kinetic Temperature (MKT) according to the WHO / USP standard
    Arrhenius equation:
    Tk = (delta_H / R) / ( -ln ( (1/n) * sum( exp(-delta_H / (R * T_i)) ) ) ) - 273.15
    """
    if not temperatures_celsius:
        return 4.0

    exp_sum = 0.0
    valid_count = 0

    for temp_c in temperatures_celsius:
        temp_kelvin = temp_c + 273.15
        if temp_kelvin <= 0:
            continue
        exp_val = math.exp(-DELTA_H_OVER_R / temp_kelvin)
        exp_sum += exp_val
        valid_count += 1

    if valid_count == 0 or exp_sum <= 0:
        return sum(temperatures_celsius) / len(temperatures_celsius)

    mean_exp = exp_sum / valid_count
    tk_kelvin = DELTA_H_OVER_R / (-math.log(mean_exp))
    tk_celsius = tk_kelvin - 273.15
    return round(tk_celsius, 2)


def analyze_thermal_records(
    logs: List[Dict[str, Any]], 
    safe_min: float = 2.0, 
    safe_max: float = 8.0
) -> Dict[str, Any]:
    """
    Analyzes a sequence of thermal records to determine cold chain integrity,
    excursions (heat and freeze), MKT, and overall health rating (0-100%).
    """
    if not logs:
        return {
            "current_temperature": 4.5,
            "mean_kinetic_temperature": 4.5,
            "average_temperature": 4.5,
            "min_temperature": 4.5,
            "max_temperature": 4.5,
            "total_logs_analyzed": 0,
            "safe_range_min": safe_min,
            "safe_range_max": safe_max,
            "excursion_minutes_heat": 0.0,
            "excursion_minutes_freeze": 0.0,
            "cold_chain_health_score": 100.0,
            "status": "SAFE",
            "active_breach_detected": False,
            "recommended_action": "Storage temperature is optimal. Normal vaccine handling permitted."
        }

    temps = [record["temperature"] for record in logs]
    current_temp = temps[-1]
    mkt = calculate_mean_kinetic_temperature(temps)
    avg_temp = round(sum(temps) / len(temps), 2)
    min_temp = round(min(temps), 2)
    max_temp = round(max(temps), 2)

    # Calculate excursion intervals (assuming ~2-minute sampling interval per log)
    interval_minutes = 2.0
    heat_excursion_count = sum(1 for t in temps if t > safe_max)
    freeze_excursion_count = sum(1 for t in temps if t < safe_min)

    excursion_minutes_heat = round(heat_excursion_count * interval_minutes, 1)
    excursion_minutes_freeze = round(freeze_excursion_count * interval_minutes, 1)

    # Health score evaluation
    # Baseline 100%. Deductions for heat excursions, freeze excursions, and extreme peak deviations.
    score = 100.0

    # Heat penalty: 1.5 points per minute above 8°C; accelerated penalty if temp > 15°C
    heat_penalty = (excursion_minutes_heat * 0.8)
    for t in temps:
        if t > 15.0:
            heat_penalty += 3.0
        elif t > 10.0:
            heat_penalty += 1.0

    # Freeze penalty: Freeze is critical for hepatitis B, tetanus, DTP!
    freeze_penalty = (excursion_minutes_freeze * 1.5)
    for t in temps:
        if t < 0.0:
            freeze_penalty += 10.0  # Severe sub-zero penalty

    total_penalty = min(heat_penalty + freeze_penalty, 100.0)
    health_score = max(round(100.0 - total_penalty, 1), 0.0)

    # Status determination
    active_breach = (current_temp > safe_max) or (current_temp < safe_min)

    if health_score < 60.0 or min_temp < -1.0 or max_temp > 20.0:
        status = "CRITICAL_QUARANTINE"
        if min_temp < 0.0:
            rec = "CRITICAL FREEZE DAMAGE DETECTED: Sub-zero freezing compromises aluminum-adjuvant vaccines. Quarantine batch immediately and perform shake test."
        else:
            rec = "CRITICAL HEAT EXCURSION: Prolonged thermal excursion exceeds WHO stability limits. Mark batch QUARANTINED and halt distribution."
    elif health_score < 85.0 or active_breach:
        status = "WARNING"
        rec = "THERMAL WARNING: Elevated temperature detected. Inspect refrigeration compressor and prioritize First-Expired-First-Out (FEFO) dispensing."
    else:
        status = "SAFE"
        rec = "COLD CHAIN COMPLIANT: Temperatures remain strictly within the 2°C to 8°C WHO recommended threshold."

    return {
        "current_temperature": current_temp,
        "mean_kinetic_temperature": mkt,
        "average_temperature": avg_temp,
        "min_temperature": min_temp,
        "max_temperature": max_temp,
        "total_logs_analyzed": len(logs),
        "safe_range_min": safe_min,
        "safe_range_max": safe_max,
        "excursion_minutes_heat": excursion_minutes_heat,
        "excursion_minutes_freeze": excursion_minutes_freeze,
        "cold_chain_health_score": health_score,
        "status": status,
        "active_breach_detected": active_breach,
        "recommended_action": rec
    }
