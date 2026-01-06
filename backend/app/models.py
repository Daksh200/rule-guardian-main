from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum, JSON, Float, Text, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class Role(str, enum.Enum):
    admin = "admin"
    super_admin = "super_admin"

class RuleStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    draft = "draft"

class RuleCategory(str, enum.Enum):
    identity = "identity"
    transaction = "transaction"
    geolocation = "geolocation"
    document = "document"

class Severity(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"

class Decision(str, enum.Enum):
    pending = "pending"
    fraud = "fraud"
    legitimate = "legitimate"

class AuditAction(str, enum.Enum):
    created_rule = "created_rule"
    updated_rule = "updated_rule"
    deleted_rule = "deleted_rule"
    status_changed = "status_changed"
    published_version = "published_version"
    cloned_rule = "cloned_rule"
    executed_rule = "executed_rule"
    tested_rule = "tested_rule"
    logged_in = "logged_in"
    logged_out = "logged_out"

class AuditEntityType(str, enum.Enum):
    rule = "rule"
    rule_version = "rule_version"
    execution = "execution"
    user = "user"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    initials = Column(String)
    role = Column(Enum(Role), default=Role.admin)
    
    created_rules = relationship("Rule", back_populates="creator", foreign_keys="Rule.created_by_id")
    owned_rules = relationship("Rule", back_populates="owner", foreign_keys="Rule.owner_id")
    rule_versions = relationship("RuleVersion", back_populates="creator")

class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String, unique=True, index=True, nullable=False) # e.g. RL-2023-001
    name = Column(String, nullable=False)
    description = Column(Text)
    category = Column(Enum(RuleCategory), nullable=False)
    severity = Column(Enum(Severity), nullable=False)
    status = Column(Enum(RuleStatus), default=RuleStatus.draft)
    
    # Storing logic as JSON since it's a complex nested structure
    logic = Column(JSON, nullable=False)
    
    tags = Column(ARRAY(String))
    
    created_by_id = Column(Integer, ForeignKey("users.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    creator = relationship("User", back_populates="created_rules", foreign_keys=[created_by_id])
    owner = relationship("User", back_populates="owned_rules", foreign_keys=[owner_id])
    versions = relationship("RuleVersion", back_populates="rule", cascade="all, delete-orphan")
    executions = relationship("RuleExecutionLog", back_populates="rule")

class RuleVersion(Base):
    __tablename__ = "rule_versions"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("rules.id"))
    version = Column(String, nullable=False) # v1.0
    logic_snapshot = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)
    is_active = Column(Boolean, default=False)

    rule = relationship("Rule", back_populates="versions")
    creator = relationship("User", back_populates="rule_versions")
    executions = relationship("RuleExecutionLog", back_populates="rule_version")

class RuleExecutionLog(Base):
    __tablename__ = "rule_executions"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("rules.id"))
    rule_version_id = Column(Integer, ForeignKey("rule_versions.id"))
    claim_id = Column(String, index=True) # External Claim ID
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    severity = Column(Enum(Severity))
    trigger_reasons = Column(ARRAY(String))
    decision = Column(Enum(Decision), default=Decision.pending)
    amount = Column(Float)
    input_payload = Column(JSON)
    execution_result = Column(Boolean)

    rule = relationship("Rule", back_populates="executions")
    rule_version = relationship("RuleVersion", back_populates="executions")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_email = Column(String, nullable=True)
    action = Column(Enum(AuditAction), nullable=False)
    entity_type = Column(Enum(AuditEntityType), nullable=False)
    entity_id = Column(String, nullable=True)
    entity_label = Column(String, nullable=True)
    details = Column(JSON)

    actor = relationship("User")
