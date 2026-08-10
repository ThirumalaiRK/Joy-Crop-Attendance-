import { describe, it, expect } from 'vitest';
import { generateNextEmployeeCode } from '../lib/supabase';

describe('lib/supabase - Database Helpers', () => {
  it('should generate valid sequential Employee Code format and RFC4122 UUID v4', async () => {
    const { employeeCode, employeeUuid } = await generateNextEmployeeCode();

    expect(employeeCode).toMatch(/^EMP-\d{6}$/);
    expect(employeeUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
