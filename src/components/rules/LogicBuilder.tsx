import { useState } from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ConditionGroup, RuleCondition, LogicOperator } from '@/types/fraud';
import { fieldOptions, operatorOptions } from '@/data/mockData';

interface LogicBuilderProps {
  groups: ConditionGroup[];
  onChange: (groups: ConditionGroup[]) => void;
}

export function LogicBuilder({ groups, onChange }: LogicBuilderProps) {
  const addCondition = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions.push({
      id: Date.now().toString(),
      field: '',
      operator: 'greater',
      value: '',
    });
    onChange(newGroups);
  };

  const addGroup = () => {
    const newGroup: ConditionGroup = {
      id: Date.now().toString(),
      logicOperator: 'AND',
      conditions: [
        {
          id: Date.now().toString() + '-1',
          field: '',
          operator: 'greater',
          value: '',
        },
      ],
    };
    onChange([...groups, newGroup]);
  };

  const updateCondition = (
    groupIndex: number,
    conditionIndex: number,
    updates: Partial<RuleCondition>
  ) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions[conditionIndex] = {
      ...newGroups[groupIndex].conditions[conditionIndex],
      ...updates,
    };
    onChange(newGroups);
  };

  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions.splice(conditionIndex, 1);
    if (newGroups[groupIndex].conditions.length === 0) {
      newGroups.splice(groupIndex, 1);
    }
    onChange(newGroups);
  };

  const getOperatorLabel = (operator: LogicOperator) => {
    switch (operator) {
      case 'IF':
        return 'logic-if';
      case 'AND':
        return 'logic-and';
      case 'OR':
        return 'logic-or';
    }
  };

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <div key={group.id} className="relative">
          {/* Logic Operator Badge */}
          <div className="flex items-center gap-4 mb-3">
            <span className={cn('logic-operator', getOperatorLabel(group.logicOperator))}>
              {group.logicOperator}
            </span>
            {groupIndex === 0 && (
              <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                IF (A & B & C) THEN ...
              </code>
            )}
          </div>

          {/* Conditions */}
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            {group.conditions.map((condition, conditionIndex) => (
              <div
                key={condition.id}
                className="logic-block flex items-center gap-3 animate-fade-in"
              >
                <Select
                  value={condition.field}
                  onValueChange={(value) =>
                    updateCondition(groupIndex, conditionIndex, { field: value })
                  }
                >
                  <SelectTrigger className="w-44 bg-card">
                    <SelectValue placeholder="Select Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={condition.operator}
                  onValueChange={(value) =>
                    updateCondition(groupIndex, conditionIndex, { operator: value as any })
                  }
                >
                  <SelectTrigger className="w-36 bg-card">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operatorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={condition.value as string}
                  onChange={(e) =>
                    updateCondition(groupIndex, conditionIndex, { value: e.target.value })
                  }
                  placeholder="Value"
                  className="w-24 bg-card"
                />

                {condition.unit !== undefined && (
                  <span className="text-sm text-muted-foreground">{condition.unit}</span>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCondition(groupIndex, conditionIndex)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => groups.length > 0 && addCondition(groups.length - 1)}
          className="text-primary border-primary/30 hover:bg-primary/5"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Condition
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={addGroup}
          className="text-primary border-primary/30 hover:bg-primary/5"
        >
          <Layers className="w-4 h-4 mr-1.5" />
          Add Group
        </Button>
      </div>
    </div>
  );
}
