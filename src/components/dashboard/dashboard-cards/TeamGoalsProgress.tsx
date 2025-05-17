
import React from "react";
import { Progress } from "@/components/ui/progress";

interface TeamGoalsProgressProps {
  teamId: string;
}

const TeamGoalsProgress: React.FC<TeamGoalsProgressProps> = ({ teamId }) => {
  // In a real application, fetch team goals based on teamId
  // These are sample goals
  const goals = [
    {
      id: 1,
      name: "Customer Satisfaction",
      target: 95,
      current: 92,
      unit: "%"
    },
    {
      id: 2,
      name: "Response Time",
      target: 30,
      current: 25,
      unit: "sec"
    },
    {
      id: 3,
      name: "Conversations Handled",
      target: 1000,
      current: 650,
      unit: ""
    },
    {
      id: 4,
      name: "Lead Generation",
      target: 200,
      current: 173,
      unit: ""
    },
    {
      id: 5,
      name: "Knowledge Base Usage",
      target: 500,
      current: 312,
      unit: ""
    }
  ];

  return (
    <div className="space-y-6">
      {goals.map(goal => {
        const percentage = Math.min(Math.round((goal.current / goal.target) * 100), 100);
        return (
          <div key={goal.id} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{goal.name}</span>
              <span className="text-sm font-medium">
                {goal.current}{goal.unit} / {goal.target}{goal.unit}
              </span>
            </div>
            <div className="space-y-1">
              <Progress value={percentage} className="h-2" />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{percentage}% Complete</span>
                {percentage >= 100 ? (
                  <span className="text-green-600 font-medium">Target Reached!</span>
                ) : (
                  <span>{goal.target - goal.current}{goal.unit} to go</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeamGoalsProgress;
