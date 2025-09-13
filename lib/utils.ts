import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn merges Tailwind CSS class names conditionally.
 *
 * Assumptions:
 * - Accepts any number of class values (strings, arrays, objects).
 *
 * Edge Cases:
 * - Handles falsy values and deduplicates classes.
 *
 * Connections:
 * - Used throughout UI components for dynamic class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * formatDate formats a date as "Month Day, Year" (e.g., "January 1, 2024").
 *
 * Assumptions:
 * - Accepts a Date object or ISO date string.
 *
 * Edge Cases:
 * - Returns "Invalid Date" if input is not a valid date.
 *
 * Connections:
 * - Used to display poll creation or expiration dates.
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * formatDateTime formats a date as "Month Day, Year, HH:MM" (e.g., "January 1, 2024, 12:00").
 *
 * Assumptions:
 * - Accepts a Date object or ISO date string.
 *
 * Edge Cases:
 * - Returns "Invalid Date" if input is not a valid date.
 *
 * Connections:
 * - Used to display poll timestamps with time.
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * calculatePercentage returns the percentage (rounded) of part/total.
 *
 * Assumptions:
 * - part and total are numbers.
 *
 * Edge Cases:
 * - Returns 0 if total is 0.
 *
 * Connections:
 * - Used to display poll option vote percentages.
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * generateSlug creates a URL-friendly slug from a string.
 *
 * Assumptions:
 * - Input is a string.
 *
 * Edge Cases:
 * - Removes special characters and trims hyphens.
 *
 * Connections:
 * - Used for poll URLs or identifiers.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * isValidEmail validates an email address format.
 *
 * Assumptions:
 * - Input is a string.
 *
 * Edge Cases:
 * - Returns false for invalid or empty strings.
 *
 * Connections:
 * - Used in authentication and registration forms.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * truncateText shortens text to a max length, adding ellipsis if needed.
 *
 * Assumptions:
 * - text is a string, maxLength is a positive integer.
 *
 * Edge Cases:
 * - Returns original text if shorter than maxLength.
 *
 * Connections:
 * - Used to limit text in UI (e.g., poll titles, descriptions).
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * debounce returns a debounced version of a function.
 *
 * Assumptions:
 * - func is a function, delay is in milliseconds.
 *
 * Edge Cases:
 * - Only the last call within the delay is executed.
 *
 * Connections:
 * - Used for search inputs or actions that should not fire rapidly.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

/**
 * getTimeRemaining calculates time left until a given expiration date.
 *
 * Assumptions:
 * - expiresAt is a Date object or string.
 *
 * Edge Cases:
 * - Returns expired=true if date is in the past.
 *
 * Connections:
 * - Used to show countdowns for poll expiration.
 */
export function getTimeRemaining(expiresAt: Date): {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const total = expiry - now;

  if (total <= 0) {
    return {
      total: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return {
    total,
    days,
    hours,
    minutes,
    seconds,
    expired: false,
  };
}

/**
 * shareUrl generates a shareable URL for a poll.
 *
 * Assumptions:
 * - pollId is a string.
 * - Runs in browser or server environment.
 *
 * Edge Cases:
 * - Falls back to relative URL if window is undefined (SSR).
 *
 * Connections:
 * - Used for sharing polls via UI.
 */
export function shareUrl(pollId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/polls/${pollId}`;
  }
  return `/polls/${pollId}`;
}

/**
 * copyToClipboard copies text to the user's clipboard.
 *
 * Assumptions:
 * - text is a string.
 *
 * Edge Cases:
 * - Uses fallback for browsers without navigator.clipboard.
 * - Returns a promise resolving to true/false for success.
 *
 * Connections:
 * - Used in share dialogs and UI copy buttons.
 */
export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => false);
  }

  // Fallback for older browsers
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return Promise.resolve(successful);
  } catch (err) {
    document.body.removeChild(textArea);
    return Promise.resolve(false);
  }
}

/**
 * validatePassword checks password strength and returns validation results.
 *
 * Assumptions:
 * - password is a string.
 *
 * Edge Cases:
 * - Returns multiple errors for weak passwords.
 *
 * Connections:
 * - Used in registration and password reset forms.
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
