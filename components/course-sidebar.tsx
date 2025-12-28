"use client"

import { Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Course {
  id: string
  name: string
  term?: string | null
  color: string
  _count?: { events: number }
}

interface CourseSidebarProps {
  courses: Course[]
  selectedCourseId: string | null
  onSelectCourse: (courseId: string | null) => void
  onAddCourse: () => void
  onUploadSyllabus: (courseId: string, courseName: string) => void
}

export function CourseSidebar({
  courses,
  selectedCourseId,
  onSelectCourse,
  onAddCourse,
  onUploadSyllabus
}: CourseSidebarProps) {
  return (
    <div className="w-64 border-r bg-zinc-50 p-4 space-y-4">
      <Button onClick={onAddCourse} className="w-full rounded-xl" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Class
      </Button>

      <div className="space-y-2">
        <button
          onClick={() => onSelectCourse(null)}
          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
            selectedCourseId === null
              ? 'bg-white shadow-sm font-medium ring-1 ring-zinc-200'
              : 'hover:bg-white/50'
          }`}
        >
          All Courses
        </button>

        {courses.map((course) => (
          <div key={course.id} className="space-y-1.5">
            <button
              onClick={() => onSelectCourse(course.id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                selectedCourseId === course.id
                  ? 'bg-white shadow-sm font-medium ring-1 ring-zinc-200'
                  : 'hover:bg-white/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: course.color }}
                />
                <span className="flex-1 truncate">{course.name}</span>
                {course._count && (
                  <Badge variant="secondary" className="text-xs rounded-md">
                    {course._count.events}
                  </Badge>
                )}
              </div>
              {course.term && (
                <div className="text-xs text-zinc-500 mt-1 ml-5">
                  {course.term}
                </div>
              )}
            </button>
            {selectedCourseId === course.id && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs rounded-xl"
                onClick={(e) => {
                  e.stopPropagation()
                  onUploadSyllabus(course.id, course.name)
                }}
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload Syllabus
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
