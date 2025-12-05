import React, { useEffect, useState, ChangeEvent } from 'react';
import * as tf from '@tensorflow/tfjs';

interface GPURendererProps {
  width?: number;
  height?: number;
}

const GPURenderer: React.FC<GPURendererProps> = ({
  width = 800,
  height = 600
}) => {
  const [backend, setBackend] = useState<string>('cpu');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
          await tf.setBackend('webgpu');
          setBackend('webgpu');
        } else {
          await tf.setBackend('webgl');
          setBackend('webgl');
        }
        await tf.ready();
        setIsReady(true);
      } catch (err) {
        console.warn('Falling back to CPU backend:', err);
        await tf.setBackend('cpu');
        await tf.ready();
        setBackend('cpu');
        setIsReady(true);
      }
    };

    init();
  }, []);

  const handleImageProcessing = async (file: File) => {
    if (!isReady) return;

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      const tensor = tf.browser.fromPixels(img);
      const gray = tf.mean(tensor, -1, true);

      // Clean up original tensor early
      tensor.dispose();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const [h, w] = gray.shape.slice(0, 2);
        canvas.width = w;
        canvas.height = h;
        const data = await gray.data();
        const imageData = new ImageData(w, h);
        for (let i = 0; i < data.length; i++) {
          const v = data[i];
          const idx = i * 4;
          imageData.data[idx] = v;
          imageData.data[idx + 1] = v;
          imageData.data[idx + 2] = v;
          imageData.data[idx + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
        console.log('Image processed successfully');
      }

      gray.dispose();
    } catch (error) {
      console.error('Image processing error:', error);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageProcessing(file);
  };

  return (
    <div style={{ width, height }}>
      <div style={{ marginBottom: '10px' }}>
        <p>TensorFlow.js Backend: {backend}</p>
        <input type="file" accept="image/*" onChange={onFileChange} />
        <p>GPU demo: converts the uploaded image to grayscale using TensorFlow.js.</p>
      </div>
    </div>
  );
};

export default GPURenderer;
