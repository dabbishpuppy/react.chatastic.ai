
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CollapsibleTrigger } from '@/components/ui/collapsible';

interface WebsiteSourceToggleProps {
  isOpen: boolean;
}

export const WebsiteSourceToggle: React.FC<WebsiteSourceToggleProps> = ({
  isOpen
}) => {
  return (
    <CollapsibleTrigger asChild>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>
    </CollapsibleTrigger>
  );
};
