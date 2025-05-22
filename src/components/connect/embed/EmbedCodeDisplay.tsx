
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface EmbedCodeDisplayProps {
  getEmbedCode: () => string;
}

export const EmbedCodeDisplay: React.FC<EmbedCodeDisplayProps> = ({ getEmbedCode }) => {
  const [copyText, setCopyText] = useState("Copy");

  const handleCopy = () => {
    const embedCode = getEmbedCode();
    if (embedCode) {
      navigator.clipboard.writeText(embedCode);
      setCopyText("Copied!");
      toast({
        title: "Code copied",
        description: "The embed code has been copied to your clipboard."
      });
      setTimeout(() => setCopyText("Copy"), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Embed code</h3>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copyText}
        </Button>
      </div>
      
      <div className="relative border rounded-md bg-gray-50 p-4">
        <pre className="text-xs overflow-x-auto max-h-60">
          <code className="block whitespace-pre">
            {getEmbedCode()}
          </code>
        </pre>
      </div>
    </div>
  );
};
