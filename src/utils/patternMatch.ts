export function matchesPattern(eventType: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (!pattern.includes('*')) return eventType === pattern;
  if (!pattern.endsWith('.*')) return false;

  const prefix = pattern.slice(0, -1);
  if (!eventType.startsWith(prefix)) return false;
  const remainder = eventType.slice(prefix.length);
  return remainder.length > 0 && !remainder.includes('.');
}

export function matchesAnyPattern(eventType: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPattern(eventType, pattern));
}

export function isSupportedPattern(pattern: string): boolean {
  return pattern === '*' || !pattern.includes('*') || pattern.endsWith('.*');
}
