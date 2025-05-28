
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ChatLogsTabSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border">
      <div className="h-[calc(100vh-240px)] overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="py-4 border-b last:border-b-0">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-16 ml-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatLogsTabSkeleton;
