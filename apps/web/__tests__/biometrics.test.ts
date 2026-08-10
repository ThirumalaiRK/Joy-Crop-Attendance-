import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkMantraRDStatus } from '../lib/biometrics/mantra-rd';
import {
  registerEnrolledFingerprint,
  searchDuplicateFingerprint,
  findMatchingFingerprint,
  clearFingerprintCache,
} from '../lib/biometrics/fingerprint-store';

describe('lib/biometrics/mantra-rd', () => {
  it('should detect online RD service when port returns valid status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => `<RDInfo status="READY" srno="7055634" />`,
    } as any);

    const status = await checkMantraRDStatus();
    expect(status.connected).toBe(true);
    expect(status.port).toBe(11100);
    expect(status.serialNumber).toBe('7055634');
  });

  it('should handle connection timeout / offline RD service gracefully', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Connection refused'));
    const status = await checkMantraRDStatus();
    expect(status.connected).toBe(false);
    expect(status.statusText).toContain('Offline');
  });
});

describe('lib/biometrics/fingerprint-store', () => {
  beforeEach(() => {
    clearFingerprintCache();
  });

  it('should register and retrieve enrolled fingerprint templates in cache', () => {
    const template = 'MOCK_ISO_FINGERPRINT_TEMPLATE_BASE64_STRING_123';
    registerEnrolledFingerprint('EMP-0002', template, 'Right Thumb');

    const match = findMatchingFingerprint(template);
    expect(match).toBe('EMP-0002');
  });

  it('should detect duplicate fingerprint templates across different employees', () => {
    const template = 'DUPLICATE_ISO_FINGERPRINT_TEMPLATE_456';
    registerEnrolledFingerprint('EMP-0001', template, 'Right Thumb');

    const dupMatch = searchDuplicateFingerprint(template, 'EMP-0002');
    expect(dupMatch).toBeDefined();
    expect(dupMatch?.externalId).toBe('EMP-0001');
  });

  it('should clear cache on clearFingerprintCache call', () => {
    registerEnrolledFingerprint('EMP-0001', 'TEMPLATE_ABC', 'Right Thumb');
    clearFingerprintCache();
    // Cache is cleared
    const dupMatch = searchDuplicateFingerprint('TEMPLATE_ABC', 'EMP-0002');
    expect(dupMatch).toBeNull();
  });
});
