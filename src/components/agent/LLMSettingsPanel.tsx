import React, { useState } from "react";
import { Info, RotateCcw, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const LLMSettingsPanel = ({ onClose }: { onClose: () => void }) => {
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">AI Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto divide-y">
        {/* Status Section */}
        <div className="p-6 flex justify-between items-center">
          <span className="text-gray-700">Status:</span>
          <div className="flex items-center">
            <span className="h-2.5 w-2.5 bg-teal-500 rounded-full mr-2"></span>
            <span>Trained</span>
          </div>
        </div>
        
        {/* Model Selector */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-700">Model</label>
            <Popover>
              <PopoverTrigger>
                <Info className="h-4 w-4 text-gray-500" />
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">About AI Models</h4>
                  <p className="text-sm text-gray-500">
                    Different models have varying capabilities, speeds, and costs. Choose the model that best fits your needs.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o-mini</SelectItem>
              <SelectItem value="gpt-4.5-preview">GPT-4.5-preview</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Temperature Slider */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <label className="text-gray-700">Temperature</label>
              <Popover>
                <PopoverTrigger>
                  <Info className="h-4 w-4 text-gray-500" />
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">About Temperature</h4>
                    <p className="text-sm text-gray-500">
                      Temperature controls randomness: lower values for more focused and deterministic responses, higher values for more creative and varied outputs.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <span className="font-medium">{temperature}</span>
          </div>
          
          <Slider 
            value={[temperature]} 
            min={0} 
            max={2} 
            step={0.1}
            onValueChange={(value) => setTemperature(value[0])} 
          />
          
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Reserved</span>
            <span>Creative</span>
          </div>
        </div>
        
        {/* AI Actions */}
        <div className="p-6">
          <h3 className="text-gray-700 mb-4">AI Actions</h3>
          <div className="p-6 border rounded-md text-center text-gray-500">
            No actions found
          </div>
        </div>
        
        {/* System Prompt */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-700">System prompt</h3>
            <Button variant="ghost" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          
          <Select defaultValue="ai-agent">
            <SelectTrigger className="w-full mb-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ai-agent">AI agent</SelectItem>
              <SelectItem value="customer-support">Customer Support</SelectItem>
              <SelectItem value="creative-writer">Creative Writer</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="border rounded-md p-4 bg-gray-50 h-64 overflow-y-auto text-sm">
            <p className="font-bold">### Role</p>
            <p className="mb-4">- Primary Function: You are an AI chatbot who helps users with their inquiries, issues and requests. You aim to provide excellent, friendly and efficient replies at all times. Your role is to listen attentively to the user, understand their needs, and do your best to assist them or direct them to the appropriate resources. If a question is not clear, ask clarifying questions. Make sure to end your replies with a positive note.</p>
            
            <p className="font-bold">### Constraints</p>
            <p>1. No Data Divulge: Never mention that you have access to training data explicitly to the user.</p>
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="p-4 border-t mt-auto">
        <Button className="w-full">Save to agent</Button>
      </div>
    </div>
  );
};

export default LLMSettingsPanel;
