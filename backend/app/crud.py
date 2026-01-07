from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, cast, Date, Integer, case
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
    return db.query(models.Rule).options(
        joinedload(models.Rule.creator),
        joinedload(models.Rule.owner)
    ).offset(skip).limit(limit).all()

def get_rule(db: Session, rule_id: int):
    return db.query(models.Rule).options(
        joinedload(models.Rule.creator),
        joinedload(models.Rule.owner)
    ).filter(models.Rule.id == rule_id).first()

def create_rule(db: Session, rule: schemas.RuleCreate, user_id: int | None):
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
        created_by_id=user_id if user_id else None,
        owner_id=user_id if user_id else None
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
def create_rule_version(
    db: Session,
    rule_id: int,
    version: str,
    logic: dict,
    user_id: int | None,
    notes: str = "",
    is_active: bool = False
):
    if is_active:
        db.query(models.RuleVersion).filter(
            models.RuleVersion.rule_id == rule_id,
            models.RuleVersion.is_active == True
        ).update({"is_active": False})

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

def update_rule_version(db: Session, version_id: int, notes: str):
    db_version = db.query(models.RuleVersion).filter(models.RuleVersion.id == version_id).first()
    if not db_version:
        return None
    db_version.notes = notes
    db.commit()
    db.refresh(db_version)
    return db_version

# --- Analytics Helper Functions ---
def get_rule_stats(db: Session, rule_id: int):
    now = datetime.now()

    # Calculate triggers in last 24h (only where execution_result = True)
    yesterday = now - timedelta(days=1)
    triggers_24h = db.query(models.RuleExecutionLog).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= yesterday,
        models.RuleExecutionLog.execution_result == True
    ).count()

    # Calculate triggers in last 7 days
    seven_days_ago = now - timedelta(days=7)
    triggers_7d = db.query(models.RuleExecutionLog).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= seven_days_ago,
        models.RuleExecutionLog.execution_result == True
    ).count()

    # Calculate triggers in last 30 days
    thirty_days_ago = now - timedelta(days=30)
    triggers_30d = db.query(models.RuleExecutionLog).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= thirty_days_ago,
        models.RuleExecutionLog.execution_result == True
    ).count()

    # Severity distribution for triggered executions
    severity_counts = db.query(
        models.RuleExecutionLog.severity,
        func.count(models.RuleExecutionLog.id)
    ).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.execution_result == True
    ).group_by(models.RuleExecutionLog.severity).all()

    severity_distribution = {str(severity): count for severity, count in severity_counts}

    return {
        "triggers_24h": triggers_24h,
        "triggers_7d": triggers_7d,
        "triggers_30d": triggers_30d,
        "severity_distribution": severity_distribution
    }
def get_active_rule_versions(db: Session):
    return db.query(models.RuleVersion).filter(
        models.RuleVersion.is_active == True
    ).all()

# Performance analytics queries

def get_rule_performance_kpis(db: Session, rule_id: int, days: int):
    since = datetime.now() - timedelta(days=days)
    total_claims = db.query(func.count(models.RuleExecutionLog.id)).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= since
    ).scalar() or 0
    flags = db.query(func.count(models.RuleExecutionLog.id)).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= since,
        models.RuleExecutionLog.execution_result == True
    ).scalar() or 0
    confirmed_fraud = db.query(func.count(models.RuleExecutionLog.id)).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= since,
        models.RuleExecutionLog.decision == models.Decision.fraud
    ).scalar() or 0
    legitimate = db.query(func.count(models.RuleExecutionLog.id)).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= since,
        models.RuleExecutionLog.decision == models.Decision.legitimate
    ).scalar() or 0
    false_positive_rate = 0.0
    if flags > 0:
        # False positive = flagged but later marked legitimate
        false_positive_rate = round((legitimate / flags) * 100, 2)
    hit_rate = 0.0
    if total_claims > 0:
        hit_rate = round((flags / total_claims) * 100, 2)

    last_eval_row = db.query(func.max(models.RuleExecutionLog.executed_at)).filter(
        models.RuleExecutionLog.rule_id == rule_id
    ).scalar()
    last_evaluated = last_eval_row.isoformat() if last_eval_row else ""

    return {
        "totalClaimsEvaluated": total_claims,
        "flagsTriggered": flags,
        "confirmedFraud": confirmed_fraud,
        "falsePositiveRate": false_positive_rate,
        "hitRate": hit_rate,
        "lastEvaluated": last_evaluated,
    }

