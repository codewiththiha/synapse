"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ThinkingBlockProps {
  content: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ThinkingBlock({
  content,
  isExpanded,
  onToggle,
}: ThinkingBlockProps) {
  return (
    <div className="mb-6 group">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-wider mb-2 h-7 px-2"
      >
        <Brain size={14} />
        <span>Reasoning Process</span>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={14} />
        </motion.div>
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="overflow-hidden"
          >
            <div className="pl-4 border-l-2 border-border ml-1.5 py-2">
              <div className="text-sm text-muted-foreground font-mono leading-relaxed opacity-90 whitespace-pre-wrap">
                {content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
