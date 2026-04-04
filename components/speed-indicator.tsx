"use client";

import { Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeedIndicatorProps {
  timing: {
    tokenValidation?: number;
    repoFetch?: number;
    projectAnalysis?: number;
    faviconGeneration?: number;
    astTransform?: number;
    prCreation?: number;
    total?: number;
  };
  className?: string;
}

export function SpeedIndicator({ timing, className }: SpeedIndicatorProps) {
  const steps = [
    { label: "Token", value: timing.tokenValidation },
    { label: "Repos", value: timing.repoFetch },
    { label: "Analysis", value: timing.projectAnalysis },
    { label: "Favicon", value: timing.faviconGeneration },
    { label: "AST", value: timing.astTransform },
    { label: "PR", value: timing.prCreation },
  ].filter((s) => s.value !== undefined);

  const total = timing.total || steps.reduce((acc, s) => acc + (s.value || 0), 0);

  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-2 rounded-full bg-muted/50 text-sm",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <Zap className="size-4" />
        <span className="font-medium">{total.toFixed(0)}ms</span>
      </div>
      
      <div className="h-4 w-px bg-border" />
      
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {steps.map((step, i) => (
          <span key={step.label} className="flex items-center gap-1">
            <span>{step.label}:</span>
            <span className="font-mono">{step.value?.toFixed(0)}ms</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function SpeedComparison({ totalMs }: { totalMs: number }) {
  // Typical LLM-based approach takes 15-25 seconds
  const llmTimeMs = 20000;
  const speedup = Math.round(llmTimeMs / totalMs);

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
        <Zap className="size-3.5" />
        <span className="font-medium">{speedup}x faster than LLM</span>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="size-3.5" />
        <span>vs ~{(llmTimeMs / 1000).toFixed(0)}s typical</span>
      </div>
    </div>
  );
}
