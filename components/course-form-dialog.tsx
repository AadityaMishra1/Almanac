"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CourseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; term?: string; color: string }) => Promise<void>
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

export function CourseFormDialog({ open, onOpenChange, onSubmit }: CourseFormDialogProps) {
  const [name, setName] = useState('')
  const [term, setTerm] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit({ name, term: term || undefined, color })
      setName('')
      setTerm('')
      setColor(PRESET_COLORS[0])
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add New Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Course Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Computer Science 101"
              className="rounded-xl"
              required
            />
          </div>
          <div>
            <Label htmlFor="term">Term (optional)</Label>
            <Input
              id="term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g., Fall 2025"
              className="rounded-xl"
            />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === presetColor ? 'scale-110 ring-2 ring-offset-2 ring-zinc-900' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl">
            {isSubmitting ? 'Creating...' : 'Create Course'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
