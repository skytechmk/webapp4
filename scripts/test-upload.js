import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:3001';
const TEST_FILE_PATH = path.join(__dirname, 'test-image.jpg');

// Create a dummy image file if it doesn't exist
if (!fs.existsSync(TEST_FILE_PATH)) {
    const buffer = Buffer.alloc(1024); // 1KB dummy file
    fs.writeFileSync(TEST_FILE_PATH, buffer);
    console.log('Created dummy test file:', TEST_FILE_PATH);
}

const uploadFile = async () => {
    console.log('Starting upload test...');

    // Use the dummy event we created
    const eventId = 'test-event-id';
    console.log('Using event ID:', eventId);

    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(TEST_FILE_PATH)], { type: 'image/jpeg' });
    formData.append('file', fileBlob, 'test-image.jpg');

    // Add metadata
    formData.append('id', `test-${Date.now()}`);
    formData.append('eventId', eventId);
    formData.append('type', 'image');
    formData.append('caption', 'Test upload');
    formData.append('uploadedAt', new Date().toISOString());
    formData.append('uploaderName', 'Test Script');
    formData.append('privacy', 'public');

    try {
        const response = await fetch(`${API_URL}/api/media`, {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        console.log('Response status:', response.status);
        console.log('Response body:', text);

        if (response.ok) {
            console.log('✅ Upload test passed!');
        } else {
            console.error('❌ Upload test failed!');
        }
    } catch (error) {
        console.error('❌ Network error:', error);
    }
};

uploadFile();
