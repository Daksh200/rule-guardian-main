#!/usr/bin/env python3
"""
Test script to populate sample rule executions and verify metrics calculation
"""
import sys
import os
sys.path.append('backend')

from app.database import SessionLocal, engine
from app import models, crud, schemas
from datetime import datetime, timedelta
import random

def create_sample_data():
    """Create sample rules and executions to test metrics"""
    db = SessionLocal()

    try:
        # Create sample user if not exists
        user = crud.get_user(db, 1)
        if not user:
            user = crud.create_user(db, schemas.UserCreate(
                email="test@example.com",
                password="test",
                full_name="Test User",
                initials="TU",
                role="admin"
            ))

        # Create sample rules
        rules_data = [
            {
                "rule_id": "RL-TEST-001",
                "name": "High Risk Transaction",
                "description": "Flags high value transactions",
                "category": "transaction",
                "severity": "high",
                "status": "active",
                "logic": {
                    "groups": [{
                        "id": "1",
                        "logicOperator": "IF",
                        "conditions": [{
                            "id": "1",
                            "field": "claim.amount",
                            "operator": "greater",
                            "value": "5000"
                        }]
                    }]
                },
                "tags": ["high-risk", "transaction"]
            },
            {
                "rule_id": "RL-TEST-002",
                "name": "Medium Risk Location",
                "description": "Flags transactions from suspicious locations",
                "category": "geolocation",
                "severity": "medium",
                "status": "active",
                "logic": {
                    "groups": [{
                        "id": "1",
                        "logicOperator": "IF",
                        "conditions": [{
                            "id": "1",
                            "field": "geo_distance",
                            "operator": "greater",
                            "value": "100"
                        }]
                    }]
                },
                "tags": ["location", "medium-risk"]
            }
        ]

        created_rules = []
        for rule_data in rules_data:
            rule = crud.create_rule(db, schemas.RuleCreate(**rule_data), user.id)
            created_rules.append(rule)

            # Create active version for each rule
            crud.create_rule_version(
                db, rule.id, "v1.0", rule.logic, user.id,
                "Initial version", True
            )

        # Create sample executions for the last 24 hours
        now = datetime.now()
        for i in range(50):  # Create 50 sample executions
            execution_time = now - timedelta(hours=random.uniform(0, 24))

            # Randomly select a rule
            rule = random.choice(created_rules)

            # Create sample payload
            payload = {
                "claim": {
                    "amount": random.uniform(1000, 10000),
                    "submission_count": random.randint(1, 5)
                },
                "claimant": {
                    "ip_address": f"192.168.1.{random.randint(1, 255)}"
                },
                "geo_distance": random.uniform(0, 200),
                "document": {
                    "hash": f"hash{random.randint(1000, 9999)}"
                },
                "device": {
                    "id": f"device{random.randint(100, 999)}",
                    "is_new": random.choice([True, False])
                },
                "transaction": {
                    "count": random.randint(1, 10)
                },
                "distinct_claims": random.randint(1, 5),
                "claim_id": f"CLAIM-{random.randint(10000, 99999)}"
            }

            # Determine if rule should trigger based on its logic
            should_trigger = False
            if rule.rule_id == "RL-TEST-001" and payload["claim"]["amount"] > 5000:
                should_trigger = True
            elif rule.rule_id == "RL-TEST-002" and payload["geo_distance"] > 100:
                should_trigger = True

            # Create execution log
            crud.create_execution_log(
                db=db,
                rule_id=rule.id,
                rule_version_id=1,  # Assume version 1
                input_payload=payload,
                execution_result=should_trigger,
                severity=rule.severity,
                trigger_reasons=["amount > 5000"] if should_trigger and rule.rule_id == "RL-TEST-001" else ["geo_distance > 100"] if should_trigger else [],
                amount=payload["claim"]["amount"],
                claim_id=payload["claim_id"],
                decision=random.choice(["pending", "fraud", "legitimate"])
            )

        print("✅ Sample data created successfully!")
        print(f"Created {len(created_rules)} rules")
        print("Created 50 sample executions in the last 24 hours")

        # Test the metrics
        print("\n📊 Testing Metrics Calculation:")
        for rule in created_rules:
            stats = crud.get_rule_stats(db, rule.id)
            print(f"Rule: {rule.name}")
            print(f"  - Triggers 24h: {stats['triggers_24h']}")
            print(f"  - Triggers 7d: {stats['triggers_7d']}")
            print(f"  - Triggers 30d: {stats['triggers_30d']}")

        # Test frontend stats calculation
        all_rules = crud.get_rules(db)
        total_triggers_24h = sum(crud.get_rule_stats(db, r.id)["triggers_24h"] for r in all_rules)
        print(f"\n🎯 Frontend Stats Preview:")
        print(f"Total Triggers 24h: {total_triggers_24h}")

        # Calculate avg fraud score
        total_weighted_score = 0
        total_triggers = 0
        for rule in all_rules:
            if rule.status == models.RuleStatus.active:
                triggers = crud.get_rule_stats(db, rule.id)["triggers_24h"]
                if triggers > 0:
                    severity_score = 90 if rule.severity == models.Severity.high else 60 if rule.severity == models.Severity.medium else 30
                    total_weighted_score += severity_score * triggers
                    total_triggers += triggers

        avg_score = round(total_weighted_score / total_triggers, 1) if total_triggers > 0 else 0
        print(f"Avg Fraud Score: {avg_score}/100")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    # Create tables first
    models.Base.metadata.create_all(bind=engine)
    create_sample_data()
