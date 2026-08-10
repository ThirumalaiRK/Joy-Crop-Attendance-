import { describe, it, expect, vi } from 'vitest';
import { compressImage, CompressionResult } from '../lib/image-compressor';

describe('lib/image-compressor', () => {
  it('should compress a base64 image data URL and return CompressionResult', async () => {
    // Mock HTMLImageElement image loading in JSDOM
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    // Mock Image onload trigger
    const originalImage = window.Image;
    class MockImage {
      width = 800;
      height = 600;
      onload: (() => void) | null = null;
      onerror: ((err: any) => void) | null = null;

      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    }
    window.Image = MockImage as any;

    // Mock Canvas context
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      drawImage: vi.fn(),
    });
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/webp;base64,mockWebpBase64DataString');

    const result: CompressionResult = await compressImage(mockDataUrl, 400, 400, 0.85);

    expect(result).toHaveProperty('base64');
    expect(result).toHaveProperty('sizeKb');
    expect(result).toHaveProperty('fileSizeBytes');
    expect(result).toHaveProperty('width');
    expect(result).toHaveProperty('height');

    // 800x600 scaled to maxWidth 400 should yield 400x300
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);

    // Restore Image
    window.Image = originalImage;
  });
});
