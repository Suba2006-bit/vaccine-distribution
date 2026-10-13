from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(30), nullable=False)  # "HOSPITAL" or "MANUFACTURER"
    facility_name = Column(String(150), nullable=False)
    facility_type = Column(String(50), default="Hospital")  # Hospital, Pharmacy, Health Center, Plant
    district = Column(String(100), default="Central")
    state = Column(String(100), default="State")
    contact_number = Column(String(30), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    batches = relationship("Batch", back_populates="facility")
    thermal_logs = relationship("ThermalLog", back_populates="facility")


class Vaccine(Base):
    __tablename__ = "vaccines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    type = Column(String(80), nullable=False)  # Viral Vector, mRNA, Inactivated, Live
    recommended_temp_min = Column(Float, default=2.0)
    recommended_temp_max = Column(Float, default=8.0)
    shelf_life_days = Column(Integer, default=180)
    doses_per_vial = Column(Integer, default=10)
    description = Column(Text, default="")

    batches = relationship("Batch", back_populates="vaccine")


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_number = Column(String(50), unique=True, index=True, nullable=False)
    facility_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vaccine_id = Column(Integer, ForeignKey("vaccines.id"), nullable=False)
    manufacture_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=False)
    initial_doses = Column(Integer, nullable=False)
    current_doses = Column(Integer, nullable=False)
    status = Column(String(40), default="ACTIVE")  # ACTIVE, QUARANTINED_HEAT, QUARANTINED_FREEZE, EXPIRED, DEPLETED
    cold_storage_unit = Column(String(50), default="Main Cold Room A")
    quarantine_reason = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    facility = relationship("User", back_populates="batches")
    vaccine = relationship("Vaccine", back_populates="batches")
    thermal_logs = relationship("ThermalLog", back_populates="batch")


class ThermalLog(Base):
    __tablename__ = "thermal_logs"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)
    unit_name = Column(String(60), default="Cold Storage Hub 1")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, default=50.0)
    door_status = Column(String(20), default="CLOSED")  # CLOSED, OPEN
    power_status = Column(String(20), default="MAINS")   # MAINS, BATTERY, FAILURE
    scenario_tag = Column(String(50), default="OPTIMAL") # OPTIMAL, DOOR_AJAR, POWER_FAILURE, FREEZE_EXCURSION

    facility = relationship("User", back_populates="thermal_logs")
    batch = relationship("Batch", back_populates="thermal_logs")


class VaccineConsumptionHistory(Base):
    __tablename__ = "vaccine_consumption_history"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vaccine_id = Column(Integer, ForeignKey("vaccines.id"), nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    doses_administered = Column(Integer, nullable=False)


class VaccineRequest(Base):
    __tablename__ = "vaccine_requests"

    id = Column(Integer, primary_key=True, index=True)
    requesting_facility_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    manufacturer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    vaccine_id = Column(Integer, ForeignKey("vaccines.id"), nullable=False)
    requested_doses = Column(Integer, nullable=False)
    priority = Column(String(20), default="ROUTINE")  # ROUTINE, URGENT
    status = Column(String(30), default="PENDING")   # PENDING, APPROVED, DISPATCHED, DELIVERED, REJECTED
    notes = Column(Text, default="")
    dispatch_notes = Column(Text, default="")
    transit_temperature = Column(Float, default=4.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class RedistributionRecommendation(Base):
    __tablename__ = "redistribution_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    source_facility_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_facility_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    vaccine_id = Column(Integer, ForeignKey("vaccines.id"), nullable=False)
    recommended_doses = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    status = Column(String(30), default="SUGGESTED")  # SUGGESTED, ACCEPTED, COMPLETED, DISMISSED
    created_at = Column(DateTime, default=datetime.utcnow)


class QueryTicket(Base):
    __tablename__ = "query_tickets"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    subject = Column(String(200), nullable=False)
    category = Column(String(50), default="GENERAL")  # STOCK_ISSUE, TEMPERATURE_EXCURSION, ORDER_STATUS, GENERAL
    message = Column(Text, nullable=False)
    reply = Column(Text, default="")
    status = Column(String(20), default="OPEN")  # OPEN, RESOLVED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ProductionPlan(Base):
    __tablename__ = "production_plans"

    id = Column(Integer, primary_key=True, index=True)
    manufacturer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vaccine_id = Column(Integer, ForeignKey("vaccines.id"), nullable=False)
    planned_doses = Column(Integer, nullable=False)
    target_completion_date = Column(DateTime, nullable=False)
    status = Column(String(30), default="SCHEDULED")  # SCHEDULED, IN_PRODUCTION, COMPLETED
    batch_code = Column(String(50), default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
