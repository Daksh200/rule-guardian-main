# Task: Replace Simulated Analytics with Real Data from RuleExecutionLog

## Steps to Complete
- [x] Update `get_rule_stats()` in `backend/app/crud.py` to compute all required metrics:
  - `triggers_24h`: count triggered executions in last 24h
  - `triggers_7d`: count triggered executions in last 7 days
  - `triggers_30d`: count triggered executions in last 30 days
  - `severity_distribution`: count triggered executions by severity (high, medium, low)
- [x] Ensure all counts only include executions where `execution_result = True`
- [x] Verify the updated function works correctly (import successful)
