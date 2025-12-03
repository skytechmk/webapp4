// Helper to read EXIF orientation from a file
// Returns:
// 1: 0°
// 3: 180°
// 6: 90° CW
// 8: 90° CCW
const getOrientation = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (!event.target?.result) return resolve(1);

      const view = new DataView(event.target.result as ArrayBuffer);

      if (view.getUint16(0, false) !== 0xFFD8) return resolve(-2); // Not a JPEG

      const length = view.byteLength;
      let offset = 2;

      while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) return resolve(-1);

        const marker = view.getUint16(offset, false);
        offset += 2;

        if (marker === 0xFFE1) {
          if (view.getUint32(offset += 2, false) !== 0x45786966) return resolve(-1);

          const little = view.getUint16(offset += 6, false) === 0x4949;
          offset += view.getUint32(offset + 4, little);
          const tags = view.getUint16(offset, little);
          offset += 2;

          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + (i * 12), little) === 0x0112) {
              return resolve(view.getUint16(offset + (i * 12) + 8, little));
            }
          }
        } else if ((marker & 0xFF00) !== 0xFF00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
      return resolve(-1);
    };

    reader.readAsArrayBuffer(file);
  });
};

// Alias for backward compatibility
export const getExifOrientation = getOrientation;

import { imageProcessingWorker } from './imageProcessingWorker';

// Enhanced applyWatermark using Web Worker with comprehensive error handling
export const applyWatermark = async (imageSrc: string, watermarkText: string | null, logoUrl?: string | null, opacity?: number, size?: number, position?: string, offsetX?: number, offsetY?: number): Promise<string> => {
  // Input validation
  if (!imageSrc || !imageSrc.startsWith('data:image/')) {
    console.warn('Invalid image source for watermarking:', imageSrc);
    return imageSrc;
  }

  if (!watermarkText || !watermarkText.trim()) {
    console.warn('Empty watermark text provided');
    return imageSrc;
  }

  // Set default parameters with validation
  const effectiveOpacity = Math.min(Math.max(opacity || 0.5, 0.1), 0.9); // Clamp between 0.1 and 0.9
  const effectiveSize = Math.min(Math.max(size || 30, 12), 100); // Clamp between 12 and 100
  const effectivePosition = (position || 'center') as CanvasTextAlign;

  try {
    // Strategy 1: Try Web Worker with timeout
    try {
      console.log(`🔄 Attempting Web Worker watermark with text: "${watermarkText}"`);
      const result = await Promise.race([
        imageProcessingWorker.applyWatermark(imageSrc, watermarkText, {
          font: `${effectiveSize}px Arial`,
          color: `rgba(255, 255, 255, ${effectiveOpacity})`,
          align: effectivePosition,
          baseline: 'middle' as CanvasTextBaseline,
          x: offsetX,
          y: offsetY
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Web Worker watermark timeout')), 15000)
        )
      ]);

      // Validate Web Worker result
      if (result && typeof result === 'string' && result.startsWith('data:image/')) {
        console.log('✅ Web Worker watermark successful');
        return result;
      } else {
        throw new Error('Web Worker returned invalid result');
      }
    } catch (workerError) {
      console.warn('⚠️ Web Worker watermark failed:', workerError.message);
    }

    // Strategy 2: Main thread implementation with enhanced error handling
    console.log('🎨 Falling back to main thread watermark implementation');
    return new Promise((resolve) => {
      const img = new Image();

      // Enhanced error handling
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            console.error('Failed to get canvas context for watermarking');
            resolve(imageSrc);
            return;
          }

          // Set canvas dimensions with validation
          if (img.width <= 0 || img.height <= 0) {
            throw new Error(`Invalid image dimensions: ${img.width}x${img.height}`);
          }

          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image with error handling
          try {
            ctx.drawImage(img, 0, 0);
          } catch (drawError) {
            console.error('Failed to draw image on canvas:', drawError);
            resolve(imageSrc);
            return;
          }

          // Apply watermark with bounds checking
          if (watermarkText.trim()) {
            try {
              ctx.font = `${effectiveSize}px Arial`;
              ctx.fillStyle = `rgba(255, 255, 255, ${effectiveOpacity})`;
              ctx.textAlign = effectivePosition;
              ctx.textBaseline = 'middle' as CanvasTextBaseline;

              // Calculate position with bounds validation
              const x = offsetX !== undefined ? offsetX : canvas.width / 2;
              const y = offsetY !== undefined ? offsetY : canvas.height / 2;

              // Ensure position is within canvas bounds
              if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                ctx.fillText(watermarkText, x, y);
              } else {
                console.warn(`Watermark position (${x}, ${y}) out of canvas bounds (${canvas.width}, ${canvas.height})`);
                // Fallback to center position
                ctx.fillText(watermarkText, canvas.width / 2, canvas.height / 2);
              }
            } catch (textError) {
              console.error('Failed to apply watermark text:', textError);
            }
          }

          // Generate result with validation
          const result = canvas.toDataURL('image/jpeg', 0.85);
          if (result && result.startsWith('data:image/jpeg;base64,')) {
            resolve(result);
          } else {
            console.error('Generated invalid JPEG data URL');
            resolve(imageSrc);
          }
        } catch (error) {
          console.error('Main thread watermark failed:', error);
          resolve(imageSrc);
        }
      };

      img.onerror = () => {
        console.error('Image failed to load for watermarking');
        resolve(imageSrc);
      };

      // Set source with timeout
      img.src = imageSrc;
      setTimeout(() => {
        if (!img.complete) {
          console.warn('Image loading timed out for watermarking');
          resolve(imageSrc);
        }
      }, 10000);
    });

  } catch (error) {
    console.error('Final watermark fallback failed:', error);
    return imageSrc;
  }
};

