import random
from datetime import datetime, timedelta

from app.database import SessionLocal
from app import models, crud


def ensure_demo_rule(db):
    # Try to find existing demo rule
    demo_rule = db.query(models.Rule).filter(models.Rule.rule_id == "RL-DEMO-001").first()
    if demo_rule:
        # Get latest active version
        version = (
            db.query(models.RuleVersion)
            .filter(models.RuleVersion.rule_id == demo_rule.id)
            .order_by(models.RuleVersion.created_at.desc())
            .first()
        )
        return demo_rule, version

    # Create a simple logic JSON structure
    logic = {
        "groups": [
            {
                "id": "grp-1",
                "logicOperator": "IF",
                "conditions": [
                    {"id": "c1", "field": "claim.amount", "operator": "greater", "value": 5000},
                    {"id": "c2", "field": "geo_distance", "operator": "greater", "value": 50},
                ],
            }
        ]
    }

    # Create rule directly (avoid needing a user)
    demo_rule = models.Rule(
        rule_id="RL-DEMO-001",
        name="High Value Claim + Large Geo Distance",
        description="Flags claims over $5,000 with geo distance > 50km",
        category=models.RuleCategory.transaction,
        severity=models.Severity.medium,
        status=models.RuleStatus.active,
        logic=logic,
        tags=["demo", "seed", "amount", "geo"],
        created_by_id=None,
        owner_id=None,
    )
    db.add(demo_rule)
    db.commit()
    db.refresh(demo_rule)

    # Create initial active version
    version = crud.create_rule_version(
        db=db,
        rule_id=demo_rule.id,
        version="v1.0",
        logic=logic,
        user_id=None,
        notes="Seeded demo version",
        is_active=True,
    )
    return demo_rule, version


def seed_executions(db, rule: models.Rule, version: models.RuleVersion, days: int = 60):
    # If we already seeded demo claims for this rule recently, skip to avoid duplicates
    existing = (
        db.query(models.RuleExecutionLog)
        .filter(
            models.RuleExecutionLog.rule_id == rule.id,
            models.RuleExecutionLog.claim_id.like("CLM-DEMO-%"),
        )
        .count()
    )
    if existing > 0:
        print(f"Found {existing} existing demo executions for rule {rule.rule_id}. Skipping reseed.")
        return existing

    reason_pool = [
        "Amount > 5000",
        "Geo distance > 50km",
        "Device new",
        "High velocity",
        "IP mismatch",
    ]

    now = datetime.now()
    total_inserted = 0
    for day_idx in range(days):
        day = now - timedelta(days=(days - 1 - day_idx))
        # Daily totals
        total_claims = random.randint(8, 20)
        flagged_ratio = random.uniform(0.2, 0.6)
        flagged_count = int(total_claims * flagged_ratio)

        for i in range(total_claims):
            execution_result = i < flagged_count  # first N are flagged
            # Weighted severity for flagged
            sev_choice = random.choices(
                [models.Severity.high, models.Severity.medium, models.Severity.low],
                weights=[2, 5, 3],
                k=1,
            )[0]
            # Decisions mostly pending/legitimate, some fraud
            decision_choice = random.choices(
                [models.Decision.pending, models.Decision.legitimate, models.Decision.fraud],
                weights=[5, 4, 1],
                k=1,
            )[0]
            # Reasons for flagged only
            reasons = (
                random.sample(reason_pool, k=random.randint(1, 3)) if execution_result else []
            )
            amount = round(random.uniform(100.0, 20000.0), 2)
            claim_id = f"CLM-DEMO-{day.strftime('%Y%m%d')}-{i:04d}"

            log = models.RuleExecutionLog(
                rule_id=rule.id,
                rule_version_id=version.id,
                claim_id=claim_id,
                executed_at=day.replace(hour=random.randint(0, 23), minute=random.randint(0, 59), second=random.randint(0, 59)),
                severity=sev_choice,
                trigger_reasons=reasons,
                decision=decision_choice,
                amount=amount,
                input_payload={"seed": True, "amount": amount},
                execution_result=execution_result,
            )
            db.add(log)
            total_inserted += 1

    db.commit()
    print(f"Inserted {total_inserted} demo executions for rule {rule.rule_id}.")
    return total_inserted


def main():
    db = SessionLocal()
    try:
        rule, version = ensure_demo_rule(db)
        inserted = seed_executions(db, rule, version, days=60)
        print("Seed complete.")
        print(f"Rule ID: {rule.id} (rule_id={rule.rule_id}), Version: {version.version}")
        print("Open: /rule-performance?id=" + str(rule.id))
    finally:
        db.close()


if __name__ == "__main__":
    main()
