"use client";

import * as React from "react";

interface ConfidenceBadgeProps {
  score: number;
  reasoning?: string;
}

export function ConfidenceBadge({ score, reasoning }: ConfidenceBadgeProps) {
  // Determine color and label based on score thresholds
  const { color, label } = React.useMemo(() => {
    if (score >= 0.85) {
      return {
        color: "bg-green-100 text-green-800",
        label: "High",
      };
    }
    if (score >= 0.6) {
      return {
        color: "bg-amber-100 text-amber-800",
        label: "Medium",
      };
    }
    return {
      color: "bg-red-100 text-red-800",
      label: "Low",
    };
  }, [score]);

  const percentage = Math.round(score * 100);

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}
      title={reasoning}
    >
      {label} ({percentage}%)
    </span>
  );
}
