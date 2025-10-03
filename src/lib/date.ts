import { format } from "date-fns";

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;

  return d ? format(d, "MMM d, yyyy") : "";
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d ? format(d, "h:mm a") : "";
}
