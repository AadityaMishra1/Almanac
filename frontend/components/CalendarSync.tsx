'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useNotificationStore } from '@/lib/store';

interface CalendarSyncProps {
  userId?: string;
}

function CalendarSyncContent({ userId }: CalendarSyncProps) {
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [eventsCount, setEventsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const checkConnectionStatus = useCallback(async () => {
    try {
      // Check if user has connected by trying to get events
      // If they don't have a token, the sync endpoint will tell us
      const response = await api.get('/calendar/events', {
        params: { user_id: userId || 'current' },
      });
      const hasEvents = response.data.events?.length > 0;
      const storedConnection = typeof window !== 'undefined' ? localStorage.getItem('google_calendar_connected') === 'true' : false;

      // If we can get events (even if empty), user is connected
      setIsConnected(true);
      setEventsCount(response.data.events?.length || 0);
    } catch (error: any) {
      // If we get a 400 or 401, user is not connected
      if (error.response?.status === 400 || error.response?.status === 401) {
        setIsConnected(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('google_calendar_connected');
        }
      } else {
        // Other errors - check stored connection
        const storedConnection = typeof window !== 'undefined' ? localStorage.getItem('google_calendar_connected') === 'true' : false;
        setIsConnected(storedConnection);
      }
    }
  }, [userId]);

  useEffect(() => {
    // Check if redirected from OAuth success
    const calendarConnected = searchParams?.get('calendar_connected') === 'true';
    const storedConnection = typeof window !== 'undefined' ? localStorage.getItem('google_calendar_connected') === 'true' : false;

    if (calendarConnected || storedConnection) {
      setIsConnected(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('google_calendar_connected', 'true');
      }
      // Clear URL param if present
      if (calendarConnected && typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    // Also check connection status via API
    checkConnectionStatus();
  }, [searchParams, checkConnectionStatus]);

  const handleConnect = async () => {
    setError(null); // Clear any previous errors
    setIsConnecting(true);
    try {
      console.log('Attempting to connect Google Calendar...');
      const response = await api.get('/calendar/oauth/authorize');
      console.log('Response:', response.data);
      
      if (response.data.auth_url) {
        // Redirect to Google OAuth
        console.log('Redirecting to:', response.data.auth_url);
        window.location.href = response.data.auth_url;
      } else {
        throw new Error('No auth URL returned from server');
      }
    } catch (error: any) {
      console.error('Error connecting Google Calendar:', error);
      
      let errorMessage = 'Failed to connect Google Calendar';
      
      if (!error.response) {
        // Network error - backend not running
        errorMessage = 'Backend server is not running. Please start the backend server first.';
      } else if (error.response?.status === 404) {
        errorMessage = 'OAuth endpoint not found. Please check backend configuration.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      addNotification({
        message: errorMessage,
        type: 'error',
      });
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      console.log('Attempting to sync calendar...');
      const response = await api.post('/calendar/sync', null, {
        params: { user_id: userId || 'current' },
      });
      
      console.log('Sync response:', response.data);
      const eventsCount = response.data.events_created || 0;
      addNotification({
        message: `Successfully synced ${eventsCount} event${eventsCount !== 1 ? 's' : ''} to Google Calendar`,
        type: 'success',
      });
      
      await checkConnectionStatus();
    } catch (error: any) {
      console.error('Sync error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to sync calendar';
      setError(errorMsg);
      addNotification({
        message: errorMsg,
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="relative bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-2xl opacity-0 hover:opacity-100 transition-opacity"></div>
      <div className="relative">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Google Calendar</h3>
        </div>

      {isConnected ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Connected to Google Calendar</span>
          </div>
          
          {eventsCount > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {eventsCount} event{eventsCount !== 1 ? 's' : ''} synced
            </p>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                setIsConnected(false);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('google_calendar_connected');
                }
              }}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connect your Google Calendar to automatically sync assignments and deadlines.
          </p>
          
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                <span>Connect Google Calendar</span>
              </>
            )}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

export default function CalendarSync({ userId }: CalendarSyncProps) {
  return (
    <Suspense fallback={
      <div className="p-6 border rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    }>
      <CalendarSyncContent userId={userId} />
    </Suspense>
  );
}

