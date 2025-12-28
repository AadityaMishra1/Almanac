"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"

interface Event {
  id: string
  title: string
  type: string
  startDate: Date
  endDate?: Date | null
  description?: string | null
  source: 'PDF' | 'MANUAL'
  course: {
    id: string
    name: string
    color: string
  } | null
}

interface EventDrawerProps {
  event: Event | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (eventId: string, data: Partial<Event>) => Promise<void>
  onDelete: (eventId: string) => Promise<void>
  onSync?: (eventId: string) => Promise<void>
}

export function EventDrawer({
  event,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onSync
}: EventDrawerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedType, setEditedType] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedDate, setEditedDate] = useState('')

  if (!event) return null

  const handleEdit = () => {
    setIsEditing(true)
    setEditedTitle(event.title)
    setEditedType(event.type)
    setEditedDescription(event.description || '')
    setEditedDate(event.startDate.toISOString().split('T')[0])
  }

  const handleSave = async () => {
    await onUpdate(event.id, {
      title: editedTitle,
      type: editedType,
      description: editedDescription,
      startDate: new Date(editedDate),
    })
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (confirm('Delete this event?')) {
      await onDelete(event.id)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {event.course && (
              <>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: event.course.color }}
                />
                {event.course.name}
              </>
            )}
            {!event.course && <span className="text-zinc-600">No Course</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isEditing ? (
            <>
              <div>
                <Label>Title</Label>
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Input
                  value={editedType}
                  onChange={(e) => setEditedType(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editedDate}
                  onChange={(e) => setEditedDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={4}
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 rounded-xl">
                  Save
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold">{event.title}</h3>
                <div className="flex gap-2 mt-2">
                  <Badge className="rounded-md">{event.type}</Badge>
                  <Badge variant="outline" className="rounded-md">{event.source}</Badge>
                </div>
              </div>
              <div>
                <Label>Date</Label>
                <p className="text-sm mt-1">
                  {event.startDate.toLocaleDateString()}
                </p>
              </div>
              {event.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm mt-1 text-zinc-600">
                    {event.description}
                  </p>
                </div>
              )}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleEdit} variant="outline" className="flex-1 rounded-xl">
                  Edit
                </Button>
                {onSync && (
                  <Button onClick={() => onSync(event.id)} className="flex-1 rounded-xl">
                    Sync to Google
                  </Button>
                )}
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  size="icon"
                  className="rounded-xl"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* AI Suggestions Placeholder */}
          <div className="border-t pt-4 mt-4">
            <Label className="text-xs text-zinc-500">AI Suggestions</Label>
            <p className="text-xs text-zinc-400 mt-2">
              Coming in Phase 2: Smart scheduling suggestions and conflict detection
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