export const createPhotoStrip = async (images: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const imgPromises = images.map(src => {
      return new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });
    });

    Promise.all(imgPromises).then(imgs => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));

      const imgWidth = imgs[0].width;
      const imgHeight = imgs[0].height;
      canvas.width = imgWidth;
      canvas.height = imgHeight * imgs.length;

      imgs.forEach((img, i) => {
        ctx.drawImage(img, 0, i * imgHeight, imgWidth, imgHeight);
      });

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    }).catch(reject);
  });
};

export const processImage = async (file: File, maxWidth = 1920, maxHeight = 1080, applyExifCorrection = false, deviceOrientation = 0): Promise<string> => {
  // 1. Get the orientation first (only if we need to apply correction)
  const orientation = applyExifCorrection ? await getOrientation(file) : 1;
  console.log('processImage: file=', file.name, 'orientation=', orientation, 'applyExifCorrection=', applyExifCorrection, 'deviceOrientation=', deviceOrientation);


  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // 2. Calculate new dimensions
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // 3. Determine rotation based on device orientation
        // iPhone reports: 0 = portrait, 90 = landscape-left, -90 = landscape-right, 180 = upside-down
        let rotationDegrees = 0;
        if (deviceOrientation === -90) {
          rotationDegrees = 90; // Rotate 90° CW to correct landscape-right
        } else if (deviceOrientation === 90) {
          rotationDegrees = -90; // Rotate 90° CCW to correct landscape-left
        } else if (deviceOrientation === 180) {
          rotationDegrees = 180; // Rotate 180° for upside-down
        }

        // 4. Set canvas dimensions (swap if rotating 90° or 270°)
        if (rotationDegrees === 90 || rotationDegrees === -90) {
          canvas.width = height;
          canvas.height = width;
        } else {
          canvas.width = width;
          canvas.height = height;
        }

        // 5. Apply rotation transform
        if (rotationDegrees !== 0) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotationDegrees * Math.PI) / 180);
          ctx.translate(-width / 2, -height / 2);
        }

        // 6. Apply EXIF-based rotation if needed (fallback)
        if (applyExifCorrection && orientation > 1) {
          switch (orientation) {
            case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
            case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
            case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
            case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
            case 6: ctx.transform(0, 1, -1, 0, height, 0); break; // 90° CW
            case 7: ctx.transform(0, -1, -1, 0, height, width); break;
            case 8: ctx.transform(0, -1, 1, 0, 0, width); break; // 90° CCW
            default: break;
          }
        }

        // 7. Draw the image
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };

      img.onerror = () => reject(new Error('Failed to load image'));

      // Use the result from the file reader
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};