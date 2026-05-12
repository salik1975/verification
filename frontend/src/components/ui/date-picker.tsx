import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  error?: string;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  className,
  label,
  required = false,
  error
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
  const [inputValue, setInputValue] = useState('');
  const [popupPosition, setPopupPosition] = useState<'bottom' | 'top'>('bottom');
  const [popupOffset, setPopupOffset] = useState({ x: 0, y: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);

  const formatDate = (date: Date): string => {
    try {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const formatDateForInput = (date: Date): string => {
    try {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside the main picker container
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        // Also check if click is on the popup itself (since it's fixed positioned)
        const popupElement = document.querySelector('[data-datepicker-popup]');
        if (popupElement && !popupElement.contains(target)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      if (value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          setCurrentDate(date);
          setInputValue(formatDate(date));
        }
      } else {
        setSelectedDate(null);
        setInputValue('');
      }
    } catch (error) {
      console.error('Error in useEffect:', error);
      setSelectedDate(null);
      setInputValue('');
    }
  }, [value]);

  const getTodayFormatted = (): string => {
    const today = new Date();
    return formatDate(today);
  };

  const getPlaceholderText = (): string => {
    return "DD-MM-YYYY";
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setInputValue(formatDate(date));
    onChange(formatDateForInput(date));
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const value = e.target.value;
      setInputValue(value);
      
      // Allow empty value
      if (!value.trim()) {
        setSelectedDate(null);
        onChange('');
        return;
      }
      
      // Try to parse the date from dd-mm-yyyy format
      const dateRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
      const match = value.match(dateRegex);
      
      if (match) {
        const [, day, month, year] = match;
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        
        // Validate date components
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
          const date = new Date(yearNum, monthNum - 1, dayNum);
          
          // Check if it's a valid date (handles leap years, etc.)
          if (date.getDate() === dayNum && 
              date.getMonth() === monthNum - 1 && 
              date.getFullYear() === yearNum) {
            setSelectedDate(date);
            onChange(formatDateForInput(date));
          }
        }
      } else {
        // Also try to parse yyyy-mm-dd format for better compatibility
        const isoDateRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
        const isoMatch = value.match(isoDateRegex);
        
        if (isoMatch) {
          const [, year, month, day] = isoMatch;
          const dayNum = parseInt(day);
          const monthNum = parseInt(month);
          const yearNum = parseInt(year);
          
          // Validate date components
          if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
            const date = new Date(yearNum, monthNum - 1, dayNum);
            
            // Check if it's a valid date
            if (date.getDate() === dayNum && 
                date.getMonth() === monthNum - 1 && 
                date.getFullYear() === yearNum) {
              setSelectedDate(date);
              onChange(formatDateForInput(date));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in handleInputChange:', error);
      // Don't update the selected date if there's an error, just let the user continue typing
    }
  };

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent input click event
    if (pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;
      const popupHeight = 320; // Approximate height of the popup
      const popupWidth = 280; // Approximate width of the popup
      
      // Calculate optimal position
      let position = 'bottom';
      let offsetX = 0;
      let offsetY = 0;
      
      // Check vertical positioning
      if (spaceBelow < popupHeight && spaceAbove > popupHeight) {
        position = 'top';
        offsetY = -popupHeight - 8; // 8px gap
      } else if (spaceBelow < popupHeight) {
        // If not enough space below and above, position it to fit
        if (spaceBelow > 0) {
          offsetY = spaceBelow - popupHeight - 8;
        } else {
          position = 'top';
          offsetY = -popupHeight - 8;
        }
      } else {
        offsetY = 8; // 8px gap below
      }
      
      // Check horizontal positioning
      if (spaceRight < popupWidth) {
        offsetX = spaceRight - popupWidth;
      }
      
      setPopupPosition(position as 'bottom' | 'top');
      setPopupOffset({ x: offsetX, y: offsetY });
    }
    setIsOpen(!isOpen);
  };

  const isDateDisabled = (date: Date): boolean => {
    if (min) {
      // Parse min date in local timezone by splitting the ISO string
      // This avoids timezone issues with new Date("YYYY-MM-DD") which parses as UTC
      const [year, month, day] = min.split('-').map(Number);
      const minDate = new Date(year, month - 1, day);
      if (date < minDate) return true;
    }
    if (max) {
      // Parse max date in local timezone
      const [year, month, day] = max.split('-').map(Number);
      const maxDate = new Date(year, month - 1, day);
      if (date > maxDate) return true;
    }
    return false;
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isSelected = selectedDate && 
        selectedDate.getDate() === day && 
        selectedDate.getMonth() === currentDate.getMonth() && 
        selectedDate.getFullYear() === currentDate.getFullYear();
      const isToday = new Date().toDateString() === date.toDateString();
      const isDisabled = isDateDisabled(date);

      days.push(
        <button
          key={day}
          onClick={() => !isDisabled && handleDateSelect(date)}
          disabled={isDisabled}
          className={cn(
            "h-8 w-8 rounded-md text-sm font-medium transition-colors",
            "hover:bg-primary hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            isSelected && "bg-primary text-primary-foreground",
            isToday && !isSelected && "bg-primary/10 text-primary border border-primary",
            isDisabled && "text-muted-foreground cursor-not-allowed opacity-50",
            !isSelected && !isToday && !isDisabled && "text-foreground"
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="relative" ref={pickerRef}>
      {label && (
        <Label className="text-sm font-medium text-foreground mb-1 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
                                        <div className={cn("flex items-center gap-2", className)}>
                     <Input
             type="text"
             value={inputValue}
             placeholder={getPlaceholderText()}
             onChange={handleInputChange}
            onKeyDown={(e) => {
              // Allow navigation keys, backspace, delete, and numbers
              const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
              const isNumber = /^[0-9]$/.test(e.key);
              const isAllowedKey = allowedKeys.includes(e.key);
              const isDash = e.key === '-';
              
              if (!isNumber && !isAllowedKey && !isDash) {
                e.preventDefault();
              }
            }}
                         className={cn(
               "w-48 text-sm bg-background border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 placeholder:text-muted-foreground/60",
               error ? 'border-red-500' : 'border-border'
             )}
          />
                                            <button
               type="button"
               onClick={handleCalendarClick}
               className="p-2 hover:bg-muted/30 rounded transition-colors duration-200"
             >
              <Calendar className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
           
           {/* Help tooltip */}
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <button
                   type="button"
                   className="p-2 hover:bg-muted/30 rounded transition-colors duration-200"
                 >
                   <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                 </button>
               </TooltipTrigger>
               <TooltipContent>
                 <p>Enter date in DD-MM-YYYY format</p>
                 <p>Example: 25-12-2024</p>
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
        </div>

             {isOpen && (
         <div 
           data-datepicker-popup
           className="fixed z-[9999] bg-background border border-border rounded-lg shadow-lg p-4 min-w-[280px]"
           style={{
             left: `${pickerRef.current?.getBoundingClientRect().left + popupOffset.x}px`,
             top: popupPosition === 'bottom' 
               ? `${(pickerRef.current?.getBoundingClientRect().bottom || 0) + popupOffset.y}px`
               : `${(pickerRef.current?.getBoundingClientRect().top || 0) + popupOffset.y}px`
           }}
         >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
