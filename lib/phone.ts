export function normalizeAccessCode(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const digits = trimmed.replace(/\D/g, '');
  return digits.length > 0 ? digits : trimmed.replace(/\s+/g, '');
}

export function cleanAccessCode(value: string): string {
  const normalized = normalizeAccessCode(value);
  if (normalized.length < 3) {
    throw new Error('Phone number is too short');
  }
  if (normalized.length > 40) {
    throw new Error('Phone number is too long');
  }
  return normalized;
}
