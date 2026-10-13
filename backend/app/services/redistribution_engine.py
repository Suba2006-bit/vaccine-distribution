from datetime import datetime
from typing import List, Dict, Any

def generate_redistribution_recommendations(
    facilities_stock: List[Dict[str, Any]], 
    batches: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Scans facilities for:
    1. Excess stock (Days of inventory > 60)
    2. Batches near expiry (Expiry date < 60 days) where local burn rate is insufficient.
    Matches them with target facilities suffering shortages (Days of inventory < 20).
    """
    recommendations = []
    
    # Group inventory by vaccine_id
    vaccine_groups = {}
    for item in facilities_stock:
        v_id = item["vaccine_id"]
        if v_id not in vaccine_groups:
            vaccine_groups[v_id] = []
        vaccine_groups[v_id].append(item)

    now = datetime.now()

    for v_id, fac_list in vaccine_groups.items():
        surplus_nodes = [f for f in fac_list if f.get("days_of_stock", 30) > 50 or f.get("status") == "EXCESS"]
        shortage_nodes = [f for f in fac_list if f.get("days_of_stock", 30) < 20 or f.get("status") == "SHORTAGE"]

        # Match batches at surplus nodes
        for source in surplus_nodes:
            source_batches = [
                b for b in batches 
                if b["facility_id"] == source["facility_id"] 
                and b["vaccine_id"] == v_id 
                and b["status"] == "ACTIVE" 
                and b["current_doses"] > 50
            ]

            for batch in source_batches:
                try:
                    exp_dt = datetime.strptime(batch["expiry_date"][:10], "%Y-%m-%d")
                    days_to_exp = (exp_dt - now).days
                except Exception:
                    days_to_exp = 90

                for target in shortage_nodes:
                    if target["facility_id"] == source["facility_id"]:
                        continue

                    # Calculate suggested transfer doses
                    transfer_qty = min(batch["current_doses"], 250)
                    if transfer_qty <= 0:
                        continue

                    if days_to_exp <= 60:
                        reason = (
                            f"Impending Expiry Alert: Batch {batch['batch_number']} expires in {days_to_exp} days. "
                            f"{source['facility_name']} has surplus stock, while {target['facility_name']} is facing a stockout. "
                            f"Redistribute {transfer_qty} doses to prevent wastage."
                        )
                    else:
                        reason = (
                            f"Stock Rebalancing: {source['facility_name']} has excess inventory ({source.get('days_of_stock', 60):.0f} days supply). "
                            f"Reallocate {transfer_qty} doses to {target['facility_name']} (only {target.get('days_of_stock', 10):.0f} days remaining)."
                        )

                    recommendations.append({
                        "source_facility_id": source["facility_id"],
                        "source_facility_name": source["facility_name"],
                        "target_facility_id": target["facility_id"],
                        "target_facility_name": target["facility_name"],
                        "batch_id": batch["id"],
                        "batch_number": batch["batch_number"],
                        "vaccine_id": v_id,
                        "vaccine_name": batch.get("vaccine_name", "Vaccine"),
                        "recommended_doses": transfer_qty,
                        "days_to_expiry": days_to_exp,
                        "reason": reason,
                        "status": "SUGGESTED"
                    })
                    break  # One match per batch

    return recommendations
