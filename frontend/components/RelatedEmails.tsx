'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, Loader2, Search, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import dynamic from 'next/dynamic';

const EmailPreview = dynamic(() => import('./EmailPreview'), { ssr: false });

interface RelatedEmailsProps {
  assignmentId?: string;
  courseId?: string;
  searchQuery?: string;
  title?: string;
}

interface EmailSummary {
  id: string;
  gmail_message_id: string;
  subject: string;
  sender: string;
  received_at: string;
  processed_at: string;
  changes_detected: number;
  contains_deadline_change: boolean;
}

export default function RelatedEmails({
  assignmentId,
  courseId,
  searchQuery,
  title = 'Related Emails',
}: RelatedEmailsProps) {
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);

  const loadRelatedEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { user_id: 'current' };
      if (assignmentId) params.assignment_id = assignmentId;
      if (courseId) params.course_id = courseId;
      if (searchQuery) params.search_query = searchQuery;

      const response = await api.get('/gmail/related', { params });
      setEmails(response.data.emails || []);
      setSearchTerms(response.data.search_terms || []);
    } catch (error) {
      console.error('Failed to load related emails:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, courseId, searchQuery]);

  useEffect(() => {
    loadRelatedEmails();
  }, [loadRelatedEmails]);

  if (loading) {
    return (
      <div className="p-6 border rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-center space-x-2 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Loading related emails...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Mail className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {emails.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {emails.length} email{emails.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {searchTerms.length > 0 && (
        <div className="mb-4 flex items-center flex-wrap gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">Searching for:</span>
          {searchTerms.map((term, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs"
            >
              {term}
            </span>
          ))}
        </div>
      )}

      {emails.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No related emails found
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
            Emails mentioning this assignment or course will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {emails.map((email) => (
            <div
              key={email.id}
              onClick={() => setSelectedEmailId(email.id)}
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start space-x-2">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate flex-1">
                      {email.subject || '(No Subject)'}
                    </p>
                    {email.contains_deadline_change && (
                      <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {email.sender}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(email.received_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {email.changes_detected > 0 && (
                      <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded text-xs">
                        {email.changes_detected} change{email.changes_detected !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email Preview Modal */}
      {selectedEmailId && (
        <EmailPreview emailId={selectedEmailId} onClose={() => setSelectedEmailId(null)} />
      )}
    </div>
  );
}
