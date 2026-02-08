'use client';

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { Navigate, type ToolbarProps } from "react-big-calendar";
import * as Select from "@radix-ui/react-select";
import { SyncStatusIndicator, type SyncStatus } from "./sync-status-indicator";
import type { SyncResult } from "@/lib/sync/sync-engine";

interface CalendarToolbarProps<TEvent extends object = object> extends ToolbarProps<TEvent> {
  isMobile?: boolean;
  onCreateEvent?: () => void;
  syncStatus?: SyncStatus;
  lastSyncResult?: SyncResult;
  onSync?: () => void;
}

export function CalendarToolbar<TEvent extends object = object>({
  date,
  view,
  onNavigate,
  onView,
  label,
  isMobile = false,
  onCreateEvent,
  syncStatus,
  lastSyncResult,
  onSync,
}: CalendarToolbarProps<TEvent>) {
  // Desktop layout
  if (!isMobile) {
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

        {/* Right: Sync indicator + New Event button + View toggle buttons */}
        <div className="flex items-center gap-2">
          {syncStatus && onSync && (
            <SyncStatusIndicator
              status={syncStatus}
              lastSyncResult={lastSyncResult}
              onSync={onSync}
            />
          )}
          {onCreateEvent && (
            <Button
              variant="default"
              size="default"
              onClick={onCreateEvent}
              className="min-h-[44px] gap-2"
            >
              <Plus className="h-4 w-4" />
              New Event
            </Button>
          )}
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

  // Mobile layout
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 pb-3 mb-3">
      {/* First row: Prev, Date label, Next */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="default"
          onClick={() => onNavigate(Navigate.PREVIOUS)}
          className="min-h-[44px] min-w-[44px] px-3"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h2 className="text-base font-semibold text-center truncate flex-1">{label}</h2>

        <Button
          variant="outline"
          size="default"
          onClick={() => onNavigate(Navigate.NEXT)}
          className="min-h-[44px] min-w-[44px] px-3"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Second row: Today button, sync indicator, and View selector */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="default"
          onClick={() => onNavigate(Navigate.TODAY)}
          className="min-h-[44px]"
        >
          Today
        </Button>

        <div className="flex items-center gap-2">
          {syncStatus && onSync && (
            <SyncStatusIndicator
              status={syncStatus}
              lastSyncResult={lastSyncResult}
              onSync={onSync}
            />
          )}

          {/* View selector dropdown */}
          <Select.Root value={view} onValueChange={(value) => onView(value as typeof view)}>
            <Select.Trigger className="inline-flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 min-h-[44px] min-w-[120px] hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-black">
              <Select.Value>
                {view === 'month' ? 'Month' : view === 'week' ? 'Week' : 'Day'}
              </Select.Value>
              <Select.Icon>
                <ChevronDown className="h-4 w-4" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
                <Select.Viewport className="p-1">
                  <Select.Item
                    value="month"
                    className="relative flex items-center rounded px-8 py-2 text-sm text-zinc-900 outline-none cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100"
                  >
                    <Select.ItemText>Month</Select.ItemText>
                  </Select.Item>
                  <Select.Item
                    value="week"
                    className="relative flex items-center rounded px-8 py-2 text-sm text-zinc-900 outline-none cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100"
                  >
                    <Select.ItemText>Week</Select.ItemText>
                  </Select.Item>
                  <Select.Item
                    value="day"
                    className="relative flex items-center rounded px-8 py-2 text-sm text-zinc-900 outline-none cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100"
                  >
                    <Select.ItemText>Day</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>
    </div>
  );
}
