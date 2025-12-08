import rustImageService from '../services/rustImageService.js';

// Get Rust modules status
export const getRustStatus = async (req, res) => {
    try {
        // Initialize if not already done
        await rustImageService.initialize();

        const status = {
            initialized: rustImageService.initialized,
            processorAvailable: rustImageService.rustProcessor !== null
        };

        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.json({
            status: 'ok',
            service: 'rust',
            ...status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getRustStatus:', error);
        res.status(500).json({
            status: 'error',
            service: 'rust',
            error: 'Failed to get Rust status',
            timestamp: new Date().toISOString()
        });
    }
};