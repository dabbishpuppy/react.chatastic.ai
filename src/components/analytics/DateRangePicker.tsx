import React, { useState } from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onClear: () => void;
}

type SelectionMode = 'start' | 'end' | 'complete';

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  startDate, 
  endDate, 
  onDateRangeChange,
  onClear 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('start');
  const [selectedRange, setSelectedRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined,
  });

  const presetRanges = [
    {
      label: "Last 7 Days",
      range: () => {
        const end = endOfDay(new Date());
        const start = startOfDay(subDays(end, 6));
        return { from: start, to: end };
      }
    },
    {
      label: "Last 30 Days",
      range: () => {
        const end = endOfDay(new Date());
        const start = startOfDay(subDays(end, 29));
        return { from: start, to: end };
      }
    },
    {
      label: "Last 3 Months",
      range: () => {
        const end = endOfDay(new Date());
        const start = startOfDay(subMonths(end, 3));
        return { from: start, to: end };
      }
    },
    {
      label: "Last 12 Months",
      range: () => {
        const end = endOfDay(new Date());
        const start = startOfDay(subMonths(end, 12));
        return { from: start, to: end };
      }
    }
  ];

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    const range = preset.range();
    setSelectedRange(range);
    setSelectionMode('complete');
    onDateRangeChange(
      format(range.from!, 'yyyy-MM-dd'),
      format(range.to!, 'yyyy-MM-dd')
    );
    setIsOpen(false);
  };

  const handleCalendarSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    console.log('Calendar select:', range, 'Current mode:', selectionMode);
    
    if (!range || !range.from) {
      // Reset if no valid selection
      setSelectedRange({ from: undefined, to: undefined });
      setSelectionMode('start');
      return;
    }
    
    // Update the selected range for visual feedback
    setSelectedRange(range);
    
    if (selectionMode === 'start' || !selectedRange.from) {
      // First click: selecting start date
      console.log('Setting start date, keeping picker open');
      setSelectionMode('end');
      // Do NOT close the picker or apply filter yet
    } else if (selectionMode === 'end') {
      // Second click: we're in end mode, check if we have a complete range
      if (range.from && range.to) {
        // Both dates are present - complete the selection
        console.log('Both dates selected, applying filter and closing picker');
        setSelectionMode('complete');
        onDateRangeChange(
          format(range.from, 'yyyy-MM-dd'),
          format(range.to, 'yyyy-MM-dd')
        );
        setIsOpen(false);
      } else if (range.from && !range.to) {
        // User clicked a new start date while in end mode - restart selection
        console.log('New start date selected, resetting to end mode');
        setSelectionMode('end');
      }
    }
  };

  const handlePopoverOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Reset selection mode when opening
      setSelectionMode(selectedRange.from && selectedRange.to ? 'complete' : 'start');
    }
  };

  const handleClear = () => {
    onClear();
    setSelectedRange({ from: undefined, to: undefined });
    setSelectionMode('start');
  };

  const displayText = startDate && endDate 
    ? `${startDate} ~ ${endDate}`
    : "Select date range";

  const getSelectionHint = () => {
    if (selectionMode === 'start') return "Select start date";
    if (selectionMode === 'end') return "Select end date";
    return "";
  };

  return (
    <Popover open={isOpen} onOpenChange={handlePopoverOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 text-sm bg-white min-w-[250px] justify-between"
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>{displayText}</span>
          </div>
          {startDate && endDate && (
            <X 
              className="h-4 w-4 text-muted-foreground cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Preset options */}
          <div className="w-40 border-r bg-gray-50 p-2">
            <div className="space-y-1">
              {presetRanges.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  className="w-full justify-start text-sm h-8 text-purple-600 hover:bg-purple-50"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Calendar */}
          <div className="p-3">
            {selectionMode !== 'complete' && (
              <div className="text-xs text-gray-500 mb-2 text-center">
                {getSelectionHint()}
              </div>
            )}
            <Calendar
              mode="range"
              defaultMonth={selectedRange?.from}
              selected={selectedRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              className="rounded-md border-0 pointer-events-auto"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
