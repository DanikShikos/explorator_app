import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function removeNullBytes(value: string) {
  return value.replace(/\0/g, "");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
