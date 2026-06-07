import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function getFileSource(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === fileName.length - 1) {
    return "";
  }

  const extension = fileName.slice(dotIndex + 1).toLowerCase();

  if (extension === "jpg" || extension === "jfif") {
    return "jpeg";
  }

  if (extension === "htm") {
    return "html";
  }

  if (extension === "md") {
    return "markdown";
  }

  if (extension === "tex") {
    return "latex";
  }

  return extension;
}
