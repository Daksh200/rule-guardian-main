import json_logic

def evaluate_rule(logic: dict, payload: dict) -> dict:
    """
    Evaluate rule logic against input payload using json-logic.
    Returns {"result": boolean, "severity": string}
    Never crashes on invalid logic or payload.
    """
    try:
        # Extract severity from logic, default to "low"
        severity = logic.get("severity", "low")

        # Remove severity from logic for evaluation
        eval_logic = {k: v for k, v in logic.items() if k != "severity"}

        # Evaluate the logic
        result = json_logic.jsonLogic(eval_logic, payload)

        # Ensure result is boolean
        if not isinstance(result, bool):
            result = bool(result)

        return {
            "result": result,
            "severity": severity
        }
    except Exception as e:
        # On any error, return false with low severity
        return {
            "result": False,
            "severity": "low"
        }
