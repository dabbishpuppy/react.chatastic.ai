
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmbedCodeDisplayProps {
  title: string;
  description: string;
  code: string;
  language?: string;
}

const EmbedCodeDisplay: React.FC<EmbedCodeDisplayProps> = ({
  title,
  description,
  code,
  language = "html"
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
            <code>{code}</code>
          </pre>
          <Button
            onClick={copyToClipboard}
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmbedCodeDisplay;
