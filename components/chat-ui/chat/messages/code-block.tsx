"use client";

import * as React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/use-global-store";

interface CodeBlockProps {
  language: string;
  children: string;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({ description: "Code copied to clipboard" });
  };

  return (
    <div className="relative my-6 group rounded-sm border bg-neutral-950 text-white overflow-hidden font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
        <span className="text-xs text-neutral-400 lowercase">
          {language || "plaintext"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 text-xs text-neutral-500 hover:text-white"
        >
          {copied ? (
            <>
              <Check size={12} className="mr-1.5 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} className="mr-1.5" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language || "text"}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "1.5rem",
            background: "transparent",
            fontSize: "0.875rem",
            lineHeight: "1.6",
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
