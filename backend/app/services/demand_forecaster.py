import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any

def forecast_vaccine_demand(
    history_records: List[Dict[str, Any]], 
    current_stock: int, 
    forecast_days: int = 30
) -> Dict[str, Any]:
    """
    Predicts future vaccine consumption for 7, 30, and 90 days ahead
    using trend regression + day-of-week seasonality factors.
    """
    if not history_records:
        # Fallback to standard baseline if no history
        baseline_daily = 35.0
        forecast_7 = int(baseline_daily * 7)
        forecast_30 = int(baseline_daily * 30)
        forecast_90 = int(baseline_daily * 90)
        projections = []
        base_date = datetime.now()
        for i in range(1, forecast_days + 1):
            proj_date = base_date + timedelta(days=i)
            projections.append({
                "date": proj_date.strftime("%Y-%m-%d"),
                "predicted_doses": int(baseline_daily),
                "confidence_lower": int(baseline_daily * 0.85),
                "confidence_upper": int(baseline_daily * 1.15),
                "trend": "Stable"
            })
        return {
            "average_daily_consumption": baseline_daily,
            "forecast_7_days": forecast_7,
            "forecast_30_days": forecast_30,
            "forecast_90_days": forecast_90,
            "days_of_stock_remaining": round(current_stock / baseline_daily, 1),
            "shortage_risk": "BALANCED",
            "daily_projections": projections
        }

    # Extract doses and dates
    doses = [r["doses_administered"] for r in history_records]
    n = len(doses)
    
    # 1. Trend fitting (Linear model: y = mx + c)
    x = np.arange(n)
    y = np.array(doses, dtype=float)
    if n > 1:
        slope, intercept = np.polyfit(x, y, 1)
    else:
        slope, intercept = 0.0, float(doses[0])

    avg_consumption = max(float(np.mean(y)), 5.0)

    # 2. Day of week seasonal indices (0=Monday, 6=Sunday)
    # Medical centers typically have peak vaccination on mid-week, lower on weekends
    dow_multipliers = {
        0: 1.10, # Mon: Catch-up day
        1: 1.25, # Tue: Pediatric clinic day
        2: 1.20, # Wed: General immunization
        3: 1.05, # Thu: Standard
        4: 1.00, # Fri: Standard
        5: 0.65, # Sat: Half-day
        6: 0.30  # Sun: Emergency only
    }

    # 3. Generate daily projections
    daily_projections = []
    base_date = datetime.now()
    cumulative_30 = 0
    cumulative_7 = 0
    cumulative_90 = 0

    std_dev = float(np.std(y)) if n > 1 else avg_consumption * 0.15

    for step in range(1, 91):
        future_x = n + step - 1
        base_trend = max(slope * future_x + intercept, 5.0)
        proj_date = base_date + timedelta(days=step)
        dow = proj_date.weekday()
        seasonal_factor = dow_multipliers.get(dow, 1.0)

        # Smooth combined forecast
        pred_value = int(round(base_trend * seasonal_factor))
        pred_value = max(pred_value, 2)

        conf_lower = max(int(pred_value - 1.2 * std_dev), 1)
        conf_upper = int(pred_value + 1.2 * std_dev)

        trend_direction = "Increasing" if slope > 0.1 else ("Decreasing" if slope < -0.1 else "Stable")

        if step <= 7:
            cumulative_7 += pred_value
        if step <= 30:
            cumulative_30 += pred_value
        cumulative_90 += pred_value

        if step <= forecast_days:
            daily_projections.append({
                "date": proj_date.strftime("%Y-%m-%d"),
                "day_of_week": proj_date.strftime("%a"),
                "predicted_doses": pred_value,
                "confidence_lower": conf_lower,
                "confidence_upper": conf_upper,
                "trend": trend_direction
            })

    days_remaining = round(current_stock / avg_consumption, 1) if avg_consumption > 0 else 999.0

    if days_remaining < 14:
        shortage_risk = "CRITICAL_SHORTAGE"
    elif days_remaining < 25:
        shortage_risk = "LOW_STOCK"
    elif days_remaining > 75:
        shortage_risk = "EXCESS_STOCK"
    else:
        shortage_risk = "BALANCED"

    return {
        "average_daily_consumption": round(avg_consumption, 1),
        "forecast_7_days": cumulative_7,
        "forecast_30_days": cumulative_30,
        "forecast_90_days": cumulative_90,
        "days_of_stock_remaining": days_remaining,
        "shortage_risk": shortage_risk,
        "daily_projections": daily_projections
    }
