'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { type ConflictRecord, type FieldDiff } from '@/lib/sync/detect-conflicts';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveConflict } from '@/app/server-actions/calendar';
import { useRouter } from 'next/navigation';

interface ConflictResolutionModalProps {
  conflicts: ConflictRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: () => void;
}

type ResolutionMode = 'choose' | 'merge';

/**
 * Modal for resolving sync conflicts between Almanac and Google Calendar.
 * Shows side-by-side diff view with options to keep local, keep remote, or merge field-by-field.
 */
export function ConflictResolutionModal({
  conflicts,
  open,
  onOpenChange,
  onResolved,
}: ConflictResolutionModalProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<ResolutionMode>('choose');
  const [mergeChoices, setMergeChoices] = useState<Record<string, 'local' | 'google'>>({});
  const [resolving, setResolving] = useState(false);

  if (conflicts.length === 0) {
    return null;
  }

  const currentConflict = conflicts[currentIndex];
  const isLastConflict = currentIndex === conflicts.length - 1;
  const isFirstConflict = currentIndex === 0;

  // Initialize merge choices with 'local' as default
  const initializeMergeChoices = () => {
    const choices: Record<string, 'local' | 'google'> = {};
    for (const diff of currentConflict.diffs) {
      choices[diff.field] = 'local';
    }
    setMergeChoices(choices);
  };

  const handleKeepAlmanac = async () => {
    setResolving(true);
    try {
      // Keep local values - update Google Calendar with local values
      const resolution = currentConflict.diffs.map((diff) => ({
        field: diff.field,
        value: diff.local,
      }));

      const result = await resolveConflict(currentConflict.eventId, resolution);
      if (result.ok) {
        handleNext();
      } else {
        alert(`Failed to resolve conflict: ${result.error}`);
      }
    } finally {
      setResolving(false);
    }
  };

  const handleKeepGoogle = async () => {
    setResolving(true);
    try {
      // Keep Google values - update local database with Google values
      const resolution = currentConflict.diffs.map((diff) => ({
        field: diff.field,
        value: diff.google,
      }));

      const result = await resolveConflict(currentConflict.eventId, resolution);
      if (result.ok) {
        handleNext();
      } else {
        alert(`Failed to resolve conflict: ${result.error}`);
      }
    } finally {
      setResolving(false);
    }
  };

  const handleMerge = () => {
    initializeMergeChoices();
    setMode('merge');
  };

  const handleApplyMerge = async () => {
    setResolving(true);
    try {
      // Build resolution from merge choices
      const resolution = currentConflict.diffs.map((diff) => {
        const choice = mergeChoices[diff.field];
        const value = choice === 'local' ? diff.local : diff.google;
        return { field: diff.field, value };
      });

      const result = await resolveConflict(currentConflict.eventId, resolution);
      if (result.ok) {
        setMode('choose');
        setMergeChoices({});
        handleNext();
      } else {
        alert(`Failed to resolve conflict: ${result.error}`);
      }
    } finally {
      setResolving(false);
    }
  };

  const handleNext = () => {
    if (isLastConflict) {
      // All conflicts resolved
      router.refresh();
      onResolved();
      onOpenChange(false);
    } else {
      setCurrentIndex(currentIndex + 1);
      setMode('choose');
      setMergeChoices({});
    }
  };

  const handlePrevious = () => {
    if (!isFirstConflict) {
      setCurrentIndex(currentIndex - 1);
      setMode('choose');
      setMergeChoices({});
    }
  };

  const formatFieldName = (field: string) => {
    return field.charAt(0).toUpperCase() + field.slice(1);
  };

  const formatFieldValue = (value: string | null) => {
    if (value === null || value === '') {
      return <span className="text-muted-foreground italic">(empty)</span>;
    }
    return value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>
              Sync Conflict ({currentIndex + 1} of {conflicts.length})
            </DialogTitle>
          </div>
          <DialogDescription>
            This event was modified in both Almanac and Google Calendar. Choose how to resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event title header */}
          <div className="p-3 bg-muted rounded-lg">
            <h3 className="font-semibold text-lg">
              {currentConflict.localTitle}
              {currentConflict.localTitle !== currentConflict.googleTitle && (
                <span className="text-muted-foreground text-sm font-normal ml-2">
                  (Google: {currentConflict.googleTitle})
                </span>
              )}
            </h3>
          </div>

          {/* Mode selection: Choose or Merge */}
          {mode === 'choose' ? (
            <>
              {/* Diff table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-4 py-2 text-left font-semibold">Field</th>
                      <th className="px-4 py-2 text-left font-semibold bg-blue-50 dark:bg-blue-950">
                        Almanac
                      </th>
                      <th className="px-4 py-2 text-left font-semibold bg-amber-50 dark:bg-amber-950">
                        Google Calendar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentConflict.diffs.map((diff, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-3 font-medium">{formatFieldName(diff.field)}</td>
                        <td className="px-4 py-3 font-mono text-sm bg-blue-50 dark:bg-blue-950">
                          {formatFieldValue(diff.local)}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm bg-amber-50 dark:bg-amber-950">
                          {formatFieldValue(diff.google)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resolution buttons */}
              <div className="flex gap-3 justify-center pt-2">
                <Button
                  onClick={handleKeepAlmanac}
                  disabled={resolving}
                  variant="default"
                  className="flex-1"
                >
                  Keep Almanac
                </Button>
                <Button
                  onClick={handleKeepGoogle}
                  disabled={resolving}
                  variant="default"
                  className="flex-1"
                >
                  Keep Google
                </Button>
                <Button
                  onClick={handleMerge}
                  disabled={resolving}
                  variant="outline"
                  className="flex-1"
                >
                  Merge Fields
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Merge mode: field-by-field selection */}
              <div className="space-y-4">
                {currentConflict.diffs.map((diff, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">{formatFieldName(diff.field)}</h4>
                    <RadioGroup
                      value={mergeChoices[diff.field]}
                      onValueChange={(value: string) =>
                        setMergeChoices({
                          ...mergeChoices,
                          [diff.field]: value as 'local' | 'google',
                        })
                      }
                    >
                      <div className="flex items-start space-x-2 p-3 rounded bg-blue-50 dark:bg-blue-950">
                        <RadioGroupItem value="local" id={`${diff.field}-local`} />
                        <Label htmlFor={`${diff.field}-local`} className="flex-1 cursor-pointer">
                          <span className="font-semibold">Almanac:</span>{' '}
                          <span className="font-mono text-sm">{formatFieldValue(diff.local)}</span>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-2 p-3 rounded bg-amber-50 dark:bg-amber-950">
                        <RadioGroupItem value="google" id={`${diff.field}-google`} />
                        <Label htmlFor={`${diff.field}-google`} className="flex-1 cursor-pointer">
                          <span className="font-semibold">Google:</span>{' '}
                          <span className="font-mono text-sm">{formatFieldValue(diff.google)}</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </div>

              {/* Merge action buttons */}
              <div className="flex gap-3 justify-center pt-2">
                <Button onClick={() => setMode('choose')} variant="outline" disabled={resolving}>
                  Back
                </Button>
                <Button onClick={handleApplyMerge} disabled={resolving} className="flex-1">
                  Apply Merge
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            disabled={isFirstConflict || resolving}
            variant="ghost"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} of {conflicts.length}
          </div>
          <Button
            onClick={handleNext}
            disabled={isLastConflict || resolving}
            variant="ghost"
            size="sm"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
