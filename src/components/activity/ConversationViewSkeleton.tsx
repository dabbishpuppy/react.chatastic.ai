
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ConversationViewSkeleton: React.FC = () => {
  return (
    <div className="h-[calc(100vh-240px)] bg-white rounded-lg border overflow-hidden">
      {/* Header skeleton */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      
      {/* Messages skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] ${index % 2 === 0 ? 'flex items-start space-x-2' : ''}`}>
              {index % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
              <div className={`p-3 rounded-lg ${index % 2 === 0 ? 'bg-gray-100' : 'bg-blue-500'}`}>
                <Skeleton className={`h-4 ${index % 2 === 0 ? 'w-48' : 'w-32'} ${index % 2 === 1 ? 'bg-blue-400' : ''}`} />
                {Math.random() > 0.5 && (
                  <Skeleton className={`h-4 ${index % 2 === 0 ? 'w-32' : 'w-24'} mt-2 ${index % 2 === 1 ? 'bg-blue-400' : ''}`} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationViewSkeleton;
