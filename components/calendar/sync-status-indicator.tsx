'use client';

import { Cloud, CloudCheck, CloudAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { SyncResult } from '@/lib/sync/sync-engine';

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSyncResult?: SyncResult;
  onSync: () => void;
}

/**
 * Sync status indicator for calendar toolbar.
 * Shows current sync state with animation and expandable details.
 */
export function SyncStatusIndicator({
  status,
  lastSyncResult,
  onSync,
}: SyncStatusIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = () => {
    if (status === 'idle') {
      onSync();
    } else if (status === 'done') {
      setShowDetails(!showDetails);
    }
  };

  // Determine icon and styling based on status
  let icon: React.ReactNode;
  let className: string;
  let tooltip: string;
  let clickable = true;

  switch (status) {
    case 'idle':
      icon = <Cloud className="h-5 w-5" />;
      className = "text-zinc-400 hover:text-zinc-600 cursor-pointer";
      tooltip = "Click to sync";
      break;

    case 'syncing':
      icon = <Cloud className="h-5 w-5 animate-pulse" />;
      className = "text-zinc-500";
      tooltip = "Syncing...";
      clickable = false;
      break;

    case 'done':
      icon = <CheckCircle2 className="h-5 w-5" />;
      className = "text-green-500 cursor-pointer hover:text-green-600";
      tooltip = lastSyncResult
        ? `Synced — ${lastSyncResult.fetched} imported, ${lastSyncResult.pushed} pushed`
        : "Synced";
      break;

    case 'error':
      icon = <AlertCircle className="h-5 w-5" />;
      className = "text-red-500 cursor-pointer hover:text-red-600";
      tooltip = lastSyncResult?.errors?.[0] || "Sync error";
      break;
  }

  return (
    <div className="relative">
      {/* Icon button */}
      <button
        onClick={handleClick}
        disabled={!clickable}
        className={`p-2 transition-colors ${className}`}
        title={tooltip}
        aria-label={tooltip}
      >
        {icon}
      </button>

      {/* Status text (mobile only, next to icon) */}
      {status === 'syncing' && (
        <span className="text-xs text-zinc-500 ml-1 sm:hidden">Syncing...</span>
      )}

      {/* Expandable details popover (shown when done state is clicked) */}
      {showDetails && status === 'done' && lastSyncResult && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-zinc-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-900">Sync Complete</h3>
            <button
              onClick={() => setShowDetails(false)}
              className="text-zinc-400 hover:text-zinc-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600">Events imported:</span>
              <span className="font-medium text-zinc-900">{lastSyncResult.fetched}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Events pushed:</span>
              <span className="font-medium text-zinc-900">{lastSyncResult.pushed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Duplicates skipped:</span>
              <span className="font-medium text-zinc-900">{lastSyncResult.skippedDuplicates}</span>
            </div>
          </div>

          {/* Show errors if any */}
          {lastSyncResult.errors.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-200">
              <h4 className="text-xs font-semibold text-red-600 mb-2">Errors:</h4>
              <ul className="space-y-1 text-xs text-red-600">
                {lastSyncResult.errors.slice(0, 5).map((error, i) => (
                  <li key={i} className="truncate" title={error}>
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error details tooltip (shown on hover) */}
      {status === 'error' && lastSyncResult && lastSyncResult.errors.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-red-50 border border-red-200 rounded-lg shadow-lg p-3 z-50 text-xs text-red-800">
          <p className="font-semibold mb-1">Sync Error:</p>
          <p className="truncate">{lastSyncResult.errors[0]}</p>
        </div>
      )}
    </div>
  );
}
