'use client';

import { useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Clock, MapPin, GraduationCap, CheckCircle2 } from 'lucide-react';
import type { UnifiedEvent } from './types';
import { getEventColor, getEventIcon } from './utils';

interface EventDetailModalProps {
  event: UnifiedEvent;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const colors = getEventColor(event);
  const Icon = getEventIcon(event);

  // Get solid color for accent bar
  const borderColor = colors.border.includes('blue') ? '#3b82f6' :
                     colors.border.includes('red') ? '#ef4444' :
                     colors.border.includes('purple') ? '#a855f7' :
                     colors.border.includes('yellow') ? '#eab308' :
                     colors.border.includes('green') ? '#22c55e' :
                     '#6b7280';

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Focus close button on mount for accessibility
  useEffect(() => {
    const closeButton = document.getElementById('modal-close-button');
    closeButton?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-slide-in-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Color accent bar */}
        <div className="h-1" style={{ backgroundColor: borderColor }} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className={`${colors.bg} ${colors.border} border-l-2 rounded px-3 py-1.5 flex items-center gap-2`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} aria-hidden="true" />
                  <span className={`text-xs font-semibold ${colors.text} uppercase`}>
                    {event.assignment_type || 'Event'}
                  </span>
                </div>
                {event.is_synced_to_calendar && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" aria-hidden="true" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Synced</span>
                  </div>
                )}
              </div>
              <h3 id="modal-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {event.title}
              </h3>
              {event.course_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <GraduationCap className="w-4 h-4" aria-hidden="true" />
                  <span className="font-medium">{event.course_name}</span>
                  {event.course_code && (
                    <span className="text-gray-400 dark:text-gray-500">({event.course_code})</span>
                  )}
                </div>
              )}
            </div>
            <button
              id="modal-close-button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-4">
            {event.description && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {format(parseISO(event.start_time), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {format(parseISO(event.start_time), 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}
                  </div>
                </div>
              </div>

              {event.location && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">Location</div>
                    <div className="font-medium text-gray-900 dark:text-white">{event.location}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
