
import React from "react";
import { Activity, MessageSquare, FileText, User } from "lucide-react";

interface RecentActivityProps {
  teamId: string;
}

const RecentActivityFeed: React.FC<RecentActivityProps> = ({ teamId }) => {
  // In a real app, these would be fetched from an API based on the teamId
  const activities = [
    {
      id: 1,
      type: "message",
      agent: "Wonder AI",
      content: "Customer question about pricing resolved",
      time: "10 minutes ago",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: 2,
      type: "file",
      agent: "Agora AI",
      content: "Knowledge base updated with new documentation",
      time: "1 hour ago",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: 3,
      type: "user",
      agent: "Wonder AI",
      content: "New lead captured from website chat",
      time: "2 hours ago",
      icon: <User className="h-4 w-4" />,
    },
    {
      id: 4,
      type: "system",
      agent: "System",
      content: "Daily performance reports generated",
      time: "5 hours ago",
      icon: <Activity className="h-4 w-4" />,
    },
    {
      id: 5,
      type: "message",
      agent: "PristineBag AI",
      content: "Customer support ticket escalated to human agent",
      time: "Yesterday",
      icon: <MessageSquare className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className="mt-1 bg-primary/10 p-1 rounded-full text-primary">
            {activity.icon}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{activity.agent}</p>
            <p className="text-sm text-muted-foreground">{activity.content}</p>
            <p className="text-xs text-muted-foreground">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentActivityFeed;
