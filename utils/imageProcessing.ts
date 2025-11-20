
import { User, WatermarkPosition } from '../types';

export const applyWatermark = async (
  imageSrc: string, 
  text: string | null, 
  logoUrl: string | null,
  opacity: number = 0.85,
  sizePercent: number = 20,
  position: WatermarkPosition = 'bottom-right',
  offXPercent: number = 2,
  offYPercent: number = 2
): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(imageSrc);
                return;
            }
            
            // Draw Base Image
            ctx.drawImage(img, 0, 0);
            
            if (logoUrl) {
                // Draw Logo Image
                const logo = new Image();
                logo.src = logoUrl;
                await new Promise((r) => { 
                    logo.onload = r; 
                    logo.onerror = r; // Resolve even on error to prevent hang
                });
                
                // Calculate dimensions
                const scalePercent = sizePercent / 100;
                const maxWidth = img.width * scalePercent;
                
                // Maintain aspect ratio
                const ratio = maxWidth / logo.width;
                const logoW = logo.width * ratio;
                const logoH = logo.height * ratio;
                
                // Offsets
                const paddingX = img.width * (offXPercent / 100);
                const paddingY = img.height * (offYPercent / 100);

                let dx = 0;
                let dy = 0;

                switch(position) {
                    case 'top-left':
                        dx = paddingX;
                        dy = paddingY;
                        break;
                    case 'top-right':
                        dx = img.width - logoW - paddingX;
                        dy = paddingY;
                        break;
                    case 'bottom-left':
                        dx = paddingX;
                        dy = img.height - logoH - paddingY;
                        break;
                    case 'bottom-right':
                        dx = img.width - logoW - paddingX;
                        dy = img.height - logoH - paddingY;
                        break;
                    case 'center':
                        dx = (img.width / 2) - (logoW / 2) + paddingX;
                        dy = (img.height / 2) - (logoH / 2) + paddingY;
                        break;
                }

                ctx.globalAlpha = opacity;
                ctx.drawImage(logo, dx, dy, logoW, logoH);
                ctx.globalAlpha = 1.0;

            } else if (text) {
                // Draw Text Watermark
                const fontSize = Math.max(24, img.width * (sizePercent / 300)); // Scale font based on size preference
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                
                // Simple Shadow
                ctx.shadowColor = 'rgba(0,0,0,0.7)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                const paddingX = img.width * (offXPercent / 100);
                const paddingY = img.height * (offYPercent / 100);

                let x = 0;
                let y = 0;

                // Measure text
                const metrics = ctx.measureText(text.toUpperCase());
                const textW = metrics.width;
                const textH = fontSize; // approx

                // Determine text alignment and position based on WatermarkPosition
                switch(position) {
                    case 'top-left':
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';
                        x = paddingX;
                        y = paddingY;
                        break;
                    case 'top-right':
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'top';
                        x = img.width - paddingX;
                        y = paddingY;
                        break;
                    case 'bottom-left':
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'bottom';
                        x = paddingX;
                        y = img.height - paddingY;
                        break;
                    case 'bottom-right':
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'bottom';
                        x = img.width - paddingX;
                        y = img.height - paddingY;
                        break;
                    case 'center':
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        x = (img.width / 2) + paddingX;
                        y = (img.height / 2) + paddingY;
                        break;
                }

                ctx.fillText(text.toUpperCase(), x, y);
            }
            
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => resolve(imageSrc);
        img.src = imageSrc;
    });
};
