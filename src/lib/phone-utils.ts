/**
 * Sanitizes and cleans a phone number string to produce a standard RFC 3966 `tel:` URI.
 * Preserves the leading '+' if present and removes all whitespace, hyphens, and non-dialable symbols.
 * Example: "+91- 77360 95222" -> "tel:+917736095222"
 * Example: "0806 898 3333" -> "tel:08068983333"
 */
export function formatTelHref(rawPhone: string): string {
  if (!rawPhone) return 'tel:';

  const trimmed = rawPhone.trim();
  const hasPlus = trimmed.startsWith('+');

  // Keep only digits
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (hasPlus) {
    return `tel:+${digitsOnly}`;
  }

  return `tel:${digitsOnly}`;
}

/**
 * Formats timestamps cleanly (e.g., "Oct 20, 2026, 4:15 PM")
 */
export function formatContactDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}
