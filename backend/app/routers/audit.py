from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from .. import crud, database
import csv
import io

router = APIRouter(
    prefix="/api/audit",
    tags=["audit"],
)

# Dependency

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def list_audit(
    page: int = 1,
    limit: int = 20,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    actor_email: Optional[str] = None,
    entity_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    df = datetime.fromisoformat(date_from) if date_from else None
    dt = datetime.fromisoformat(date_to) if date_to else None
    return crud.get_audit_logs(
        db=db,
        page=page,
        limit=limit,
        action=action,
        entity_type=entity_type,
        actor_email=actor_email,
        entity_id=entity_id,
        date_from=df,
        date_to=dt,
    )


@router.get("/export")
def export_audit(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    actor_email: Optional[str] = None,
    entity_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    df = datetime.fromisoformat(date_from) if date_from else None
    dt = datetime.fromisoformat(date_to) if date_to else None
    # export all matching rows up to a sane cap (e.g., 10k rows)
    data = crud.get_audit_logs(
        db=db,
        page=1,
        limit=10000,
        action=action,
        entity_type=entity_type,
        actor_email=actor_email,
        entity_id=entity_id,
        date_from=df,
        date_to=dt,
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "created_at", "actor_email", "action", "entity_type", "entity_id", "entity_label", "metadata"])
    for item in data["items"]:
        writer.writerow([
            item.get("id"),
            item.get("created_at"),
            item.get("actor_email"),
            item.get("action"),
            item.get("entity_type"),
            item.get("entity_id"),
            item.get("entity_label"),
            # serialize metadata as JSON-ish string
            str(item.get("metadata") or {}),
        ])

    csv_bytes = output.getvalue().encode("utf-8")
    headers = {
        "Content-Disposition": "attachment; filename=audit-export.csv",
        "Content-Type": "text/csv; charset=utf-8",
    }
    return Response(content=csv_bytes, headers=headers, media_type="text/csv")
