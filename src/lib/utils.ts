import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Gabungkan className Tailwind dengan rapi (dedupe + merge konflik). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
