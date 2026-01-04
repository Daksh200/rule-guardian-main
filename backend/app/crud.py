from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from . import models, schemas
from datetime import datetime, timedelta
import json

# --- User CRUD ---
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    fake_hashed_password = user.password + "notreallyhashed"
    db_user = models.User(
        email=user.email, 
        hashed_password=fake_hashed_password,
        full_name=user.full_name,
        initials=user.initials,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Rule CRUD ---
def get_rules(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Rule).offset(skip).limit(limit).all()

def get_rule(db: Session, rule_id: int):
    return db.query(models.Rule).filter(models.Rule.id == rule_id).first()

def create_rule(db: Session, rule: schemas.RuleCreate, user_id: int):
    # Convert Pydantic model to dict for JSON storage
    logic_dict = rule.logic.model_dump()
    
    db_rule = models.Rule(
        rule_id=rule.rule_id,
        name=rule.name,
        description=rule.description,
        category=rule.category,
        severity=rule.severity,
        status=rule.status,
        logic=logic_dict,
        tags=rule.tags,
        created_by_id=user_id,
        owner_id=user_id
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    
    # Create initial version
    create_rule_version(db, db_rule.id, "v1.0", logic_dict, user_id, "Initial creation", True)
    
    return db_rule

def update_rule(db: Session, rule_id: int, rule_update: schemas.RuleUpdate):
    db_rule = db.query(models.Rule).filter(models.Rule.id == rule_id).first()
    if not db_rule:
        return None
    
    update_data = rule_update.model_dump(exclude_unset=True)
    
    if 'logic' in update_data:
        update_data['logic'] = update_data['logic'] # Already a dict from model_dump
        
    for key, value in update_data.items():
        setattr(db_rule, key, value)
        
    db.commit()
    db.refresh(db_rule)
    return db_rule

def delete_rule(db: Session, rule_id: int):
    db_rule = db.query(models.Rule).filter(models.Rule.id == rule_id).first()
    if db_rule:
        db.delete(db_rule)
        db.commit()
    return db_rule

# --- Rule Version CRUD ---
def create_rule_version(db: Session, rule_id: int, version: str, logic: dict, user_id: int, notes: str = "", is_active: bool = False):
    db_version = models.RuleVersion(
        rule_id=rule_id,
        version=version,
        logic_snapshot=logic,
        created_by_id=user_id,
        notes=notes,
        is_active=is_active
    )
    db.add(db_version)
    db.commit()
    db.refresh(db_version)
    return db_version

def get_rule_versions(db: Session, rule_id: int):
    return db.query(models.RuleVersion).filter(models.RuleVersion.rule_id == rule_id).order_by(desc(models.RuleVersion.created_at)).all()

# --- Analytics Helper Functions ---
def get_rule_stats(db: Session, rule_id: int):
    # This would normally aggregate real data from RuleExecutionLog
    # For now, we'll simulate some of the aggregation logic based on the schema
    
    total_executions = db.query(models.RuleExecutionLog).filter(models.RuleExecutionLog.rule_id == rule_id).count()
    
    # Calculate triggers in last 24h
    yesterday = datetime.now() - timedelta(days=1)
    triggers_24h = db.query(models.RuleExecutionLog).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.execution_date >= yesterday
    ).count()
    
    return {
        "total_executions": total_executions,
        "triggers_24h": triggers_24h
    }
def get_active_rule_versions(db: Session):
    return db.query(models.RuleVersion).filter(
        models.RuleVersion.is_active == True
    ).all()

def create_execution_log(
    db: Session,
    rule_id: int,
    rule_version_id: int,
    input_payload: dict,
    execution_result: bool,
    severity: str
):
    log = models.RuleExecutionLog(
        rule_id=rule_id,
        rule_version_id=rule_version_id,
        input_payload=input_payload,
        execution_result=execution_result,
        severity=severity
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
