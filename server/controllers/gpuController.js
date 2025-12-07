import gpuImageService from '../services/gpuImageService.js';

// Get GPU service status
export const getGpuStatus = async (req, res) => {
    try {
        await gpuImageService.initialize();
        const status = gpuImageService.getGpuStats();
        res.json({
            status: 'ok',
            service: 'gpu',
            ...status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in getGpuStatus:', error);
        res.status(500).json({
            status: 'error',
            service: 'gpu',
            error: 'Failed to get GPU status',
            timestamp: new Date().toISOString()
        });
    }
};