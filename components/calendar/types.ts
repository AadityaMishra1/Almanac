export type View = 'month' | 'week' | 'day';

export interface UnifiedEvent {
  id: string;
  type: 'assignment' | 'calendar_event';
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  course_name?: string;
  course_code?: string;
  course_id?: string;
  course_color?: string | null;
  assignment_type?: string;
  is_synced_to_calendar?: boolean;
  google_event_id?: string;
  location?: string;
  source: 'database' | 'google_calendar';
}
