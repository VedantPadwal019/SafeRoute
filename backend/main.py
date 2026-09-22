"""Optional FastAPI backend for SafeRoute.
Run: uvicorn backend.main:app --reload --port 8000
The frontend can operate in demo mode without this service.
"""
from datetime import datetime, timezone
from math import exp
import hashlib
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI(title="SafeRoute Safety Intelligence API", version="1.0.0")

class Segment(BaseModel):
    id: str
    hour: int = Field(ge=0, le=23)
    lighting: float = Field(ge=0, le=100)
    activity: float = Field(ge=0, le=100)
    incident_count: int = Field(ge=0)
    report_confidence: float = Field(ge=0, le=1)
    distance_to_help_m: float = Field(ge=0)
    unknown: bool = False

class Report(BaseModel):
    segment_id: str
    report_type: Literal["streetlight", "harassment", "obstruction", "crowding", "unsafe_activity"]
    description: str = ""
    created_at: datetime | None = None
    source: str = "anonymous_demo"

reports = []
report_keys = set()

def temporal_weight(hour: int) -> float:
    # Demo prior: late-night exposure rises after 21:00.
    if hour < 18: return 0.65
    if hour < 20: return 0.75
    if hour < 22: return 0.9
    if hour < 23: return 1.08
    return 1.18

def score_segment(s: Segment):
    if s.unknown:
        return {"risk": None, "label": "Unknown", "confidence": 0.0, "reasons": ["Insufficient evidence"]}
    lighting_penalty = (100 - s.lighting) * 0.35
    activity_penalty = (100 - s.activity) * 0.18
    incident_signal = min(40, s.incident_count * 7)
    help_signal = min(20, s.distance_to_help_m / 500 * 10)
    raw = (lighting_penalty + activity_penalty + incident_signal + help_signal) * temporal_weight(s.hour)
    risk = round(max(0, min(100, raw)))
    conf = min(1.0, 0.45 + s.report_confidence * 0.45 + min(s.incident_count, 4) * 0.025)
    reasons = []
    if s.lighting < 55: reasons.append("low lighting")
    if s.activity < 45: reasons.append("low activity")
    if s.incident_count: reasons.append(f"{s.incident_count} incident/report signals")
    if s.distance_to_help_m > 900: reasons.append("farther from help")
    return {"risk": risk, "label": "High" if risk >= 60 else "Moderate" if risk >= 35 else "Low", "confidence": round(conf*100), "reasons": reasons or ["No dominant adverse signal"]}

@app.get("/api/health")
def health():
    return {"ok": True, "service": "safeshift-risk-engine", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/api/risk")
def risk(segment: Segment):
    return score_segment(segment)

@app.post("/api/reports")
def create_report(report: Report):
    report.created_at = report.created_at or datetime.now(timezone.utc)
    normalized = " ".join(report.description.lower().split())[:300]
    key = hashlib.sha256(f"{report.segment_id}|{report.report_type}|{normalized}".encode()).hexdigest()
    if key in report_keys:
        return {"accepted": False, "duplicate": True, "confidence": 0.0, "message": "Duplicate report ignored; existing evidence remains unchanged."}
    report_keys.add(key)
    payload = report.model_dump()
    payload.update({"confidence": 0.55, "verification": "unverified", "freshness": "new"})
    reports.append(payload)
    return {"accepted": True, "duplicate": False, "confidence": 0.55, "message": "Report accepted as low-confidence evidence; corroboration can increase its weight."}

@app.get("/api/reports")
def get_reports():
    return {"count": len(reports), "reports": reports}
