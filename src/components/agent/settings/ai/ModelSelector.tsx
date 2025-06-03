
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { AI_MODELS } from "./AIModelData";

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="model" className="block text-sm font-medium">
        AI Model
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select an AI model" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-white">
          {AI_MODELS.map((modelOption) => (
            <HoverCard key={modelOption.value} openDelay={300} closeDelay={100}>
              <HoverCardTrigger asChild>
                <SelectItem value={modelOption.value} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <img 
                      src={modelOption.logo} 
                      alt={`${modelOption.provider} logo`}
                      className="w-5 h-5 object-contain flex-shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{modelOption.label}</span>
                      <span className="text-xs text-gray-500">{modelOption.provider}</span>
                    </div>
                  </div>
                </SelectItem>
              </HoverCardTrigger>
              <HoverCardContent 
                side="right" 
                className="w-96 p-4 bg-white border shadow-lg z-[100]"
                sideOffset={10}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <img 
                      src={modelOption.logo} 
                      alt={`${modelOption.provider} logo`}
                      className="w-8 h-8 object-contain"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">{modelOption.label}</h4>
                      <p className="text-sm text-gray-600">{modelOption.provider}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 leading-relaxed">{modelOption.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Cost:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        modelOption.cost === 'Very Low' ? 'bg-green-100 text-green-700' :
                        modelOption.cost === 'Low' ? 'bg-green-100 text-green-700' :
                        modelOption.cost === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        modelOption.cost === 'High' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {modelOption.cost}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Speed:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        modelOption.speed === 'Very Fast' ? 'bg-green-100 text-green-700' :
                        modelOption.speed === 'Fast' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {modelOption.speed}
                      </span>
                    </div>
                  </div>

                  {modelOption.contextWindow && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Context Window:</span>
                      <span className="text-sm text-gray-600">{modelOption.contextWindow}</span>
                    </div>
                  )}

                  {modelOption.creditsPerMessage && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Credits per Message:</span>
                      <span className="text-sm text-gray-600">{modelOption.creditsPerMessage}</span>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Capabilities:</p>
                    <div className="flex flex-wrap gap-1">
                      {modelOption.capabilities.map((capability, index) => (
                        <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
