import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('lib/utils - cn() helper', () => {
  it('should merge class names correctly', () => {
    const result = cn('bg-red-500', 'text-white');
    expect(result).toBe('bg-red-500 text-white');
  });

  it('should resolve conflicting Tailwind CSS classes', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('should handle conditional and falsy class values', () => {
    const isTrue = true;
    const isFalse = false;
    const result = cn('base-class', isTrue && 'active', isFalse && 'disabled', null, undefined);
    expect(result).toBe('base-class active');
  });

  it('should return empty string when no valid inputs are provided', () => {
    expect(cn()).toBe('');
  });
});
