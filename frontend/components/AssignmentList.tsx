'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, BookOpen, Filter, CheckCircle, Circle } from 'lucide-react';
import api from '@/lib/api';
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  assignment_type: string;
  course_name?: string;
  completed: boolean;
}

interface AssignmentListProps {
  courseId?: string;
  showCompleted?: boolean;
}

export default function AssignmentList({ courseId, showCompleted = false }: AssignmentListProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'today'>('upcoming');
  const [sortBy, setSortBy] = useState<'due_date' | 'course'>('due_date');

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (courseId) params.course_id = courseId;
      if (!showCompleted) params.completed = false;

      const response = await api.get('/assignments', { params });

      let fetchedAssignments = response.data.assignments || [];

      // Apply client-side filtering
      if (filter === 'upcoming') {
        fetchedAssignments = fetchedAssignments.filter((a: Assignment) => {
          const dueDate = parseISO(a.due_date);
          return !isPast(dueDate) && !isToday(dueDate) && !a.completed;
        });
      } else if (filter === 'overdue') {
        fetchedAssignments = fetchedAssignments.filter((a: Assignment) => {
          const dueDate = parseISO(a.due_date);
          return isPast(dueDate) && !isToday(dueDate) && !a.completed;
        });
      } else if (filter === 'today') {
        fetchedAssignments = fetchedAssignments.filter((a: Assignment) => {
          try {
            const dueDate = parseISO(a.due_date);
            return isToday(dueDate) && !a.completed;
          } catch (e) {
            // If parsing fails, skip this assignment
            return false;
          }
        });
      }

      // Sort
      fetchedAssignments.sort((a: Assignment, b: Assignment) => {
        if (sortBy === 'due_date') {
          return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
        } else {
          // Sort by course
          return (a.course_name || '').localeCompare(b.course_name || '');
        }
      });

      setAssignments(fetchedAssignments);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId, filter, sortBy, showCompleted]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleToggleComplete = async (assignmentId: string, completed: boolean) => {
    try {
      await api.put(`/assignments/${assignmentId}/complete`, {
        completed: !completed,
      });
      
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, completed: !completed } : a))
      );
    } catch (error) {
      console.error('Failed to update assignment:', error);
    }
  };

  const getDueDateLabel = (dateString: string) => {
    const date = parseISO(dateString);
    if (isPast(date)) return 'Overdue';
    if (isToday(date)) return 'Due Today';
    if (isTomorrow(date)) return 'Due Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const getDueDateColor = (dateString: string, completed: boolean) => {
    if (completed) return 'text-gray-400';
    const date = parseISO(dateString);
    if (isPast(date)) return 'text-red-600 dark:text-red-400';
    if (isToday(date)) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">All Assignments</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due Today</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="due_date">Sort by Date</option>
            <option value="course">Sort by Course</option>
          </select>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="p-8 text-center border rounded-lg dark:border-gray-700">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">No assignments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className={`p-4 border rounded-lg transition-colors ${
                assignment.completed
                  ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => handleToggleComplete(assignment.id, assignment.completed)}
                  className="mt-1"
                >
                  {assignment.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 hover:text-blue-500" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3
                        className={`font-medium ${
                          assignment.completed
                            ? 'text-gray-500 line-through dark:text-gray-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {assignment.title}
                      </h3>
                      {assignment.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {assignment.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-3">
                    {assignment.course_name && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                        <BookOpen className="w-4 h-4" />
                        <span>{assignment.course_name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span className={getDueDateColor(assignment.due_date, assignment.completed)}>
                        {getDueDateLabel(assignment.due_date)}
                      </span>
                    </div>
                    
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                      {assignment.assignment_type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

