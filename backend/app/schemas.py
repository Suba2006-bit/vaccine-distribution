from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: str  # HOSPITAL or MANUFACTURER
    facility_name: str
    facility_type: Optional[str] = "Hospital"
    district: Optional[str] = "Central"
    state: Optional[str] = "State"
    contact_number: Optional[str] = ""

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    facility_name: str
    facility_type: str
    district: str
    state: str
    contact_number: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

# --- Vaccine Schemas ---
class VaccineBase(BaseModel):
    name: str
    type: str
    recommended_temp_min: float = 2.0
    recommended_temp_max: float = 8.0
    shelf_life_days: int = 180
    doses_per_vial: int = 10
    description: Optional[str] = ""

class VaccineOut(VaccineBase):
    id: int

    class Config:
        from_attributes = True

# --- Batch Schemas ---
class BatchCreate(BaseModel):
    batch_number: str
    vaccine_id: int
    manufacture_date: datetime
    expiry_date: datetime
    initial_doses: int
    current_doses: int
    cold_storage_unit: Optional[str] = "Main Cold Room A"

class BatchConsume(BaseModel):
    doses_to_consume: int

class BatchOut(BaseModel):
    id: int
    batch_number: str
    facility_id: int
    vaccine_id: int
    vaccine: VaccineOut
    manufacture_date: datetime
    expiry_date: datetime
    initial_doses: int
    current_doses: int
    status: str
    cold_storage_unit: str
    quarantine_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Thermal Log Schemas ---
class ThermalLogCreate(BaseModel):
    batch_id: Optional[int] = None
    unit_name: Optional[str] = "Cold Storage Hub 1"
    temperature: float
    humidity: Optional[float] = 50.0
    door_status: Optional[str] = "CLOSED"
    power_status: Optional[str] = "MAINS"
    scenario_tag: Optional[str] = "OPTIMAL"

class ThermalLogOut(BaseModel):
    id: int
    facility_id: int
    batch_id: Optional[int]
    unit_name: str
    timestamp: datetime
    temperature: float
    humidity: float
    door_status: str
    power_status: str
    scenario_tag: str

    class Config:
        from_attributes = True

class ThermalAnalysisResponse(BaseModel):
    current_temperature: float
    mean_kinetic_temperature: float
    average_temperature: float
    min_temperature: float
    max_temperature: float
    total_logs_analyzed: int
    safe_range_min: float
    safe_range_max: float
    excursion_minutes_heat: float
    excursion_minutes_freeze: float
    cold_chain_health_score: float  # 0 to 100
    status: str  # SAFE, WARNING, CRITICAL_QUARANTINE
    active_breach_detected: bool
    recommended_action: str

# --- Vaccine Request Schemas ---
class VaccineRequestCreate(BaseModel):
    vaccine_id: int
    requested_doses: int
    priority: Optional[str] = "ROUTINE"
    notes: Optional[str] = ""

class VaccineRequestStatusUpdate(BaseModel):
    status: str  # APPROVED, DISPATCHED, DELIVERED, REJECTED
    dispatch_notes: Optional[str] = ""
    transit_temperature: Optional[float] = 4.0

class VaccineRequestOut(BaseModel):
    id: int
    requesting_facility_id: int
    requesting_facility_name: Optional[str]
    manufacturer_id: Optional[int]
    vaccine_id: int
    vaccine_name: Optional[str]
    requested_doses: int
    priority: str
    status: str
    notes: Optional[str]
    dispatch_notes: Optional[str]
    transit_temperature: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Redistribution Recommendation Schemas ---
class RedistributionOut(BaseModel):
    id: int
    source_facility_id: int
    source_facility_name: Optional[str]
    target_facility_id: int
    target_facility_name: Optional[str]
    batch_id: int
    batch_number: Optional[str]
    vaccine_id: int
    vaccine_name: Optional[str]
    recommended_doses: int
    reason: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Query Ticket Schemas ---
class QueryTicketCreate(BaseModel):
    recipient_id: Optional[int] = None
    subject: str
    category: Optional[str] = "GENERAL"
    message: str

class QueryTicketReply(BaseModel):
    reply: str
    status: Optional[str] = "RESOLVED"

class QueryTicketOut(BaseModel):
    id: int
    sender_id: int
    sender_name: Optional[str]
    recipient_id: Optional[int]
    subject: str
    category: str
    message: str
    reply: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Demand Forecast Schemas ---
class DailyDemandItem(BaseModel):
    date: str
    predicted_doses: int
    confidence_lower: int
    confidence_upper: int
    trend: str

class VaccineForecastResponse(BaseModel):
    vaccine_id: int
    vaccine_name: str
    current_stock: int
    average_daily_consumption: float
    forecast_7_days: int
    forecast_30_days: int
    forecast_90_days: int
    shortage_risk: str  # CRITICAL_SHORTAGE, BALANCED, EXCESS
    daily_projections: List[DailyDemandItem]

# --- Stock Analysis Schemas ---
class StockStatusItem(BaseModel):
    vaccine_id: int
    vaccine_name: str
    current_stock: int
    daily_burn_rate: float
    days_of_supply_remaining: float
    safety_stock_threshold: int
    reorder_point: int
    status: str  # SHORTAGE, OPTIMAL, EXCESS
    expiry_risk_batches_count: int
