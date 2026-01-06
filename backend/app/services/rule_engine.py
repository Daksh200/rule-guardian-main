import json_logic

def convert_rule_logic_to_json_logic(rule_logic: dict) -> dict:
    """
    Convert RuleLogic format to json-logic format.
    RuleLogic has groups with logicOperator and conditions.
    """
    if not rule_logic or 'groups' not in rule_logic:
        return {}

    groups = rule_logic['groups']
    if not groups:
        return {}

    # For now, assume the first group is the main IF condition
    # and subsequent groups are AND/OR conditions
    main_group = groups[0]
    conditions = []

    # Convert conditions in the main group
    for condition in main_group['conditions']:
        json_logic_condition = convert_condition_to_json_logic(condition)
        if json_logic_condition:
            conditions.append(json_logic_condition)

    # If there are more groups, combine them
    if len(groups) > 1:
        all_conditions = [convert_group_to_json_logic(group) for group in groups]
        all_conditions = [c for c in all_conditions if c]
        if len(all_conditions) > 1:
            return {"and": all_conditions}
        elif all_conditions:
            return all_conditions[0]

    # Single group
    if len(conditions) > 1:
        return {"and": conditions}
    elif conditions:
        return conditions[0]

    return {}

def convert_group_to_json_logic(group: dict) -> dict:
    """Convert a ConditionGroup to json-logic"""
    conditions = []
    for condition in group['conditions']:
        json_logic_condition = convert_condition_to_json_logic(condition)
        if json_logic_condition:
            conditions.append(json_logic_condition)

    if not conditions:
        return {}

    operator = group.get('logicOperator', 'AND').lower()
    if operator == 'or':
        return {"or": conditions}
    else:  # 'if' or 'and'
        return {"and": conditions} if len(conditions) > 1 else conditions[0]

def convert_condition_to_json_logic(condition: dict) -> dict:
    """Convert a RuleCondition to json-logic"""
    field = condition.get('field', '')
    operator = condition.get('operator', '')
    value = condition.get('value', '')

    if not field or not operator:
        return {}

    # Map operators to json-logic
    operator_map = {
        'greater': '>',
        'less': '<',
        'equals': '==',
        'not_equals': '!=',
        'contains': 'in',
    }

    if operator in operator_map:
        return {operator_map[operator]: [{"var": field}, value]}
    elif operator == 'is_duplicate':
        # For duplicate check, we'll assume it's checking if the field value exists in some list
        # This is a simplification - in real implementation, you'd check against a database
        return {"in": [{"var": field}, ["duplicate_value1", "duplicate_value2"]]}  # Mock duplicates
    elif operator == 'within_time':
        # This is complex - for now, assume it's always true for testing
        return {"==": [1, 1]}  # Always true
    elif operator == 'count':
        return {">=": [{"var": f"{field}.length"}, value]}

    return {}

def evaluate_rule(logic: dict, payload: dict, severity: str = "low") -> dict:
    """
    Evaluate rule logic against input payload using json-logic.
    Returns {"result": boolean, "severity": string}
    Never crashes on invalid logic or payload.
    """
    try:
        # Convert RuleLogic to json-logic format
        json_logic_rules = convert_rule_logic_to_json_logic(logic)

        # Debug logging
        print(f"Original logic: {logic}")
        print(f"Converted json-logic: {json_logic_rules}")
        print(f"Payload: {payload}")

        # Evaluate the logic
        result = json_logic.jsonLogic(json_logic_rules, payload)

        # Ensure result is boolean
        if not isinstance(result, bool):
            result = bool(result)

        print(f"Evaluation result: {result}")

        return {
            "result": result,
            "severity": severity
        }
    except Exception as e:
        print(f"Error evaluating rule: {e}")
        # On any error, return false with low severity
        return {
            "result": False,
            "severity": "low"
        }
