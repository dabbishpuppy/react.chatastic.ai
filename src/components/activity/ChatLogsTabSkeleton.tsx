
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ChatLogsTabSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border">
      <div className="h-[calc(100vh-240px)] overflow-y-auto overflow-x-hidden p-4 space-y-3">
        {/* Show multiple conversation placeholders for better UX */}
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="py-3 border-b last:border-b-0">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* Conversation title skeleton */}
                <Skeleton className={`h-4 mb-2 ${index % 3 === 0 ? 'w-3/4' : index % 3 === 1 ? 'w-2/3' : 'w-4/5'}`} />
                {/* Conversation snippet skeleton */}
                <Skeleton className={`h-3 ${index % 2 === 0 ? 'w-1/2' : 'w-3/5'}`} />
              </div>
              {/* Timestamp skeleton */}
              <Skeleton className="h-3 w-16 ml-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatLogsTabSkeleton;
