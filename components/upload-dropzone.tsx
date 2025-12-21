"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UploadDropzone({
  onFile,
  isBusy
}: {
  onFile: (file: File) => void | Promise<void>;
  isBusy?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  function pick() {
    inputRef.current?.click();
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  async function handleDroppedFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    await onFile(file);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    await handleDroppedFiles(e.dataTransfer.files);
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    await handleDroppedFiles(e.target.files);
    e.target.value = "";
  }

  return (
    <Card
      className={cn(
        "border-dashed",
        isDragging ? "border-black bg-zinc-50" : "border-zinc-200",
        isBusy ? "opacity-70" : ""
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CardHeader>
        <CardTitle>Upload your syllabus PDF</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600">
          Drag and drop a PDF here, or choose a file. The server extracts raw text using <code>pdf-parse</code> and asks
          Groq to find assignments & tests.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onChange}
            disabled={isBusy}
          />
          <Button onClick={pick} variant="default" disabled={isBusy}>
            {isBusy ? "Parsing..." : "Choose PDF"}
          </Button>
          <span className="text-xs text-zinc-500">Max 10MB recommended</span>
        </div>
      </CardContent>
    </Card>
  );
}
