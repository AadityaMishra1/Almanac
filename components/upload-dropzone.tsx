"use client";

import * as React from "react";
import { FileUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadDropzone({
  onFile,
  isBusy,
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick();
    }
  }

  return (
    <div
      role="button"
      tabIndex={isBusy ? -1 : 0}
      onClick={isBusy ? undefined : pick}
      onKeyDown={isBusy ? undefined : handleKeyDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed p-10 sm:p-14 transition-all duration-200",
        "bg-surface-secondary border-[var(--border)]",
        !isBusy && "cursor-pointer hover:border-brand-400 hover:bg-brand-50/50",
        isDragging && "border-brand-500 bg-brand-50",
        isBusy && "opacity-60 pointer-events-none",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={onChange}
        disabled={isBusy}
      />

      {isBusy ? (
        <>
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Extracting events...
          </p>
        </>
      ) : (
        <>
          <FileUp
            className={cn(
              "w-10 h-10 mb-3 transition-colors duration-200",
              isDragging ? "text-brand-500" : "text-[var(--text-tertiary)]",
            )}
          />
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
            Drop your syllabus here
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            or click to browse
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-4">
            PDF, DOCX, or TXT up to 10MB
          </p>
        </>
      )}
    </div>
  );
}