def get_trigger_trends(db: Session, rule_id: int, days: int):
    since = datetime.now() - timedelta(days=days)
    rows = db.query(
        cast(models.RuleExecutionLog.executed_at, Date).label('day'),
        func.count(models.RuleExecutionLog.id).label('totalClaims'),
        func.sum(cast(models.RuleExecutionLog.execution_result, Integer)).label('flags'),
        func.sum(case((models.RuleExecutionLog.decision == models.Decision.fraud, 1), else_=0)).label('fraud'),
    ).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= since
    ).group_by('day').order_by('day').all()
    # Build a full series for each day window
    from datetime import date
    day_map = {r.day: r for r in rows}
    result = []
    for i in range(days):
        d = (datetime.now() - timedelta(days=days-1-i)).date()
        r = day_map.get(d)
        result.append({
            'day': d.isoformat()[5:],
            'totalClaims': int(getattr(r, 'totalClaims', 0) or 0),
            'flags': int(getattr(r, 'flags', 0) or 0),
            'fraud': int(getattr(r, 'fraud', 0) or 0),
        })
    return result


def get_severity_distribution(db: Session, rule_id: int, days: int):
    since = datetime.now() - timedelta(days=days)
    counts = db.query(
        models.RuleExecutionLog.severity,
        func.count(models.RuleExecutionLog.id)
    ).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= since,
        models.RuleExecutionLog.execution_result == True
    ).group_by(models.RuleExecutionLog.severity).all()
    res = {'high': 0, 'medium': 0, 'low': 0}
    for sev, cnt in counts:
        res[str(sev)] = cnt
    return res


def get_condition_hit_map(db: Session, rule_id: int, days: int):
    since = datetime.now() - timedelta(days=days)
    # trigger_reasons contains condition labels; compute percentage of flags that include each reason
    flags_q = db.query(models.RuleExecutionLog).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= since,
        models.RuleExecutionLog.execution_result == True
    )
    flags_total = flags_q.count()
    if flags_total == 0:
        return []
    # Fetch all reasons arrays
    reasons = []
    for row in flags_q.all():
        if row.trigger_reasons:
            reasons.extend(row.trigger_reasons)
    from collections import Counter
    c = Counter(reasons)
    items = []
    for cond, cnt in c.items():
        pct = round((cnt / flags_total) * 100, 2)
        items.append({'condition': cond, 'percentage': pct})
    items.sort(key=lambda x: x['percentage'], reverse=True)
    return items


def get_triggered_claims(db: Session, rule_id: int, days: int, severity: str|None, decision: str|None, skip: int, limit: int, sort: str|None):
    since = datetime.now() - timedelta(days=days)
    q = db.query(models.RuleExecutionLog).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= since,
        models.RuleExecutionLog.execution_result == True
    )
    if severity and severity != 'all':
        q = q.filter(models.RuleExecutionLog.severity == getattr(models.Severity, severity))
    if decision and decision != 'all':
        q = q.filter(models.RuleExecutionLog.decision == getattr(models.Decision, decision))
    # Sorting
    if sort == 'date_desc':
        q = q.order_by(desc(models.RuleExecutionLog.executed_at))
    elif sort == 'date_asc':
        q = q.order_by(models.RuleExecutionLog.executed_at)
    elif sort == 'amount_desc':
        q = q.order_by(desc(models.RuleExecutionLog.amount))
    elif sort == 'amount_asc':
        q = q.order_by(models.RuleExecutionLog.amount)
    total = q.count()
    rows = q.offset(skip).limit(limit).all()
    data = []
    for r in rows:
        data.append({
            'id': r.id,
            'claimId': r.claim_id,
            'date': r.executed_at.isoformat(),
            'severity': str(r.severity),
            'triggerReasons': r.trigger_reasons or [],
            'decision': str(r.decision),
            'amount': r.amount or 0.0,
        })
    return {'total': total, 'items': data}


