from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
from .. import crud, models, schemas, database
from ..services.rule_engine import evaluate_rule
from datetime import datetime, timedelta
from app.core.deps import require_admin
from fastapi import Query

router = APIRouter(
    prefix="/api/rules",
    tags=["rules"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.Rule)
def create_rule(rule: schemas.RuleCreate, db: Session = Depends(get_db)):
    # user_id can be None if not authenticated; avoid FK errors
    user_id = 1 if crud.get_user(db, 1) else None
    created = crud.create_rule(db=db, rule=rule, user_id=user_id)
    try:
        crud.log_audit(
            db,
            action=models.AuditAction.created_rule,
            entity_type=models.AuditEntityType.rule,
            entity_id=created.id,
            entity_label=created.name,
            metadata={
                "rule_id": created.rule_id,
                "category": str(created.category),
                "severity": str(created.severity),
                "status": str(created.status),
            },
            actor_id=user_id,
            actor_email="system",
        )
    except Exception:
        pass
    return created

@router.get("/", response_model=List[schemas.Rule])
def read_rules(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    rules = crud.get_rules(db, skip=skip, limit=limit)
    
    # Enrich with computed fields
    for rule in rules:
        stats = crud.get_rule_stats(db, rule.id)
        rule.triggers24h = stats["triggers_24h"]
        
        # Mocking some computed fields for now as they require more complex logic/data
        rule.triggerDelta = 0 
        rule.lastUpdated = rule.updated_at.strftime("%Y-%m-%d %H:%M") if rule.updated_at else rule.created_at.strftime("%Y-%m-%d %H:%M")
        
        if rule.creator:
            rule.createdBy = rule.creator.full_name or rule.creator.email
        if rule.owner:
            rule.ownerName = rule.owner.full_name or rule.owner.email
            
        # Get current version
        latest_version = db.query(models.RuleVersion).filter(
            models.RuleVersion.rule_id == rule.id
        ).order_by(models.RuleVersion.created_at.desc()).first()
        
        if latest_version:
            rule.currentVersion = latest_version.version
            
    return rules

@router.get("/{rule_id}", response_model=schemas.Rule)
def read_rule(rule_id: int, db: Session = Depends(get_db)):
    db_rule = crud.get_rule(db, rule_id=rule_id)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Enrich with computed fields (similar to list view)
    stats = crud.get_rule_stats(db, db_rule.id)
    db_rule.triggers24h = stats["triggers_24h"]
    db_rule.lastUpdated = db_rule.updated_at.strftime("%Y-%m-%d %H:%M") if db_rule.updated_at else db_rule.created_at.strftime("%Y-%m-%d %H:%M")
    
    if db_rule.creator:
        db_rule.createdBy = db_rule.creator.full_name or db_rule.creator.email
    if db_rule.owner:
        db_rule.ownerName = db_rule.owner.full_name or db_rule.owner.email
        
    latest_version = db.query(models.RuleVersion).filter(
        models.RuleVersion.rule_id == db_rule.id
    ).order_by(models.RuleVersion.created_at.desc()).first()
    
    if latest_version:
        db_rule.currentVersion = latest_version.version
        
    return db_rule

@router.put("/{rule_id}", response_model=schemas.Rule)
def update_rule(rule_id: int, rule: schemas.RuleUpdate, db: Session = Depends(get_db)):
    db_rule = crud.update_rule(db, rule_id=rule_id, rule_update=rule)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    try:
        crud.log_audit(
            db,
            action=models.AuditAction.updated_rule,
            entity_type=models.AuditEntityType.rule,
            entity_id=rule_id,
            entity_label=db_rule.name if db_rule else None,
            metadata={"updated_fields": list(rule.model_dump(exclude_unset=True).keys())},
            actor_email="system",
        )
    except Exception:
        pass
    return db_rule

@router.delete("/{rule_id}", response_model=schemas.Rule)
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    db_rule = crud.delete_rule(db, rule_id=rule_id)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    try:
        crud.log_audit(
            db,
            action=models.AuditAction.deleted_rule,
            entity_type=models.AuditEntityType.rule,
            entity_id=rule_id,
            entity_label=db_rule.name if db_rule else None,
            metadata={"rule_id": db_rule.rule_id if db_rule else None},
            actor_email="system",
        )
    except Exception:
        pass
    return db_rule

@router.get("/{rule_id}/versions", response_model=List[schemas.RuleVersion])
def read_rule_versions(rule_id: int, db: Session = Depends(get_db)):
    versions = crud.get_rule_versions(db, rule_id=rule_id)
    return versions

@router.put("/versions/{version_id}", response_model=schemas.RuleVersion)
def update_rule_version(version_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    notes = payload.get("notes")
    if notes is None:
        raise HTTPException(status_code=400, detail="Notes field is required")
    
    version = crud.update_rule_version(db, version_id, notes)
    if not version:
        raise HTTPException(status_code=404, detail="Rule version not found")
    return version

@router.post("/test")
def test_rule(
    rule_data: Dict[str, Any],
    payload: str = None,
    db: Session = Depends(get_db)
):
    try:
        # Parse payload from query parameter if provided
        test_payload = {}
        if payload:
            test_payload = json.loads(payload)

        # Extract severity and logic from rule_data
        severity = rule_data.get("severity", "medium")
        logic = rule_data.get("groups", [])

        # Create logic structure for evaluation
        rule_logic = {
            "severity": severity,
            "groups": logic
        }

        # Evaluate the rule
        result = evaluate_rule(rule_logic, test_payload, severity)

        try:
            crud.log_audit(
                db,
                action=models.AuditAction.tested_rule,
                entity_type=models.AuditEntityType.rule,
                entity_id=None,
                entity_label=None,
                metadata={"severity": severity, "groups": len(logic), "triggered": bool(result.get("result"))},
                actor_email="system",
            )
        except Exception:
            pass

        return {
            "triggered": result["result"],
            "severity": result["severity"],
            "details": f"Rule evaluation completed with severity {result['severity']}"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Test failed: {str(e)}")

@router.post("/execute")
def execute_rules(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    active_versions = crud.get_active_rule_versions(db)
    triggered_rules = []

    for version in active_versions:
        result = evaluate_rule(version.logic_snapshot, payload)

        crud.create_execution_log(
            db=db,
            rule_id=version.rule_id,
            rule_version_id=version.id,
            input_payload=payload,
            execution_result=result["result"],
            severity=result["severity"]
        )

        if result["result"] is True:
            triggered_rules.append({
                "rule_id": version.rule_id,
                "rule_version_id": version.id,
                "severity": result["severity"]
            })

    try:
        crud.log_audit(
            db,
            action=models.AuditAction.executed_rule,
            entity_type=models.AuditEntityType.rule,
            entity_id=None,
            entity_label=None,
            metadata={"total_active_rules": len(active_versions), "triggered": len(triggered_rules)},
            actor_email="system",
        )
    except Exception:
        pass

    return triggered_rules

# --- Performance Endpoints ---
@router.get("/{rule_id}/performance/kpis")
def performance_kpis(rule_id: int, days: int = 30, db: Session = Depends(get_db)):
    rule = crud.get_rule(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return crud.get_rule_performance_kpis(db, rule_id, days)

@router.get("/{rule_id}/performance/trends")
def performance_trends(rule_id: int, days: int = 30, db: Session = Depends(get_db)):
    return crud.get_trigger_trends(db, rule_id, days)

@router.get("/{rule_id}/performance/severity")
def performance_severity(rule_id: int, days: int = 30, db: Session = Depends(get_db)):
    return crud.get_severity_distribution(db, rule_id, days)

@router.get("/{rule_id}/performance/conditions")
def performance_conditions(rule_id: int, days: int = 30, db: Session = Depends(get_db)):
    return crud.get_condition_hit_map(db, rule_id, days)

@router.get("/{rule_id}/performance/claims")
def performance_claims(
    rule_id: int,
    days: int = 30,
    severity: str | None = None,
    decision: str | None = None,
    skip: int = 0,
    limit: int = 20,
    sort: str | None = None,
    db: Session = Depends(get_db)
):
    return crud.get_triggered_claims(db, rule_id, days, severity, decision, skip, limit, sort)

@router.get("/{rule_id}/performance/decisions")
def performance_decisions(rule_id: int, days: int = 30, db: Session = Depends(get_db)):
    return crud.get_decision_counts(db, rule_id, days)

@router.get("/executions/{execution_id}")
def get_execution(execution_id: int, db: Session = Depends(get_db)):
    data = crud.get_execution_by_id(db, execution_id)
    if not data:
        raise HTTPException(status_code=404, detail="Execution not found")
    return data

@router.post("/{rule_id}/clone", response_model=schemas.Rule)
def clone_rule(rule_id: int, db: Session = Depends(get_db)):
    user_id = 1
    cloned = crud.clone_rule(db, rule_id, user_id)
    if not cloned:
        raise HTTPException(status_code=404, detail="Rule not found")
    try:
        crud.log_audit(
            db,
            action=models.AuditAction.cloned_rule,
            entity_type=models.AuditEntityType.rule,
            entity_id=cloned.id,
            entity_label=cloned.name,
            metadata={"source_rule_id": rule_id, "new_rule_id": cloned.id, "new_rule_code": cloned.rule_id},
            actor_id=user_id,
            actor_email="system",
        )
    except Exception:
        pass
    return cloned

@router.post("/{rule_id}/publish", response_model=schemas.Rule)
def publish_rule(rule_id: int, payload: Dict[str, Any], db: Session = Depends(get_db)):
    db_rule = crud.get_rule(db, rule_id)
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Update rule fields if provided
    update_fields = {}
    for field in ["name", "description", "category", "severity", "status", "tags", "conditionSummary", "logic"]:
        if field in payload and payload[field] is not None:
            update_fields[field] = payload[field]

    if update_fields:
        # Use RuleUpdate model for validation
        update_model = schemas.RuleUpdate(**update_fields)
        db_rule = crud.update_rule(db, rule_id=rule_id, rule_update=update_model)

    # Create a new active version
    version = payload.get("version") or "v1.0"
    notes = payload.get("notes") or ""
    user_id = 1 if crud.get_user(db, 1) else None
    # Refresh rule to get latest logic
    db_rule = crud.get_rule(db, rule_id)
    crud.create_rule_version(db, rule_id, version, db_rule.logic, user_id, notes=notes, is_active=True)

    try:
        crud.log_audit(
            db,
            action=models.AuditAction.published_version,
            entity_type=models.AuditEntityType.rule,
            entity_id=rule_id,
            entity_label=db_rule.name if db_rule else None,
            metadata={"version": version, "notes": notes},
            actor_id=user_id,
            actor_email="system",
        )
    except Exception:
        pass

    return db_rule
