from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from .. import crud, models, schemas, database
from ..services.rule_engine import evaluate_rule
from datetime import datetime, timedelta

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
    # In a real app, we'd get the current user from the token
    # For now, we'll assume user ID 1 exists (we'll create it in seed data)
    user_id = 1 
    return crud.create_rule(db=db, rule=rule, user_id=user_id)

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
            rule.owner = rule.owner.full_name or rule.owner.email
            
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
        db_rule.owner = db_rule.owner.full_name or db_rule.owner.email
        
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
    return db_rule

@router.delete("/{rule_id}", response_model=schemas.Rule)
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    db_rule = crud.delete_rule(db, rule_id=rule_id)
    if db_rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    return db_rule

@router.get("/{rule_id}/versions", response_model=List[schemas.RuleVersion])
def read_rule_versions(rule_id: int, db: Session = Depends(get_db)):
    versions = crud.get_rule_versions(db, rule_id=rule_id)
    return versions

    return triggered_rules
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

    return triggered_rules
