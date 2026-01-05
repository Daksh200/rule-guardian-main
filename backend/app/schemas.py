from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Union, Literal
from datetime import datetime
from .models import Role, RuleStatus, RuleCategory, Severity, Decision

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    initials: Optional[str] = None
    role: Role = Role.admin

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True

# --- Rule Logic Schemas ---
class RuleCondition(BaseModel):
    id: str
    field: str
    operator: str
    value: Union[str, int, float, bool]
    unit: Optional[str] = None

class ConditionGroup(BaseModel):
    id: str
    logicOperator: Literal['IF', 'AND', 'OR']
    conditions: List[RuleCondition]

class RuleLogic(BaseModel):
    groups: List[ConditionGroup]

# --- Rule Schemas ---
class RuleBase(BaseModel):
    rule_id: str
    name: str
    description: Optional[str] = None
    category: RuleCategory
    severity: Severity
    status: RuleStatus = RuleStatus.draft
    logic: RuleLogic
    tags: List[str] = []
    conditionSummary: Optional[str] = None

class RuleCreate(RuleBase):
    pass

class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[RuleCategory] = None
    severity: Optional[Severity] = None
    status: Optional[RuleStatus] = None
    logic: Optional[RuleLogic] = None
    tags: Optional[List[str]] = None
    conditionSummary: Optional[str] = None

class Rule(RuleBase):
    id: int
    created_by_id: Optional[int] = None
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    triggers24h: int = 0 # Computed field
    triggerDelta: int = 0 # Computed field
    lastUpdated: str = "" # Computed field
    createdBy: str = "" # Computed field
    ownerName: str = "" # Computed field
    currentVersion: str = "" # Computed field

    class Config:
        from_attributes = True

# --- Rule Version Schemas ---
class RuleVersionBase(BaseModel):
    version: str
    logic_snapshot: RuleLogic
    notes: Optional[str] = None
    is_active: bool = False

class RuleVersionCreate(RuleVersionBase):
    pass

class RuleVersion(RuleVersionBase):
    id: int
    rule_id: int
    created_at: datetime
    created_by_id: Optional[int] = None
    isDraft: bool = False # Computed

    class Config:
        from_attributes = True

# --- Rule Execution Schemas ---
class RuleExecutionBase(BaseModel):
    claim_id: str
    severity: Severity
    trigger_reasons: List[str]
    decision: Decision
    amount: float

class RuleExecutionCreate(RuleExecutionBase):
    rule_id: int

class RuleExecution(RuleExecutionBase):
    id: int
    execution_date: datetime
    rule_id: int

    class Config:
        from_attributes = True

# --- Stats Schemas ---
class TriggerTrend(BaseModel):
    day: str
    totalClaims: int
    flags: int
    fraud: int

class SeverityDistribution(BaseModel):
    high: int
    medium: int
    low: int

class ConditionHit(BaseModel):
    condition: str
    percentage: float

class TriggeredClaim(BaseModel):
    id: str
    claimId: str
    date: str
    severity: Severity
    triggerReasons: List[str]
    decision: str
    amount: float

class RulePerformance(BaseModel):
    ruleId: str
    ruleName: str
    totalClaimsEvaluated: int
    flagsTriggered: int
    confirmedFraud: int
    falsePositiveRate: float
    hitRate: float
    lastEvaluated: str
    version: str
    triggerTrends: List[TriggerTrend]
    severityDistribution: SeverityDistribution
    conditionHitMap: List[ConditionHit]
    triggeredClaims: List[TriggeredClaim]
