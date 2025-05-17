
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, List, ListOrdered, Link2, Smile } from "lucide-react";

const TextTab: React.FC = () => {
  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">Text</h2>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-gray-600">
            Add and process plain text-based sources to train your AI Agent with precise information.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="text-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <Input 
              id="text-title" 
              placeholder="Ex: Refund requests" 
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="text-content" className="block text-sm font-medium text-gray-700 mb-1">
              Text
            </label>
            <Card className="border border-gray-200">
              <CardContent className="p-0">
                <div className="flex items-center p-2 border-b border-gray-200">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bold size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Italic size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ListOrdered size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <List size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Link2 size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Smile size={16} />
                  </Button>
                  <div className="ml-auto text-xs text-gray-400">0 B</div>
                </div>
                <Textarea 
                  id="text-content" 
                  placeholder="Enter your text" 
                  className="border-0 focus-visible:ring-0 min-h-[200px]"
                />
              </CardContent>
            </Card>
          </div>

          <div className="text-right mt-6">
            <Button className="bg-gray-800 hover:bg-gray-700">
              Add text snippet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextTab;
