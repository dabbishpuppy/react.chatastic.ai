
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const HelpSection: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Need more help?</CardTitle>
        <CardDescription>Check out our documentation for more information on embedding your chatbot</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="mr-2">
          View Documentation
        </Button>
        <Button variant="outline">
          Contact Support
        </Button>
      </CardContent>
    </Card>
  );
};
