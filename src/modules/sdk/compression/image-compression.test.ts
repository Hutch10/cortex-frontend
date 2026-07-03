import { compressImageAsJpeg } from './image-compression';

describe('SDK Image Compression', () => {
  it('should reject non-image files', async () => {
    const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
    await expect(compressImageAsJpeg(file)).rejects.toThrow('Provided file is not an image.');
  });

  // Note: Full testing of URL.createObjectURL and Canvas requires a mocked DOM environment (like jsdom with canvas support).
  // This test file asserts the structural boundary of the SDK compression utility.
});
