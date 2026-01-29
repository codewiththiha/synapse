"use client";

import * as React from "react";
import { Download, Image as ImageIcon, Music, FileText, Maximize2 } from "lucide-react";
import { Attachment } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilePreviewProps {
  attachment: Attachment | null;
  open: boolean;
  onClose: () => void;
}

export function FilePreview({ attachment, open, onClose }: FilePreviewProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  if (!attachment) return null;

  const getIcon = () => {
    switch (attachment.type) {
      case "image":
        return <ImageIcon size={16} />;
      case "audio":
        return <Music size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const handleDownload = () => {
    if (!attachment.data) return;
    
    let blob: Blob;
    if (attachment.type === "text") {
      blob = new Blob([attachment.data], { type: "text/plain" });
    } else {
      // Convert base64 to blob
      const byteCharacters = atob(attachment.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: attachment.mimeType || "application/octet-stream" });
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    switch (attachment.type) {
      case "image":
        return (
          <div className={`flex items-center justify-center ${isFullscreen ? "h-[80vh]" : "max-h-[60vh]"}`}>
            {attachment.data ? (
              <img
                src={`data:${attachment.mimeType || "image/png"};base64,${attachment.data}`}
                alt={attachment.name}
                className="max-w-full max-h-full object-contain rounded-md"
                onClick={() => setIsFullscreen(!isFullscreen)}
              />
            ) : attachment.url ? (
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-w-full max-h-full object-contain rounded-md cursor-pointer"
                onClick={() => setIsFullscreen(!isFullscreen)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
                <ImageIcon size={48} />
                <p>Image preview not available</p>
              </div>
            )}
          </div>
        );

      case "audio":
        return (
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Music size={32} className="text-muted-foreground" />
            </div>
            {attachment.data ? (
              <audio
                controls
                className="w-full max-w-md"
                src={`data:${attachment.mimeType || "audio/mpeg"};base64,${attachment.data}`}
              />
            ) : attachment.url ? (
              <audio controls className="w-full max-w-md" src={attachment.url} />
            ) : (
              <p className="text-muted-foreground">Audio preview not available</p>
            )}
          </div>
        );

      case "text":
      default:
        return (
          <ScrollArea className="h-[60vh] w-full">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words bg-muted rounded-md">
              {attachment.data || "No content available"}
            </pre>
          </ScrollArea>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className={`${
          isFullscreen 
            ? "max-w-[95vw] w-[95vw] max-h-[95vh]" 
            : "max-w-3xl w-[90vw] sm:w-full"
        } p-0 gap-0 overflow-hidden`}
      >
        <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getIcon()}
            <DialogTitle className="truncate text-base font-medium">
              {attachment.name}
            </DialogTitle>
            {attachment.size && (
              <span className="text-xs text-muted-foreground shrink-0">
                ({formatFileSize(attachment.size)})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2 mr-8">
            {attachment.type === "image" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                <Maximize2 size={16} />
              </Button>
            )}
            {attachment.data && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                title="Download"
              >
                <Download size={16} />
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="p-4">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
