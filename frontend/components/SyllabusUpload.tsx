'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { useNotificationStore } from '@/lib/store';
import EditableAssignmentTable from './EditableAssignmentTable';

interface ParsedAssignment {
  title: string;
  description?: string | null;
  due_date: string;
  assignment_type: string;
}

interface EditableAssignment extends ParsedAssignment {
  id: string;
  isNew?: boolean;
  isEdited?: boolean;
}

interface UploadResponse {
  filename: string;
  course_name: string;
  assignments_found: number;
  assignments: ParsedAssignment[];
}

interface SyllabusUploadProps {
  onUploadSuccess?: (data: UploadResponse) => void;
  courseName?: string;
}

export default function SyllabusUpload({ onUploadSuccess, courseName: initialCourseName }: SyllabusUploadProps) {
  const [courseName, setCourseName] = useState(initialCourseName || '');
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<UploadResponse | null>(null);
  const [editableAssignments, setEditableAssignments] = useState<EditableAssignment[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Convert parsed assignments to editable format
  useEffect(() => {
    if (parsedData?.assignments) {
      const editable = parsedData.assignments.map((assignment, index) => ({
        ...assignment,
        id: `parsed-${index}`,
        isNew: false,
        isEdited: false,
      }));
      setEditableAssignments(editable);
      setHasUnsavedChanges(false);
    }
  }, [parsedData]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && editableAssignments.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, editableAssignments]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      setError('Only PDF files are supported');
      return;
    }

    setUploadedFile(file);
    setError(null);
    setUploading(true);
    setParsedData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (courseName) {
        formData.append('course_name', courseName);
      }

      const response = await api.post('/syllabi/upload', formData) as { data: UploadResponse };

      setParsedData(response.data);
      // Don't call onUploadSuccess here - wait for user to confirm assignments
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload syllabus');
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  }, [courseName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleAssignmentsChange = (assignments: EditableAssignment[]) => {
    setEditableAssignments(assignments);
    setHasUnsavedChanges(true);
  };

  const validateAllAssignments = (): boolean => {
    if (editableAssignments.length === 0) {
      setError('Please add at least one assignment');
      return false;
    }

    // Check for required fields
    for (const assignment of editableAssignments) {
      if (!assignment.title?.trim()) {
        setError('All assignments must have a title');
        return false;
      }
      if (!assignment.due_date) {
        setError('All assignments must have a due date');
        return false;
      }
    }

    return true;
  };

  const handleConfirm = async () => {
    console.log('handleConfirm called', { editableAssignments, courseName });

    if (!validateAllAssignments()) {
      return;
    }

    // Get course name - prioritize user input, fallback to parsed data, or use filename as last resort
    const finalCourseName = courseName?.trim() ||
                           parsedData?.course_name?.trim() ||
                           parsedData?.filename?.replace('.pdf', '').trim();
    console.log('Final course name:', finalCourseName);

    if (!finalCourseName) {
      setError('Please enter a course name before saving assignments');
      // Focus on the course name input
      const input = document.getElementById('course-name');
      if (input) {
        (input as HTMLInputElement).focus();
      }
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      // Convert editable assignments back to ParsedAssignment format
      const assignmentsToSave: ParsedAssignment[] = editableAssignments.map((assignment) => ({
        title: assignment.title.trim(),
        description: assignment.description?.trim() || null,
        due_date: assignment.due_date,
        assignment_type: assignment.assignment_type,
      }));

      console.log('Sending request:', {
        course_name: finalCourseName,
        assignments_count: assignmentsToSave.length
      });

      const response = await api.post('/syllabi/confirm', {
        course_name: finalCourseName,
        assignments: assignmentsToSave,
      });

      console.log('Response received:', response.data);

      setError(null);
      const successMsg = response.data?.message || `Successfully saved ${assignmentsToSave.length} assignments!`;
      setSuccess(successMsg);
      setHasUnsavedChanges(false);

      addNotification({
        message: successMsg,
        type: 'success',
      });

      // Show success message
      if (onUploadSuccess && parsedData) {
        onUploadSuccess(parsedData);
      }

      // Reset form after a short delay
      setTimeout(() => {
        setUploadedFile(null);
        setParsedData(null);
        setEditableAssignments([]);
        setCourseName('');
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error confirming upload:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to save assignments';
      setError(errorMsg);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges && editableAssignments.length > 0) {
      setShowCancelConfirm(true);
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setUploadedFile(null);
    setParsedData(null);
    setEditableAssignments([]);
    setCourseName('');
    setSuccess(null);
    setError(null);
    setHasUnsavedChanges(false);
    setShowCancelConfirm(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="space-y-4">
        <label htmlFor="course-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Course Name {parsedData && !courseName?.trim() && !parsedData.course_name?.trim() && (
            <span className="text-red-500">*</span>
          )}
        </label>
        <input
          id="course-name"
          type="text"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="e.g., CS 101 - Introduction to Computer Science"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          disabled={uploading}
          required={!!(parsedData && !courseName?.trim() && !parsedData.course_name?.trim())}
        />
        {parsedData && !courseName?.trim() && !parsedData.course_name?.trim() && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            ⚠️ Course name is required to save assignments
          </p>
        )}
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}
          dark:bg-gray-800
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400">Uploading and parsing syllabus...</p>
            </>
          ) : uploadedFile ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{uploadedFile.name}</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF syllabus'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">or click to select</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <XCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}

      {parsedData && editableAssignments.length > 0 && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <p className="font-medium text-blue-800 dark:text-blue-300">
                Found {parsedData.assignments_found} assignment{parsedData.assignments_found !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Review and edit the assignments below. You can modify details, add new assignments, or delete unwanted ones before saving to your calendar.
            </p>
          </div>

          <EditableAssignmentTable
            assignments={editableAssignments}
            onChange={handleAssignmentsChange}
          />

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={confirming}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleConfirm();
              }}
              disabled={confirming || editableAssignments.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Saving to Calendar...
                </>
              ) : (
                `Save ${editableAssignments.length} Assignment${editableAssignments.length !== 1 ? 's' : ''} to Calendar`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full space-y-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Unsaved Changes
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              You have unsaved changes. Are you sure you want to cancel? All edits will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                Continue Editing
              </button>
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

