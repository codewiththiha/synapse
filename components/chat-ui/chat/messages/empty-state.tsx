"use client";

import { Volume2, Terminal } from "lucide-react";
import { ModelOption } from "@/lib/types";

interface EmptyStateProps {
  isTTS: boolean;
  currentModel?: ModelOption;
}

export function EmptyState({ isTTS, currentModel }: EmptyStateProps) {
  return (
    <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
        {isTTS ? (
          <Volume2 size={32} className="opacity-20" />
        ) : (
          <Terminal size={32} className="opacity-20" />
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-medium tracking-tight">
          {isTTS
            ? "Speech Synthesis"
            : currentModel?.initialGreeting || "What are we building today?"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isTTS
            ? "Type to convert text to audio."
            : currentModel?.description || "Select a model to begin."}
        </p>
      </div>
    </div>
  );
}
