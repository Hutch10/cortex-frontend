export async function compressImageAsJpeg(
  file: File,
  maxWidth: number = 1080,
  quality: number = 0.8
): Promise<File> {
  // Ensure the file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('Provided file is not an image.');
  }

  return new Promise((resolve, reject) => {
    // URL.createObjectURL creates a memory-safe object reference
    // instead of reading the entire byte array into memory via FileReader.
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate new dimensions preserving aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      // Draw onto canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2d context for compression.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Export as heavily compressed JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed to produce output.'));
            return;
          }
          const compressedFile = new File([blob], `compressed_${file.name.replace(/\.[^/.]+$/, "")}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression.'));
    };

    img.src = objectUrl;
  });
}
