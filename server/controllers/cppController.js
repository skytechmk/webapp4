import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load the C++ addon
let cppImageProcessor = null;
try {
    cppImageProcessor = require('../../cpp/build/Release/image_processor.node');
} catch (error) {
    console.warn('C++ image processor not available:', error.message);
}

// Get C++ module status
export const getCppStatus = async (req, res) => {
    try {
        if (!cppImageProcessor) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.status(503).json({
                status: 'unavailable',
                service: 'cpp',
                error: 'C++ image processor not loaded',
                timestamp: new Date().toISOString()
            });
        }

        // Create a processor instance to test functionality
        const processor = new cppImageProcessor.ImageProcessor();
        const metrics = processor.getMetrics();

        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.json({
            status: 'ok',
            service: 'cpp',
            avxSupported: metrics.avxSupported,
            avxUsed: metrics.avxUsed,
            totalProcessed: metrics.totalProcessed,
            averageTime: metrics.averageTime,
            operations: metrics.operations,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getCppStatus:', error);
        res.status(500).json({
            status: 'error',
            service: 'cpp',
            error: 'Failed to get C++ status',
            timestamp: new Date().toISOString()
        });
    }
};