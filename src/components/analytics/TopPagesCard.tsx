
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const TopPagesCard: React.FC = () => {
  return (
    <Card>
      <CardContent className="pt-6 h-full">
        <h2 className="text-xl font-semibold mb-6">Top pages</h2>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Coming Soon
        </div>
      </CardContent>
    </Card>
  );
};

export default TopPagesCard;
