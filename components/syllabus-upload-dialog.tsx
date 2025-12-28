"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, FileText, Loader2 } from "lucide-react"

interface SyllabusUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseName: string
  onUploadComplete: () => void
}

export function SyllabusUploadDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
  onUploadComplete
}: SyllabusUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "application/pdf" || droppedFile.name.toLowerCase().endsWith(".pdf")) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError("Please upload a PDF file")
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")) {
        setFile(selectedFile)
        setError(null)
      } else {
        setError("Please upload a PDF file")
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("courseId", courseId)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Upload failed")
      }

      // Success!
      setFile(null)
      onOpenChange(false)
      onUploadComplete()

      const stats = data.stats
      let message = `Successfully parsed ${stats.parsed} events!\n`
      message += `Created ${stats.created} new events.\n`
      if (stats.duplicatesSkipped > 0) {
        message += `Skipped ${stats.duplicatesSkipped} duplicates.`
      }
      alert(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setFile(null)
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Upload Syllabus for {courseName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : file
                ? "border-green-500 bg-green-50"
                : "border-zinc-300 hover:border-zinc-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
            />

            {file ? (
              <div className="space-y-2">
                <FileText className="h-12 w-12 mx-auto text-green-600" />
                <p className="text-sm font-medium text-green-900">{file.name}</p>
                <p className="text-xs text-green-700">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                >
                  Choose different file
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-zinc-400" />
                <div>
                  <Label
                    htmlFor="file-upload"
                    className="text-sm font-medium text-blue-600 cursor-pointer hover:underline"
                  >
                    Choose a file
                  </Label>
                  <span className="text-sm text-zinc-600"> or drag and drop</span>
                </div>
                <p className="text-xs text-zinc-500">PDF files only</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="flex-1 rounded-xl"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Parse
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>

          <div className="text-xs text-zinc-500 space-y-1">
            <p>📄 Upload multiple PDFs (syllabus, schedule, etc.)</p>
            <p>🤖 AI will extract all assignment dates automatically</p>
            <p>🔄 Duplicate events are automatically skipped</p>
            <p>✅ Review and sync events to your calendar</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
