'use client';

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Navigate, type ToolbarProps } from "react-big-calendar";

export function CalendarToolbar<TEvent extends object = object>({
  date,
  view,
  onNavigate,
  onView,
  label
}: ToolbarProps<TEvent>) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4">
      {/* Left: Navigation buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="default"
          onClick={() => onNavigate(Navigate.TODAY)}
          className="min-h-[44px]"
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={() => onNavigate(Navigate.PREVIOUS)}
          className="min-h-[44px] px-3"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={() => onNavigate(Navigate.NEXT)}
          className="min-h-[44px] px-3"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Center: Current date label */}
      <h2 className="text-lg font-semibold">{label}</h2>

      {/* Right: View toggle buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant={view === 'month' ? 'default' : 'outline'}
          size="default"
          onClick={() => onView('month')}
          className="min-h-[44px]"
        >
          Month
        </Button>
        <Button
          variant={view === 'week' ? 'default' : 'outline'}
          size="default"
          onClick={() => onView('week')}
          className="min-h-[44px]"
        >
          Week
        </Button>
        <Button
          variant={view === 'day' ? 'default' : 'outline'}
          size="default"
          onClick={() => onView('day')}
          className="min-h-[44px]"
        >
          Day
        </Button>
      </div>
    </div>
  );
}
