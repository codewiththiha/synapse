"use client";

import * as React from "react";
import { Paperclip, Image as ImageIcon, Music } from "lucide-react";
import { Attachment } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { FilePreview } from "@/components/chat-ui/chat/input/file-preview";

interface AttachmentListProps {
  attachments: Attachment[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  const [previewAttachment, setPreviewAttachment] = React.useState<Attachment | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon size={12} />;
      case "audio":
        return <Music size={12} />;
      default:
        return <Paperclip size={12} />;
    }
  };

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <Badge
            key={attachment.id}
            variant="secondary"
            className="gap-2 cursor-pointer hover:bg-muted-foreground/20 transition-colors"
            onClick={() => setPreviewAttachment(attachment)}
          >
            {getIcon(attachment.type)}
            <span className="max-w-[150px] truncate">{attachment.name}</span>
          </Badge>
        ))}
      </div>

      <FilePreview
        attachment={previewAttachment}
        open={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </>
  );
}
