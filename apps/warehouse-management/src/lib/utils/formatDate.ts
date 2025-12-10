/**
 * Format a date for display in Vietnamese locale
 * @param date - The date to format (can be Date object, string, or null)
 * @param style - 'short' for compact display, 'medium' for more detail
 * @returns Formatted date string or '-' if date is null/undefined
 */
export function formatDate(
  date: Date | string | null | undefined,
  style: 'short' | 'medium' = 'short'
): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleString('vi-VN', {
    dateStyle: style,
    timeStyle: 'short',
  });
}

/**
 * Format a date for display without time
 * @param date - The date to format
 * @returns Formatted date string or '-' if date is null/undefined
 */
export function formatDateOnly(
  date: Date | string | null | undefined,
  style: 'short' | 'medium' | 'long' = 'medium'
): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleDateString('vi-VN', {
    dateStyle: style,
  });
}
