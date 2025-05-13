
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const EmbedTab: React.FC = () => {
  const [copyText, setCopyText] = useState("Copy");
  
  const handleCopy = () => {
    const scriptText = document.querySelector("pre code")?.textContent;
    if (scriptText) {
      navigator.clipboard.writeText(scriptText);
      setCopyText("Copied!");
      setTimeout(() => setCopyText("Copy"), 2000);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Embed</CardTitle>
          <CardDescription>Choose how to embed your agent on your website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-start space-x-4 p-4 border rounded-md">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  id="chat-bubble"
                  name="embed-option"
                  defaultChecked
                  className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="chat-bubble" className="font-medium">
                  Embed a chat bubble <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Recommended</span>
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Embed a chat bubble on your website. Allows you to use all the advanced features of the agent. Explore the <a href="#" className="text-blue-600 hover:underline">docs</a>.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-4 border rounded-md">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  id="iframe"
                  name="embed-option"
                  className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="iframe" className="font-medium">
                  Embed the iframe directly
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  Add the agent anywhere on your website
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuration</h3>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">On the site</h4>
              <p className="text-sm text-gray-500">www.example.com</p>
              
              <div className="relative border rounded-md bg-gray-50 p-4">
                <pre className="text-xs overflow-x-auto">
                  <code>
{`<script>
  (function(){if(!window.chatbase||window.chatbase("getState")=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[];}window.chatbase.q.push(arguments);};window.chatbase.d={};}})();
</script>`}
                  </code>
                </pre>
                <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={handleCopy}>
                  {copyText}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmbedTab;
