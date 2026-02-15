import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Estimate processing time based on file size
export function estimateProcessingTime(fileSizeBytes: number, isVideo: boolean): number {
  const sizeMB = fileSizeBytes / (1024 * 1024);
  const baseTime = isVideo ? sizeMB * 2 : sizeMB * 0.5; // seconds
  return Math.ceil(baseTime);
}

// Format time in seconds to human readable
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

// Format file size to human readable
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Format duration in seconds
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
