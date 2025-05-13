
import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onClear: () => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  startDate, 
  endDate, 
  onClear 
}) => {
  return (
    <Button 
      variant="outline" 
      className="flex items-center gap-2 text-sm"
      onClick={(e) => e.preventDefault()}
    >
      <span>{startDate} ~ {endDate}</span>
      <X 
        className="h-4 w-4 text-muted-foreground cursor-pointer" 
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
      />
    </Button>
  );
};

export default DateRangePicker;
