'use client';

import { useState } from 'react';
import { Trash2, Plus, Calendar } from 'lucide-react';

interface EditableAssignment {
  id: string;
  title: string;
  description?: string | null;
  due_date: string;
  assignment_type: string;
  isNew?: boolean;
  isEdited?: boolean;
}

interface EditableAssignmentTableProps {
  assignments: EditableAssignment[];
  onChange: (assignments: EditableAssignment[]) => void;
}

const ASSIGNMENT_TYPES = [
  { value: 'homework', label: 'Homework' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'other', label: 'Other' },
];

export default function EditableAssignmentTable({
  assignments,
  onChange
}: EditableAssignmentTableProps) {
  const [errors, setErrors] = useState<Record<string, { field: string; message: string }>>({});

  const validateAssignment = (assignment: EditableAssignment, index: number): boolean => {
    const newErrors = { ...errors };
    const errorKey = assignment.id;

    // Clear previous errors for this assignment
    delete newErrors[errorKey];

    // Validate title
    if (!assignment.title?.trim()) {
      newErrors[errorKey] = { field: 'title', message: 'Title is required' };
      setErrors(newErrors);
      return false;
    }

    // Validate due date
    if (!assignment.due_date) {
      newErrors[errorKey] = { field: 'due_date', message: 'Due date is required' };
      setErrors(newErrors);
      return false;
    }

    setErrors(newErrors);
    return true;
  };

  const handleFieldChange = (
    id: string,
    field: keyof EditableAssignment,
    value: string
  ) => {
    const updatedAssignments = assignments.map((assignment) => {
      if (assignment.id === id) {
        return {
          ...assignment,
          [field]: value,
          isEdited: !assignment.isNew, // Mark as edited if not new
        };
      }
      return assignment;
    });

    onChange(updatedAssignments);

    // Clear error for this field if it exists
    const errorKey = id;
    if (errors[errorKey]?.field === field) {
      const newErrors = { ...errors };
      delete newErrors[errorKey];
      setErrors(newErrors);
    }
  };

  const handleDeleteAssignment = (id: string) => {
    const updatedAssignments = assignments.filter((assignment) => assignment.id !== id);
    onChange(updatedAssignments);

    // Clear errors for deleted assignment
    const newErrors = { ...errors };
    delete newErrors[id];
    setErrors(newErrors);
  };

  const handleAddAssignment = () => {
    const newAssignment: EditableAssignment = {
      id: `new-${Date.now()}`,
      title: '',
      description: '',
      due_date: new Date().toISOString().split('T')[0],
      assignment_type: 'homework',
      isNew: true,
    };

    onChange([...assignments, newAssignment]);
  };

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {assignments.map((assignment, index) => {
              const hasError = !!errors[assignment.id];
              const isEdited = assignment.isEdited;
              const isNew = assignment.isNew;

              return (
                <tr
                  key={assignment.id}
                  className={`
                    ${hasError ? 'bg-red-50 dark:bg-red-900/10' : ''}
                    ${isNew ? 'bg-green-50 dark:bg-green-900/10' : ''}
                    ${isEdited ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
                  `}
                >
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={assignment.title}
                      onChange={(e) =>
                        handleFieldChange(assignment.id, 'title', e.target.value)
                      }
                      placeholder="Assignment title"
                      className={`
                        w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        dark:bg-gray-800 dark:text-white
                        ${
                          hasError && errors[assignment.id]?.field === 'title'
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }
                      `}
                    />
                    {hasError && errors[assignment.id]?.field === 'title' && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {errors[assignment.id].message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      value={assignment.description || ''}
                      onChange={(e) =>
                        handleFieldChange(assignment.id, 'description', e.target.value)
                      }
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={formatDateForInput(assignment.due_date)}
                      onChange={(e) =>
                        handleFieldChange(assignment.id, 'due_date', e.target.value)
                      }
                      className={`
                        w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        dark:bg-gray-800 dark:text-white
                        ${
                          hasError && errors[assignment.id]?.field === 'due_date'
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }
                      `}
                    />
                    {hasError && errors[assignment.id]?.field === 'due_date' && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {errors[assignment.id].message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={assignment.assignment_type}
                      onChange={(e) =>
                        handleFieldChange(assignment.id, 'assignment_type', e.target.value)
                      }
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    >
                      {ASSIGNMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Delete assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {assignments.map((assignment, index) => {
          const hasError = !!errors[assignment.id];
          const isEdited = assignment.isEdited;
          const isNew = assignment.isNew;

          return (
            <div
              key={assignment.id}
              className={`
                border rounded-lg p-4 space-y-3
                ${hasError ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}
                ${isNew && !hasError ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : ''}
                ${isEdited && !hasError && !isNew ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={assignment.title}
                      onChange={(e) =>
                        handleFieldChange(assignment.id, 'title', e.target.value)
                      }
                      placeholder="Assignment title"
                      className={`
                        w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        dark:bg-gray-800 dark:text-white
                        ${
                          hasError && errors[assignment.id]?.field === 'title'
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }
                      `}
                    />
                    {hasError && errors[assignment.id]?.field === 'title' && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {errors[assignment.id].message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={assignment.description || ''}
                      onChange={(e) =>
                        handleFieldChange(assignment.id, 'description', e.target.value)
                      }
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Due Date *
                      </label>
                      <input
                        type="date"
                        value={formatDateForInput(assignment.due_date)}
                        onChange={(e) =>
                          handleFieldChange(assignment.id, 'due_date', e.target.value)
                        }
                        className={`
                          w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          dark:bg-gray-800 dark:text-white
                          ${
                            hasError && errors[assignment.id]?.field === 'due_date'
                              ? 'border-red-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }
                        `}
                      />
                      {hasError && errors[assignment.id]?.field === 'due_date' && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {errors[assignment.id].message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type
                      </label>
                      <select
                        value={assignment.assignment_type}
                        onChange={(e) =>
                          handleFieldChange(assignment.id, 'assignment_type', e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      >
                        {ASSIGNMENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteAssignment(assignment.id)}
                  className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  title="Delete assignment"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Status indicator */}
              <div className="flex items-center space-x-2 text-xs">
                {isNew && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    New Assignment
                  </span>
                )}
                {isEdited && !isNew && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Edited
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Assignment Button */}
      <button
        type="button"
        onClick={handleAddAssignment}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Add Assignment</span>
      </button>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 dark:bg-green-900/20 border border-green-500 rounded"></div>
          <span>New</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-500 rounded"></div>
          <span>Edited</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-900/20 border border-red-500 rounded"></div>
          <span>Has Errors</span>
        </div>
      </div>
    </div>
  );
}
