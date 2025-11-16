'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, CheckCircle, XCircle, Loader2, RefreshCw, ToggleLeft, ToggleRight, Eye } from 'lucide-react';
import api from '@/lib/api';
import { useNotificationStore } from '@/lib/store';
import dynamic from 'next/dynamic';

const EmailPreview = dynamic(() => import('./EmailPreview'), { ssr: false });

interface EmailMonitorProps {
  userId?: string;
}

interface EmailLog {
  id: string;
  subject: string;
  sender: string;
  processed_at: string;
  changes_detected: number;
}

export default function EmailMonitor({ userId }: EmailMonitorProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [recentEmails, setRecentEmails] = useState<EmailLog[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const checkMonitoringStatus = useCallback(async () => {
    try {
      const response = await api.get('/gmail/status', {
        params: { user_id: userId || 'current' },
      });
      // Enable monitoring toggle if user has Google token, but only set isMonitoring if actually enabled
      setIsMonitoring(response.data.is_monitoring_enabled || false);
    } catch (error) {
      // Silent fail - monitoring might not be set up
      setIsMonitoring(false);
    }
  }, [userId]);

  const loadRecentEmails = useCallback(async () => {
    try {
      const response = await api.get('/gmail/recent', {
        params: { user_id: userId || 'current' },
      });
      setRecentEmails(response.data.emails || []);
    } catch (error) {
      // Silent fail - monitoring might not be set up
    }
  }, [userId]);

  useEffect(() => {
    // Check monitoring status on mount
    checkMonitoringStatus();
    loadRecentEmails();
  }, [checkMonitoringStatus, loadRecentEmails]);

  const handleToggleMonitoring = async () => {
    setIsToggling(true);
    try {
      if (isMonitoring) {
        await api.post('/gmail/monitor/disable', null, {
          params: { user_id: userId || 'current' },
        });
        addNotification({
          message: 'Email monitoring disabled',
          type: 'info',
        });
        setIsMonitoring(false);
      } else {
        await api.post('/gmail/monitor/enable', null, {
          params: { user_id: userId || 'current' },
        });
        addNotification({
          message: 'Email monitoring enabled',
          type: 'success',
        });
        setIsMonitoring(true);
      }
    } catch (error: any) {
      addNotification({
        message: error.response?.data?.detail || 'Failed to toggle email monitoring',
        type: 'error',
      });
      // Refresh status on error
      checkMonitoringStatus();
    } finally {
      setIsToggling(false);
    }
  };

  const handleCheckNow = async () => {
    setIsChecking(true);
    const previousEmailCount = recentEmails.length;

    try {
      await api.post('/gmail/check', null, {
        params: { user_id: userId || 'current' },
      });

      addNotification({
        message: 'Checking your emails for deadline changes...',
        type: 'info',
      });

      // Reload recent emails after processing
      setTimeout(async () => {
        try {
          const response = await api.get('/gmail/recent', {
            params: { user_id: userId || 'current' },
          });
          const newEmails = response.data.emails || [];
          setRecentEmails(newEmails);

          // Show meaningful feedback
          if (newEmails.length > previousEmailCount) {
            const newCount = newEmails.length - previousEmailCount;
            const changesCount = newEmails
              .slice(0, newCount)
              .reduce((sum: number, email: EmailLog) => sum + (email.changes_detected || 0), 0);

            if (changesCount > 0) {
              addNotification({
                message: `Found ${newCount} new email(s) with ${changesCount} deadline change(s)!`,
                type: 'success',
              });
            } else {
              addNotification({
                message: `Processed ${newCount} new email(s), no deadline changes detected.`,
                type: 'info',
              });
            }
          } else {
            addNotification({
              message: 'No new emails found. Your inbox is up to date!',
              type: 'info',
            });
          }
        } catch (error) {
          console.error('Failed to reload emails:', error);
        }
      }, 4000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail;

      if (errorMessage?.includes('not connected')) {
        addNotification({
          message: 'Please connect your Google Calendar first to enable email monitoring.',
          type: 'error',
        });
      } else if (errorMessage?.includes('not enabled')) {
        addNotification({
          message: 'Email monitoring is disabled. Please enable it first.',
          type: 'error',
        });
      } else {
        addNotification({
          message: errorMessage || 'Failed to check emails. Please try again.',
          type: 'error',
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="relative bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 dark:from-green-500/10 dark:to-emerald-500/10 rounded-2xl opacity-0 hover:opacity-100 transition-opacity"></div>
      <div className="relative">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/30">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Monitoring</h3>
        </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Monitor Gmail for deadline changes
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Automatically detect when professors update assignment deadlines
            </p>
          </div>
          <button
            onClick={handleToggleMonitoring}
            disabled={isToggling}
            className="relative"
          >
            {isMonitoring ? (
              <ToggleRight className="w-10 h-10 text-green-500" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-gray-400" />
            )}
          </button>
        </div>

        {isMonitoring && (
          <div className="space-y-3">
            <button
              onClick={handleCheckNow}
              disabled={isChecking}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Check Now</span>
                </>
              )}
            </button>

            {recentEmails.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Recently Processed Emails
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recentEmails.map((email) => (
                    <div
                      key={email.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => setSelectedEmailId(email.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {email.subject}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {email.sender}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {email.changes_detected > 0 && (
                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded text-xs flex-shrink-0">
                              {email.changes_detected} change{email.changes_detected !== 1 ? 's' : ''}
                            </span>
                          )}
                          <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {new Date(email.processed_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isMonitoring && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <XCircle className="w-4 h-4" />
              <span className="text-xs">Monitoring is disabled</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Enable monitoring above to check emails for deadline changes
            </p>
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {selectedEmailId && (
        <EmailPreview
          emailId={selectedEmailId}
          onClose={() => setSelectedEmailId(null)}
        />
      )}
      </div>
    </div>
  );
}

