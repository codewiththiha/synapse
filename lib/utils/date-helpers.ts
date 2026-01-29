import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

/**
 * Format message timestamp for display
 * Today: "2:30 PM"
 * Yesterday: "Yesterday 2:30 PM"
 * Older: "Jan 1, 2:30 PM"
 */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return format(date, "h:mm a");
  }

  if (isYesterday(date)) {
    return `Yesterday ${format(date, "h:mm a")}`;
  }

  return format(date, "MMM d, h:mm a");
}

/**
 * Format relative time
 * "2 hours ago", "3 days ago"
 */
export function formatRelativeTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

/**
 * Format session date for sidebar
 * Today: "Today"
 * Yesterday: "Yesterday"
 * Older: "Jan 1, 2026"
 */
export function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return "Today";
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  return format(date, "MMM d, yyyy");
}

/**
 * Format full date and time
 * "January 1, 2026 at 2:30 PM"
 */
export function formatFullDateTime(timestamp: number): string {
  return format(new Date(timestamp), "MMMM d, yyyy 'at' h:mm a");
}
