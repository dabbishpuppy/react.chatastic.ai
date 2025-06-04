
import React from "react";

const LoadingDots: React.FC = () => (
  <div className="flex space-x-1 items-center">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "0ms", animationDuration: "0.8s"}}></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "200ms", animationDuration: "0.8s"}}></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: "400ms", animationDuration: "0.8s"}}></div>
  </div>
);

export default LoadingDots;
