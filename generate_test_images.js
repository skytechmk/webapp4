import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const testImagesDir = path.join(process.cwd(), 'test_images');

// Create directory if it doesn't exist
if (!fs.existsSync(testImagesDir)) {
    fs.mkdirSync(testImagesDir);
}

// Generate test images
async function generateTestImages() {
    // Create a simple 3840x2160 (4K) image with some content
    const width = 3840;
    const height = 2160;

    // Create a gradient background
    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
                <stop offset="50%" style="stop-color:rgb(0,255,0);stop-opacity:1" />
                <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad1)"/>
        <text x="50%" y="50%" font-family="Arial" font-size="72" fill="white" text-anchor="middle">Test Image</text>
    </svg>
    `;

    const buffer = Buffer.from(svg);

    // Generate JPEG
    await sharp(buffer)
        .jpeg({ quality: 90 })
        .toFile(path.join(testImagesDir, 'test_image1.jpg'));

    // Generate PNG
    await sharp(buffer)
        .png()
        .toFile(path.join(testImagesDir, 'test_image2.png'));

    // Generate WebP
    await sharp(buffer)
        .webp({ quality: 90 })
        .toFile(path.join(testImagesDir, 'test_image3.webp'));

    console.log('Test images generated successfully in test_images/');
}

generateTestImages().catch(console.error);