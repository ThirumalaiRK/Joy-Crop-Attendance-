import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FingerprintModal } from '../components/attendance-modes/fingerprint-modal';

describe('components/attendance-modes/FingerprintModal UI Component', () => {
  it('should not render anything when isOpen is false', () => {
    const { container } = render(
      <FingerprintModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render modal header and scanner UI when isOpen is true', () => {
    render(
      <FingerprintModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(screen.getByText('Zero-Click Biometric Terminal')).toBeInTheDocument();
    expect(screen.getByText(/Touch Finger Sensor/i)).toBeInTheDocument();
  });
});