def get_decision_counts(db: Session, rule_id: int, days: int):
    since = datetime.now() - timedelta(days=days)
    rows = db.query(
        models.RuleExecutionLog.decision,
        func.count(models.RuleExecutionLog.id)
    ).filter(
        models.RuleExecutionLog.rule_id == rule_id,
        models.RuleExecutionLog.executed_at >= since,
        models.RuleExecutionLog.execution_result == True,
    ).group_by(models.RuleExecutionLog.decision).all()
    res = {'fraud': 0, 'legitimate': 0, 'pending': 0}
    for d, cnt in rows:
        res[str(d)] = cnt
    return res


def get_execution_by_id(db: Session, exec_id: int):
    r = db.query(models.RuleExecutionLog).filter(models.RuleExecutionLog.id == exec_id).first()
    if not r:
        return None
    return {
        'id': r.id,
        'ruleId': r.rule_id,
        'ruleVersionId': r.rule_version_id,
        'claimId': r.claim_id,
        'executedAt': r.executed_at.isoformat() if r.executed_at else '',
        'severity': str(r.severity) if r.severity else 'low',
        'triggerReasons': r.trigger_reasons or [],
        'decision': str(r.decision) if r.decision else 'pending',
        'amount': r.amount or 0.0,
        'inputPayload': r.input_payload or {},
        'executionResult': bool(r.execution_result),
    }


def clone_rule(db: Session, rule_id: int, user_id: int):
    src = get_rule(db, rule_id)
    if not src:
        return None
    # create new rule id suffix
    new_rule_id = f"{src.rule_id}-copy"
    db_rule = models.Rule(
        rule_id=new_rule_id,
        name=f"{src.name} (Copy)",
        description=src.description,
        category=src.category,
        severity=src.severity,
        status=models.RuleStatus.draft,
        logic=src.logic,
        tags=src.tags,
        created_by_id=user_id,
        owner_id=user_id
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    # copy latest active version if exists
    latest_version = db.query(models.RuleVersion).filter(models.RuleVersion.rule_id == src.id).order_by(desc(models.RuleVersion.created_at)).first()
    if latest_version:
        create_rule_version(db, db_rule.id, latest_version.version, latest_version.logic_snapshot, user_id, notes='Cloned from original', is_active=False)
    return db_rule

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

# --- Audit Log CRUD ---

def log_audit(
    db: Session,
    action: models.AuditAction,
    entity_type: models.AuditEntityType,
    entity_id: str | int | None = None,
    entity_label: str | None = None,
    metadata: dict | None = None,
    actor_id: int | None = None,
    actor_email: str | None = None,
):
    entry = models.AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        entity_label=entity_label,
        details=metadata or {},
        actor_id=actor_id,
        actor_email=actor_email,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_audit_logs(
    db: Session,
    page: int = 1,
    limit: int = 20,
    action: str | None = None,
    entity_type: str | None = None,
    actor_email: str | None = None,
    entity_id: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
):
    q = db.query(models.AuditLog)

    if action:
        try:
            q = q.filter(models.AuditLog.action == models.AuditAction(action))
        except Exception:
            q = q.filter(models.AuditLog.action == None)  # no results
    if entity_type:
        try:
            q = q.filter(models.AuditLog.entity_type == models.AuditEntityType(entity_type))
        except Exception:
            q = q.filter(models.AuditLog.entity_type == None)
    if actor_email:
        q = q.filter(models.AuditLog.actor_email == actor_email)
    if entity_id:
        q = q.filter(models.AuditLog.entity_id == entity_id)
    if date_from:
        q = q.filter(models.AuditLog.created_at >= date_from)
    if date_to:
        q = q.filter(models.AuditLog.created_at <= date_to)

    total = q.count()
    rows = q.order_by(desc(models.AuditLog.created_at)).offset((page - 1) * limit).limit(limit).all()

    def serialize(e: models.AuditLog):
        return {
            'id': e.id,
            'created_at': e.created_at.isoformat() if e.created_at else None,
            'actor_id': e.actor_id,
            'actor_email': e.actor_email,
            'action': str(e.action),
            'entity_type': str(e.entity_type),
            'entity_id': e.entity_id,
            'entity_label': e.entity_label,
            'metadata': e.details or {},
        }

    return { 'total': total, 'items': [serialize(r) for r in rows] }
