'use client';

import { useState, useEffect } from 'react';
import { getHours, getMinutes } from 'date-fns';

interface CurrentTimeIndicatorProps {
  hourHeight: number; // pixels per hour (e.g., 64)
}

export function CurrentTimeIndicator({ hourHeight }: CurrentTimeIndicatorProps) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const hours = getHours(now);
      const minutes = getMinutes(now);
      const newPosition = hours * hourHeight + (minutes / 60) * hourHeight;
      setPosition(newPosition);
    };

    // Update immediately
    updatePosition();

    // Update every minute
    const interval = setInterval(updatePosition, 60000);

    return () => clearInterval(interval);
  }, [hourHeight]);

  return (
    <div
      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
      style={{ top: `${position}px` }}
      aria-label="Current time indicator"
    >
      {/* Pulsing dot */}
      <div className="relative w-3 h-3 -ml-1.5">
        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
        <div className="relative bg-red-500 rounded-full w-3 h-3" />
      </div>
      {/* Red line */}
      <div className="flex-1 h-0.5 bg-red-500 shadow-sm" />
    </div>
  );
}
