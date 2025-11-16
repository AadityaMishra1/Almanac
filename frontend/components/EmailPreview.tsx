'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import api from '@/lib/api';

interface EmailPreviewProps {
  emailId: string;
  onClose: () => void;
}

interface DetectedChange {
  type: string;
  assignment_title?: string;
  old_date?: string;
  new_date?: string;
  description?: string;
  course_name?: string;
  change?: any;
  result?: {
    success: boolean;
    message: string;
  };
}

interface EmailDetail {
  id: string;
  subject: string;
  sender: string;
  body: string;
  received_at: string;
  processed_at: string;
  contains_deadline_change: boolean;
  detected_changes: DetectedChange[];
}

export default function EmailPreview({ emailId, onClose }: EmailPreviewProps) {
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullBody, setShowFullBody] = useState(false);

  const loadEmailDetails = useCallback(async () => {
    try {
      const response = await api.get(`/gmail/email/${emailId}`, {
        params: { user_id: 'current' },
      });
      setEmail(response.data);
    } catch (error) {
      console.error('Failed to load email details:', error);
    } finally {
      setLoading(false);
    }
  }, [emailId]);

  useEffect(() => {
    loadEmailDetails();
  }, [loadEmailDetails]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading email...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-medium mb-4">Failed to load email</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'deadline_change':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      case 'new_assignment':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancellation':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Mail className="w-5 h-5 text-blue-500" />;
    }
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'deadline_change':
        return 'Deadline Changed';
      case 'new_assignment':
        return 'New Assignment';
      case 'cancellation':
        return 'Cancelled';
      default:
        return 'Change Detected';
    }
  };

  // Truncate body for preview
  const bodyPreview = email.body.substring(0, 500);
  const hasMoreContent = email.body.length > 500;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-6 flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <Mail className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white break-words">
                {email.subject || '(No Subject)'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                From: {email.sender}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Received: {formatDate(email.received_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Detected Changes */}
        {email.contains_deadline_change && email.detected_changes.length > 0 && (
          <div className="p-6 bg-orange-50 dark:bg-orange-900/20 border-b dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
              Changes Detected ({email.detected_changes.length})
            </h3>
            <div className="space-y-3">
              {email.detected_changes.map((change, idx) => {
                // Handle both the AI detection format and change handler result format
                const changeData = change.change || change;
                const result = change.result;

                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-start space-x-3">
                      {getChangeTypeIcon(changeData.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {getChangeTypeLabel(changeData.type)}
                          </span>
                          {result && (
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                result.success
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}
                            >
                              {result.success ? 'Applied' : 'Failed'}
                            </span>
                          )}
                        </div>

                        {changeData.assignment_title && (
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {changeData.assignment_title}
                          </p>
                        )}

                        {changeData.type === 'deadline_change' && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {changeData.old_date && (
                              <p>
                                <span className="font-medium">Old:</span>{' '}
                                {formatDate(changeData.old_date)}
                              </p>
                            )}
                            {changeData.new_date && (
                              <p>
                                <span className="font-medium">New:</span>{' '}
                                {formatDate(changeData.new_date)}
                              </p>
                            )}
                          </div>
                        )}

                        {changeData.type === 'new_assignment' && changeData.new_date && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Due:</span>{' '}
                            {formatDate(changeData.new_date)}
                          </p>
                        )}

                        {changeData.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            {changeData.description}
                          </p>
                        )}

                        {result && result.message && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
                            {result.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Email Body */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Email Content
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
                {showFullBody ? email.body : bodyPreview}
                {!showFullBody && hasMoreContent && '...'}
              </pre>
            </div>
            {hasMoreContent && (
              <button
                onClick={() => setShowFullBody(!showFullBody)}
                className="mt-3 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
              >
                {showFullBody ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>Show more</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 border-t dark:border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
